package OmniFlux::LocalCompiler;

use strict;
use warnings;
use Exporter 'import';
use File::Basename;
use File::Path qw(make_path);
use Term::ANSIColor;

our @EXPORT = qw(compile_locally);

sub compile_locally {
    my ($source_code, $src_file, $target_js, $strict, $ext_funcs_ref) = @_;
    
    # Pre-scan for all async tasks
    my %async_tasks = (
        db_query => 1,
        cache_set => 1,
        cache_get => 1,
    );
    if ($ext_funcs_ref) {
        for my $f (@$ext_funcs_ref) {
            $async_tasks{$f} = 1;
        }
    }
    for my $line (split(/\n/, $source_code)) {
        my $clean_line = $line;
        # Strip comments
        $clean_line =~ s/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|#(.*)/$1 ? $1 : ""/ge;
        if ($clean_line =~ /\bdefine\s+task\s+(\w+)/i || $clean_line =~ /\bfn\s+(\w+)/i) {
            $async_tasks{$1} = 1;
        }
    }
    
    my @lines = split(/\n/, $source_code);
    my @output_lines;
    my @line_map;
    
    # State tracking
    my @block_stack;
    my @tasks;
    my $has_on_start = 0;
    my $has_on_shutdown = 0;
    my $has_on_error = 0;
    my $has_on_request = 0;
    my $has_server = 0;
    my $server_port = 0;
    
    my $push_out = sub {
        my ($out_line, $orig_num) = @_;
        push @output_lines, $out_line;
        push @line_map, $orig_num;
    };
    
    # Read and inject the runtime JavaScript library
    my $runtime_path = dirname(__FILE__) . '/runtime.js';
    my $runtime_content = "";
    if (open(my $rfh, '<:utf8', $runtime_path)) {
        $runtime_content = do { local $/; <$rfh> };
        close($rfh);
    } else {
        die "Error: Could not read OmniFlux runtime library at $runtime_path\n";
    }
    
    for my $l (split(/\n/, $runtime_content)) {
        $push_out->($l, 0);
    }
    $push_out->("", 0);
    
    for (my $line_idx = 0; $line_idx < @lines; $line_idx++) {
        my $line = $lines[$line_idx];
        my $orig_line = $line;
        my $orig_num = $line_idx + 1;
        
        # Convert # comments to // comments so they are valid JS
        $line =~ s/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|#(.*)/$1 ? $1 : "\/\/$2"/ge;
        
        # Replace global variables
        $line =~ s/\$([a-zA-Z_]\w*)/global.\$$1/g;
        
        # print and printf are handled via injected helper functions when needed
        
        # Handle 'background' keyword to make task call non-blocking
        $line =~ s/\bbackground\s+(\w+)\b/NONBLOCKING_$1/gi;
        
        # Replace await modifiers for async tasks (native, local, and external)
        for my $task (keys %async_tasks) {
            $line =~ s/\b(?<!await\s)(?<!NONBLOCKING_)(?<!task\s)(?<!fn\s)(?<!global\.)$task\b/await $task/g;
        }
        
        # Clean up NONBLOCKING_ prefix
        $line =~ s/NONBLOCKING_//g;
        
        # Replace type casting
        $line =~ s/\b(.*?)\s+as\s+int\b/parseInt($1, 10)/g;
        $line =~ s/\b(.*?)\s+as\s+string\b/String($1)/g;
        
        # Replace var with let
        $line =~ s/\bvar\b/let/g;
        
        # Match includes
        if ($line =~ /^\s*include\s+["']?([^"'\s;]+)["']?;?/i) {
            my $inc = $1;
            $inc =~ s/\.[^.]+$/\.js/;
            $inc = "./$inc" if $inc !~ m{^\.};
            $push_out->("require('$inc');", $orig_num);
            next;
        }
        
        # Match define task with parameters (using 'with')
        if ($line =~ /^\s*define\s+task\s+(\w+)\s+with\s+([\w\s,]+)\s*\{/i) {
            my $name = $1;
            my $params_str = $2;
            my @params = split(/\s*,\s*|\s+/, $params_str);
            my $params_joined = join(', ', @params);
            push @tasks, $name;
            $push_out->("async function $name($params_joined) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        # Match standard or parameterless define task (using parentheses or no parameters)
        elsif ($line =~ /^\s*define\s+task\s+(\w+)\s*(?:\((.*?)\))?\s*\{/i) {
            my $name = $1;
            my $params = $2 || "";
            push @tasks, $name;
            $push_out->("async function $name($params) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        
        # Match lifecycle hooks
        if ($line =~ /^\s*on\s+start\s*\{/i) {
            $has_on_start = 1;
            $push_out->("async function __on_start() {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+shutdown\s*\{/i) {
            $has_on_shutdown = 1;
            $push_out->("async function __on_shutdown() {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+error\s*\((.*?)\)\s*\{/i) {
            $has_on_error = 1;
            $push_out->("async function __on_error($1) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+request\s*\((.*?)\)\s*\{/i) {
            $has_on_request = 1;
            $push_out->("async function __on_request($1) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        
        # Match every block
        if ($line =~ /^\s*every\s+(\d+|\$?\w+)\s+(second|seconds|minute|minutes|hour|hours)\s*\{/i) {
            my $val = $1;
            my $unit = $2;
            my $mult = 1000;
            $mult = 60000 if $unit =~ /min/i;
            $mult = 3600000 if $unit =~ /hour/i;
            my $ms = ($val =~ /^\d+$/) ? ($val * $mult) : "($val) * $mult";
            $push_out->("setInterval(async () => {", $orig_num);
            push @block_stack, { type => 'every', ms => $ms };
            next;
        }
        
        # Match wait statement
        if ($line =~ /^\s*wait\s+(\d+|\$?\w+)\s+(second|seconds|minute|minutes|hour|hours)\b/i) {
            my $val = $1;
            my $unit = $2;
            my $mult = 1000;
            $mult = 60000 if $unit =~ /min/i;
            $mult = 3600000 if $unit =~ /hour/i;
            my $ms = ($val =~ /^\d+$/) ? ($val * $mult) : "($val) * $mult";
            $push_out->("await new Promise(resolve => setTimeout(resolve, $ms));", $orig_num);
            next;
        }
        
        # Match server listen
        if ($line =~ /^\s*listen\s+on\s+port\s+(.*)/i) {
            $has_server = 1;
            $server_port = $1;
            $push_out->("const express = require('express');", $orig_num);
            $push_out->("const app = express();", $orig_num);
            $push_out->("app.use(express.json());", $orig_num);
            $push_out->("app.use(express.urlencoded({ extended: true }));", $orig_num);
            next;
        }
        
        # Match route handlers
        if ($line =~ /^\s*(GET|POST|PUT|DELETE)\s+["']([^"']+)["']\s*\((.*?)\)\s*\{/i) {
            my $method = lc($1);
            my $path = $2;
            my $params = $3;
            $push_out->("app.$method(\"$path\", async ($params) => {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        
        # Match respond statement
        if ($line =~ /^\s*respond\s+with\s+status\s+(\S+)\s+and\s+json\s+(.*)/i) {
            $push_out->("res.status($1).json($2);", $orig_num);
            next;
        }
        
        # Match loops and conditionals
        if ($line =~ /^\s*for\s+(\w+)\s+of\s+(\w+)\s*\{/i) {
            $push_out->("for (let $1 of $2) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*while\s+(.*?)\s*\{/i) {
            my $cond = $1;
            $cond = "($cond)" if $cond !~ /^\(.*\)$/;
            $push_out->("while $cond {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*if\s+(.*?)\s*\{/i) {
            my $cond = $1;
            $cond = "($cond)" if $cond !~ /^\(.*\)$/;
            $push_out->("if $cond {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*else\s+if\s+(.*?)\s*\{/i) {
            my $cond = $1;
            $cond = "($cond)" if $cond !~ /^\(.*\)$/;
            $push_out->("else if $cond {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        
        # Handle block openings and closings
        if ($line =~ /\{/ && $line !~ /\}/) {
            push @block_stack, { type => 'normal' };
        }
        
        if ($line =~ /\}/ && $line !~ /\{/) {
            my $block = pop @block_stack;
            if ($block && $block->{type} eq 'every') {
                $line =~ s/\}/\}, $block->{ms}\)/;
            }
        }
        
        $push_out->($line, $orig_num);
    }
    
    # Append global task exports
    for my $task (@tasks) {
        $push_out->("global.$task = $task;", 0);
    }
    
    # Register global middleware if needed
    if ($has_server && $has_on_request) {
        my $mw = <<'EOF';
app.use(async (req, res, next) => {
    try {
        await __on_request(req, res);
        if (!res.headersSent) {
            next();
        }
    } catch (e) {
        next(e);
    }
});
EOF
        for my $l (split(/\n/, $mw)) {
            $push_out->($l, 0);
        }
    }
    
    # Register error hooks
    if ($has_on_error) {
        my $err_hooks = <<'EOF';
process.on('uncaughtException', (err) => {
    __on_error(err).catch(() => {});
});
process.on('unhandledRejection', (reason) => {
    __on_error(reason).catch(() => {});
});
EOF
        for my $l (split(/\n/, $err_hooks)) {
            $push_out->($l, 0);
        }
    }
    
    # Register shutdown hooks
    if ($has_on_shutdown) {
        my $sd_hooks = <<'EOF';
const __shutdown_wrapper = async () => {
    try {
        await __on_shutdown();
    } catch(e) {}
    process.exit(0);
};
process.on('SIGTERM', __shutdown_wrapper);
process.on('SIGINT', __shutdown_wrapper);
EOF
        for my $l (split(/\n/, $sd_hooks)) {
            $push_out->($l, 0);
        }
    }
    
    # Start server
    if ($has_server && $server_port) {
        $push_out->("app.listen($server_port, () => console.log('Server started on port ' + $server_port));", 0);
    }
    
    # Run on start hook
    if ($has_on_start) {
        $push_out->("__on_start().catch(console.error);", 0);
    }
    
    # Join output
    my $compiled_js = join("\n", @output_lines);
    
    # Write to target path temporarily to check syntax
    make_path(dirname($target_js));
    open(my $out_fh, '>:utf8', $target_js) or return undef;
    print $out_fh $compiled_js;
    close($out_fh);
    
    # Run node --check and capture errors
    my $temp_err = "$target_js.err";
    my $check_cmd = "node --check \"$target_js\" 2>\"$temp_err\"";
    my $res = system($check_cmd);
    
    if ($res == 0) {
        unlink($temp_err) if -e $temp_err;
        return 1; # Successful compilation!
    } else {
        # Process and format the syntax error beautifully for strict/local display
        my $err_content = "";
        if (open(my $efh, '<:utf8', $temp_err)) {
            $err_content = do { local $/; <$efh> };
            close($efh);
            unlink($temp_err);
        }
        
        my $js_line = 0;
        if ($err_content =~ /\.js:(\d+)/ || $err_content =~ /:(\d+)\r?\n/) {
            $js_line = $1;
        }
        
        my $error_msg = "SyntaxError: Unexpected syntax";
        if ($err_content =~ /(SyntaxError: .*?)(?:\r?\n|$)/) {
            $error_msg = $1;
        }
        
        my $orig_line = 0;
        if ($js_line > 0 && $js_line <= scalar(@line_map)) {
            $orig_line = $line_map[$js_line - 1];
        }
        
        my @err_lines = split(/\n/, $err_content);
        my $code_line = "";
        my $caret_line = "";
        for (my $i = 0; $i < @err_lines; $i++) {
            if ($err_lines[$i] =~ /\.js:\d+/ || $err_lines[$i] =~ /:\d+\r?\n/) {
                $code_line = $err_lines[$i+1] if $i+1 < @err_lines;
                $caret_line = $err_lines[$i+2] if $i+2 < @err_lines;
                last;
            }
        }
        
        if ($strict) {
            print "\n";
            print color('bold red') . "Compilation Error in " . basename($src_file) . " on line $orig_line:\n" . color('reset');
            print "$code_line\n" if $code_line;
            print "$caret_line\n" if $caret_line;
            print color('bold yellow') . "$error_msg\n" . color('reset');
            print "\n";
        }
        
        unlink($target_js); # Delete invalid file
        return undef; # Failed compilation
    }
}

1;
