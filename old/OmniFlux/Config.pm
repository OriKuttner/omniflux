package OmniFlux::Config;
use strict;
use warnings;
use utf8;
use JSON::PP;

my $config_path = "$ENV{HOME}/.omnifluxrc";
my $json_engine = JSON::PP->new->utf8;

# Check if config exists
sub exists {
    return -e $config_path;
}

# Read configuration
sub load {
    open(my $fh, '<:utf8', $config_path) or die "Could not open config at $config_path: $!\n";
    my $raw = do { local $/; <$fh> };
    close($fh);
    return $json_engine->decode($raw);
}

# Save configuration
sub save {
    my ($class, $data) = @_;
    open(my $fh, '>:utf8', $config_path) or die "Could not save config to $config_path: $!\n";
    print $fh $json_engine->pretty->encode($data);
    close($fh);
}

1; # Return true for module loading
