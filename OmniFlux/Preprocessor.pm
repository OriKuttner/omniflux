package OmniFlux::Preprocessor;

use strict;
use warnings;
use Exporter 'import';
use File::Basename;
use Cwd 'abs_path';

our @EXPORT = qw(strip_comments get_all_dependencies extract_function_names);

# Strip C-style block comments (/* ... */) and double-slash comments (//), preserving newlines
sub strip_comments {
    my ($content) = @_;
    return "" if !$content;
    
    my $stripped = "";
    my $len = length($content);
    my $i = 0;
    my $comment_depth = 0;
    
    while ($i < $len) {
        if ($comment_depth == 0) {
            # Check for block comment start
            if ($i + 1 < $len && substr($content, $i, 2) eq '/*') {
                $comment_depth = 1;
                $i += 2;
            }
            # Check for single-line comment //
            elsif ($i + 1 < $len && substr($content, $i, 2) eq '//') {
                $i += 2;
                while ($i < $len && substr($content, $i, 1) ne "\n") {
                    $i++;
                }
            }
            else {
                $stripped .= substr($content, $i, 1);
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
                }
                $i++;
            }
        }
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
    $content = strip_comments($content);
    
    my $dir = dirname($abs_file);
    while ($content =~ /\binclude\s+["']?([^"'\s;]+)["']?;?/g) {
        my $inc_file = $1;
        my $full_path = $inc_file;
        if ($full_path !~ m{^\/}) {
            $full_path = "$dir/$inc_file";
        }
        get_all_dependencies($full_path, $deps);
    }
}

# Scan file to extract function/task names
sub extract_function_names {
    my ($file) = @_;
    return () if ! -e $file;
    open(my $fh, '<:utf8', $file) or return ();
    my $content = do { local $/; <$fh> };
    close($fh);
    $content = strip_comments($content);
    
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
