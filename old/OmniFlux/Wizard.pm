package OmniFlux::Wizard;
use strict;
use warnings;
use utf8;
use OmniFlux::Config;

sub run {
    print "=== Welcome to OmniFlux ===\n";
    print "It looks like this is your first time running OmniFlux.\n\n";
    
    print "What AI model do you want to use?\n";
    print "1) gemini-3.5-flash (Recommended - Fast & Cost-Effective)\n2) gemini-3.5-pro (High Intelligence)\n3) claude-3-5-sonnet\n4) gpt-4o\n5) Custom\nChoose (1-5) [default: 1]: ";
    my $choice = <STDIN>; chomp($choice);
    $choice = $choice eq '' ? '1' : $choice;
    
    my $model = "gemini-3.5-flash";
    my $base_url = "https://generativelanguage.googleapis.com/v1beta/openai";
    
    if ($choice eq '2') {
        $model = "gemini-3.5-pro";
    }
    elsif ($choice eq '3') {
        $model = "claude-3-5-sonnet";
        $base_url = "https://api.anthropic.com/v1";
    }
    elsif ($choice eq '4') {
        $model = "gpt-4o";
        $base_url = "https://api.openai.com/v1";
    }
    elsif ($choice eq '5') {
        print "Enter custom model identifier: "; $model = <STDIN>; chomp($model);
        print "Enter custom Base URL: "; $base_url = <STDIN>; chomp($base_url);
    }
    
    print "\nSorry I have no API key defined, what is your API key?\nKey > ";
    my $api_key = <STDIN>; chomp($api_key);
    die "Error: API key required.\n" if $api_key eq '';
    
    my $config_data = {
        api_key     => $api_key,
        model       => $model,
        base_url    => $base_url,
        temperature => 0.2
    };
    
    OmniFlux::Config->save($config_data);
    print "\n[OmniFlux Setup]: Successfully configured!\n\n";
}

1;
