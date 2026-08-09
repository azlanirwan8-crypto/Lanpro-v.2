use strict;
use warnings;

local $/;
open my $fh, '<', 'src/components/DescriptionEditor.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/onKeyDown=\{\(e\) => \{\s+if \(e\.key === 'Escape'\) onCancel\(\);\s+\}\}/onKeyDown={(e) => {\n            if (e.key === 'Escape') onCancel();\n            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {\n                e.preventDefault();\n                onSave(localDescription);\n            }\n        }}/s;

$content =~ s/<span>Markdown fully supported. Blur or Escape to save.<\/span>/<span>Markdown fully supported. Press Ctrl+Enter to save, or Escape to cancel.<\/span>/s;

open $fh, '>', 'src/components/DescriptionEditor.tsx' or die $!;
print $fh $content;
close $fh;
