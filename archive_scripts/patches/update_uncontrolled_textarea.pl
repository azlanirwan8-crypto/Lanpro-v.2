use strict;
use warnings;

local $/;
open my $fh, '<', 'src/features/issues/TaskDetailModal.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/onBlur=\{\(\) => \{\s+if \(val !== initialValue\) onSave\(val\);\s+else onCancel\(\);\s+\}\}/onKeyDown={(e) => {\n        if (e.key === 'Escape') onCancel();\n        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {\n          e.preventDefault();\n          if (val !== initialValue) onSave(val);\n          else onCancel();\n        }\n      }}\n      onBlur={() => {\n        if (val !== initialValue) onSave(val);\n        else onCancel();\n      }}/s;

open $fh, '>', 'src/features/issues/TaskDetailModal.tsx' or die $!;
print $fh $content;
close $fh;
