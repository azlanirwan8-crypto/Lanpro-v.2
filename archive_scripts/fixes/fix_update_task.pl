use strict;
use warnings;

local $/;
open my $fh, '<', 'src/App.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/my \$previousTasks = tasks;\s+\$1setTasks/const previousTasks = tasks;\n      \/\/ Optimistic UI update\n      setTasks/s;

open $fh, '>', 'src/App.tsx' or die $!;
print $fh $content;
close $fh;
