use strict;
use warnings;

local $/;
open my $fh, '<', 'src/features/issues/TaskDetailModal.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/onBlur=\{\(\) => \{/onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}\n      onBlur={() => {/s;

open $fh, '>', 'src/features/issues/TaskDetailModal.tsx' or die $!;
print $fh $content;
close $fh;
