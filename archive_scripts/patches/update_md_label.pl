use strict;
use warnings;

local $/;
open my $fh, '<', 'src/features/issues/TaskDetailModal.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/<span>Markdown fully supported<\/span>/<span>Markdown fully supported. Press Ctrl+Enter to save, or Escape to cancel.<\/span>/s;

open $fh, '>', 'src/features/issues/TaskDetailModal.tsx' or die $!;
print $fh $content;
close $fh;
