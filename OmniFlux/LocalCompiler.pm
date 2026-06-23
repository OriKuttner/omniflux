package OmniFlux::LocalCompiler;

use strict;
use warnings;
use Exporter 'import';
use File::Basename;
use File::Path qw(make_path);
use Term::ANSIColor;
use Cwd 'abs_path';
use File::Spec;

our @EXPORT = qw(compile_locally);

sub compile_locally {
    my ($source_code, $src_file, $target_js, $strict, $ext_funcs_ref) = @_;
    
    # Pre-scan for all async tasks
    my %async_tasks = (
        db_query => 1,
        dbquery => 1,
        cache_set => 1,
        cacheset => 1,
        cache_get => 1,
        cacheget => 1,
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
    my @local_on_start_funcs;
    my @local_on_shutdown_funcs;
    my @local_on_error_funcs;
    my @local_on_request_funcs;
    my $on_start_count = 0;
    my $on_shutdown_count = 0;
    my $on_error_count = 0;
    my $on_request_count = 0;
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
        
        # Replace global variables (strip $ prefix so it maps to parent lexical scope)
        $line =~ s/\$([a-zA-Z_]\w*)/$1/g;
        
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
            my $resolved_path;
            my $src_dir = dirname($src_file);
            my $project_root = abs_path('.');
            
            # Search paths
            my @search_paths = (
                "$src_dir/$inc",
                "$project_root/$inc",
                "/usr/local/share/omniflux/$inc",
                "/usr/share/omniflux/$inc",
            );
            
            for my $p (@search_paths) {
                if (-e $p) {
                    $resolved_path = abs_path($p);
                    last;
                }
            }
            
            if ($resolved_path) {
                my $abs_target_dir = File::Spec->rel2abs(dirname($target_js));
                
                # Get relative path from project root (or absolute if outside project)
                my $dep_rel_path;
                if ($resolved_path =~ /^\Q$project_root\E\/(.+)$/) {
                    $dep_rel_path = $1;
                } else {
                    $dep_rel_path = $resolved_path;
                }
                
                # Determine local cache JS path
                my $dep_js_path = $dep_rel_path;
                $dep_js_path =~ s/\.[^.]+$/\.js/;
                $dep_js_path .= ".js" if $dep_js_path eq $dep_rel_path;
                
                my $dep_cache_js = "$project_root/.omniflux_cache/$dep_js_path";
                $dep_cache_js =~ s{/+}{/}g;
                
                # Compute relative require path from compiled file to cached dependency
                my $rel_require_path = File::Spec->abs2rel($dep_cache_js, $abs_target_dir);
                $rel_require_path = "./$rel_require_path" if $rel_require_path !~ m{^\.};
                
                $push_out->("require('$rel_require_path');", $orig_num);
            } else {
                my $inc_js = $inc;
                $inc_js =~ s/\.[^.]+$/\.js/;
                $inc_js = "./$inc_js" if $inc_js !~ m{^\.};
                $push_out->("require('$inc_js');", $orig_num);
            }
            next;
        }
        
        # Match define task with parameters (using 'with')
        if ($line =~ /^\s*define\s+task\s+(\w+)\s+with\s+([^\{]+)\s*\{/i) {
            my $name = $1;
            my $params_str = $2;
            $params_str =~ s/^\s+|\s+$//g;
            my @params = split(/\s*,\s*/, $params_str);
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
            $on_start_count++;
            my $func_name = "__on_start_$on_start_count";
            push @local_on_start_funcs, $func_name;
            $push_out->("async function $func_name() {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+shutdown\s*\{/i) {
            $on_shutdown_count++;
            my $func_name = "__on_shutdown_$on_shutdown_count";
            push @local_on_shutdown_funcs, $func_name;
            $push_out->("async function $func_name() {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+error\s*\((.*?)\)\s*\{/i) {
            $on_error_count++;
            my $func_name = "__on_error_$on_error_count";
            my $param = $1;
            push @local_on_error_funcs, { name => $func_name, param => $param };
            $push_out->("async function $func_name($param) {", $orig_num);
            push @block_stack, { type => 'normal' };
            next;
        }
        elsif ($line =~ /^\s*on\s+request\s*\((.*?)\)\s*\{/i) {
            $on_request_count++;
            my $func_name = "__on_request_$on_request_count";
            my $param = $1;
            push @local_on_request_funcs, { name => $func_name, param => $param };
            $push_out->("async function $func_name($param) {", $orig_num);
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
            
            # Register general request middleware here so it runs before any route handlers!
            $push_out->("app.use(async (req, res, next) => {", $orig_num);
            $push_out->("    try {", $orig_num);
            $push_out->("        const hooks = global.__on_request_hooks || [];", $orig_num);
            $push_out->("        for (const hook of hooks) {", $orig_num);
            $push_out->("            if (!res.headersSent) {", $orig_num);
            $push_out->("                await hook(req, res);", $orig_num);
            $push_out->("            }", $orig_num);
            $push_out->("        }", $orig_num);
            $push_out->("        if (!res.headersSent) {", $orig_num);
            $push_out->("            next();", $orig_num);
            $push_out->("        }", $orig_num);
            $push_out->("    } catch (e) {", $orig_num);
            $push_out->("        next(e);", $orig_num);
            $push_out->("    }", $orig_num);
            $push_out->("});", $orig_num);
            next;
        }
        
        # Match route handlers
        if ($line =~ /^\s*(GET|POST|PUT|DELETE)\s+["']([^"']+)["']\s*\((.*?)\)\s*\{/i) {
            my $method = lc($1);
            my $path = $2;
            my $params = $3;
            $push_out->("app.$method(\"$path\", async ($params) => {", $orig_num);
            push @block_stack, { type => 'route' };
            next;
        }
        
        # Match redirect statement
        if ($line =~ /^\s*redirect\s+to\s+["']?([^"'\s]+)["']?\s*(?:with\s+status\s+(\d+))?/i) {
            my $url = $1;
            my $status = $2;
            if ($status) {
                $push_out->("res.status($status).redirect('$url');", $orig_num);
            } else {
                $push_out->("res.redirect('$url');", $orig_num);
            }
            next;
        }
        
        # Match respond statement with status and multiple content types (json|html|text|file|template)
        if ($line =~ /^\s*respond\s+(?:with\s+)?status\s+(\S+)\s+and\s+(json|html|text|file|template)\b\s*(.*)/i) {
            my $status = $1;
            my $type = lc($2);
            my $content = $3;
            if ($type eq 'json') {
                $push_out->("res.status($status).json($content);", $orig_num);
            } elsif ($type eq 'file') {
                $push_out->("res.status($status).sendFile($content);", $orig_num);
            } elsif ($type eq 'template') {
                my $tpl_call = ($content =~ /^\s*\(/) ? "template$content" : "template($content)";
                $push_out->("res.status($status).send($tpl_call);", $orig_num);
            } else { # html or text
                $push_out->("res.status($status).send($content);", $orig_num);
            }
            next;
        }
        
        # Match respond statement without status (default status 200 or direct response)
        if ($line =~ /^\s*respond\s+(?:with\s+)?(json|html|text|file|template)\b\s*(.*)/i) {
            my $type = lc($1);
            my $content = $2;
            if ($type eq 'json') {
                $push_out->("res.json($content);", $orig_num);
            } elsif ($type eq 'file') {
                $push_out->("res.sendFile($content);", $orig_num);
            } elsif ($type eq 'template') {
                my $tpl_call = ($content =~ /^\s*\(/) ? "template$content" : "template($content)";
                $push_out->("res.send($tpl_call);", $orig_num);
            } else { # html or text
                $push_out->("res.send($content);", $orig_num);
            }
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
            elsif ($block && $block->{type} eq 'route') {
                $line =~ s/\}/\});/;
            }
        }
        
        $push_out->($line, $orig_num);
    }
    
    # Append global task exports
    for my $task (@tasks) {
        $push_out->("global.$task = $task;", 0);
    }
    
    # Register local on_start functions to global registry
    if (@local_on_start_funcs) {
        $push_out->("global.__on_start_hooks = global.__on_start_hooks || [];", 0);
        for my $f (@local_on_start_funcs) {
            $push_out->("global.__on_start_hooks.push($f);", 0);
        }
    }
    
    # Register local on_shutdown functions to global registry
    if (@local_on_shutdown_funcs) {
        $push_out->("global.__on_shutdown_hooks = global.__on_shutdown_hooks || [];", 0);
        for my $f (@local_on_shutdown_funcs) {
            $push_out->("global.__on_shutdown_hooks.push($f);", 0);
        }
    }
    
    # Register local on_error functions to global registry
    if (@local_on_error_funcs) {
        $push_out->("global.__on_error_hooks = global.__on_error_hooks || [];", 0);
        for my $h (@local_on_error_funcs) {
            my $f = $h->{name};
            $push_out->("global.__on_error_hooks.push($f);", 0);
        }
    }
    
    # Register local on_request functions to global registry
    if (@local_on_request_funcs) {
        $push_out->("global.__on_request_hooks = global.__on_request_hooks || [];", 0);
        for my $h (@local_on_request_funcs) {
            my $f = $h->{name};
            $push_out->("global.__on_request_hooks.push($f);", 0);
        }
    }

    # Register global process shutdown listeners (if any exist in this bundle)
    if (@local_on_shutdown_funcs) {
        my $sd_hooks = <<'EOF';
if (!global.__on_shutdown_registered) {
    global.__on_shutdown_registered = true;
    const __shutdown_wrapper = async () => {
        try {
            const hooks = global.__on_shutdown_hooks || [];
            for (const hook of hooks) {
                await hook();
            }
        } catch(e) {}
        process.exit(0);
    };
    process.on('SIGTERM', __shutdown_wrapper);
    process.on('SIGINT', __shutdown_wrapper);
}
EOF
        for my $l (split(/\n/, $sd_hooks)) {
            $push_out->($l, 0);
        }
    }

    # Register global process error listeners (if any exist in this bundle)
    if (@local_on_error_funcs) {
        my $err_hooks = <<'EOF';
if (!global.__on_error_registered) {
    global.__on_error_registered = true;
    process.on('uncaughtException', (err) => {
        const hooks = global.__on_error_hooks || [];
        for (const hook of hooks) {
            hook(err).catch(() => {});
        }
    });
    process.on('unhandledRejection', (reason) => {
        const hooks = global.__on_error_hooks || [];
        for (const hook of hooks) {
            hook(reason).catch(() => {});
        }
    });
}
EOF
        for my $l (split(/\n/, $err_hooks)) {
            $push_out->($l, 0);
        }
    }
    
    
    # Start server
    if ($has_server && $server_port) {
        $push_out->("app.listen($server_port, () => console.log('Server started on port ' + $server_port));", 0);
    }
    
    # Run all accumulated start hooks at the entry module
    my $start_runner = <<'EOF';
if (require.main === module) {
    (async () => {
        const hooks = global.__on_start_hooks || [];
        for (const hook of hooks) {
            await hook();
        }
    })().catch(console.error);
}
EOF
    for my $l (split(/\n/, $start_runner)) {
        $push_out->($l, 0);
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
