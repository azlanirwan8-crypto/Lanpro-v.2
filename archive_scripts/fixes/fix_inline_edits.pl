use strict;
use warnings;

local $/;
open my $fh, '<', 'src/features/issues/index.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/<input \s+type="number"\s+disabled=\{!isEditable\}\s+value=\{task\.storyPoints \|\| ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'storyPoints', e\.target\.value \? Number\(e\.target\.value\) : null\)\}/<UncontrolledInput \n                    type="number"\n                    disabled={!isEditable}\n                    initialValue={task.storyPoints || ''}\n                    onSave={(val: any) => updateTaskField(task.id, 'storyPoints', val ? Number(val) : null)}/g;

$content =~ s/<input \s+type="date"\s+disabled=\{!isEditable\}\s+value=\{dateVal \? format\(ensureDate\(dateVal\), 'yyyy-MM-dd'\) : ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, col\.id, e\.target\.value\)\}/<UncontrolledInput \n                    type="date"\n                    disabled={!isEditable}\n                    initialValue={dateVal ? format(ensureDate(dateVal), 'yyyy-MM-dd') : ''}\n                    onSave={(val: any) => updateTaskField(task.id, col.id, val)}/g;

open $fh, '>', 'src/features/issues/index.tsx' or die $!;
print $fh $content;
close $fh;
