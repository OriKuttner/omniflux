package OmniFlux::Preprocessor;

use strict;
use warnings;
use Exporter 'import';
use File::Basename;
use Cwd 'abs_path';
use Term::ANSIColor;

our @EXPORT = qw(strip_comments get_all_dependencies extract_function_names);

# Strip C-style block comments (/* ... */) and double-slash comments (//), preserving newlines
sub strip_comments {
    my ($content, $file_path) = @_;
    return "" if !$content;
    
    my $stripped = "";
    my $len = length($content);
    my $i = 0;
    my $comment_depth = 0;
    my $comment_start_line = 1;
    
    # Track line numbers to report comment start line
    my $current_line = 1;
    
    while ($i < $len) {
        if ($comment_depth == 0) {
            # Check for block comment start
            if ($i + 1 < $len && substr($content, $i, 2) eq '/*') {
                $comment_depth = 1;
                $comment_start_line = $current_line;
                $i += 2;
            }
            # Check for single-line comment //
            elsif ($i + 1 < $len && substr($content, $i, 2) eq '//') {
                $i += 2;
                while ($i < $len && substr($content, $i, 1) ne "\n") {
                    $i++;
                }
            }
            # Check for single-line comment #
            elsif (substr($content, $i, 1) eq '#') {
                $i++;
                while ($i < $len && substr($content, $i, 1) ne "\n") {
                    $i++;
                }
            }
            else {
                my $c = substr($content, $i, 1);
                $stripped .= $c;
                if ($c eq "\n") {
                    $current_line++;
                }
                $i++;
            }
        }
        else {
            # Inside block comment
            if ($i + 1 < $len && substr($content, $i, 2) eq '/*') {
                $comment_depth++;
                $i += 2;
            }
            elsif ($i + 1 < $len && substr($content, $i, 2) eq '*/') {
                $comment_depth--;
                $i += 2;
            }
            else {
                # Preserve newlines to keep line numbers in sync
                if (substr($content, $i, 1) eq "\n") {
                    $stripped .= "\n";
                    $current_line++;
                }
                $i++;
            }
        }
    }
    
    if ($comment_depth > 0) {
        my $fn = $file_path ? basename($file_path) : "file";
        print "\n";
        print color('bold red') . "Compilation Error in $fn:\n" . color('reset');
        print color('bold yellow') . "SyntaxError: Unclosed multiline comment opened on line $comment_start_line\n" . color('reset');
        print "\n";
        die "Compilation failed\n";
    }
    
    return $stripped;
}

# Scan file recursively for include directives
sub get_all_dependencies {
    my ($file_path, $deps) = @_;
    
    my $abs_file = abs_path($file_path);
    return if !$abs_file || ! -e $abs_file;
    return if $deps->{$abs_file};
    $deps->{$abs_file} = 1;
    
    open(my $fh, '<:utf8', $abs_file) or return;
    my $content = do { local $/; <$fh> };
    close($fh);
    $content = strip_comments($content, $abs_file);
    
    my $dir = dirname($abs_file);
    my $project_root = abs_path('.');
    
    while ($content =~ /\binclude\s+["']?([^"'\s;]+)["']?;?/g) {
        my $inc_file = $1;
        my $full_path;
        
        # Search paths
        my @search_paths = (
            "$dir/$inc_file",
            "$project_root/$inc_file",
            "/usr/local/share/omniflux/$inc_file",
            "/usr/share/omniflux/$inc_file",
        );
        
        for my $p (@search_paths) {
            if (-e $p) {
                $full_path = abs_path($p);
                last;
            }
        }
        
        if ($full_path) {
            get_all_dependencies($full_path, $deps);
        } else {
            get_all_dependencies("$dir/$inc_file", $deps);
        }
    }
}

# Scan file to extract function/task names
sub extract_function_names {
    my ($file) = @_;
    return () if ! -e $file;
    open(my $fh, '<:utf8', $file) or return ();
    my $content = do { local $/; <$fh> };
    close($fh);
    $content = strip_comments($content, $file);
    
    my %seen;
    my @funcs;
    while ($content =~ /\bfn\s+(\w+)/g) {
        push @funcs, $1 if !$seen{$1}++;
    }
    while ($content =~ /\bdefine\s+task\s+(\w+)/g) {
        push @funcs, $1 if !$seen{$1}++;
    }
    return @funcs;
}

1;
