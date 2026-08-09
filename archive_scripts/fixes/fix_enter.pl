use strict;
use warnings;

local $/;
open my $fh, '<', 'src/components/ui/CommonComponents.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/onBlur=\{\(\) => \{/onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}\n      onBlur={() => {/s;

open $fh, '>', 'src/components/ui/CommonComponents.tsx' or die $!;
print $fh $content;
close $fh;
