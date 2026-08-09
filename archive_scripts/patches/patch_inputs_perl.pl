use strict;
use warnings;

local $/;
open my $fh, '<', 'src/features/issues/TaskDetailModal.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/<input \s+type="number"\s+value=\{task\.storyPoints \|\| ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'storyPoints', parseInt\(e\.target\.value\) \|\| 0\)\}/<UncontrolledInput \n                        type="number"\n                        initialValue={task.storyPoints || ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'storyPoints', parseInt(val) || 0)}/g;

$content =~ s/<input \s+type="number"\s+min="0"\s+step="0\.5"\s+value=\{task\.estimatedHours \|\| ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'estimatedHours', parseFloat\(e\.target\.value\) \|\| 0\)\}/<UncontrolledInput \n                        type="number"\n                        min="0"\n                        step="0.5"\n                        initialValue={task.estimatedHours || ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'estimatedHours', parseFloat(val) || 0)}/g;

$content =~ s/<input \s+type="number"\s+min="0"\s+step="0\.5"\s+value=\{task\.loggedHours \|\| ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'loggedHours', parseFloat\(e\.target\.value\) \|\| 0\)\}/<UncontrolledInput \n                        type="number"\n                        min="0"\n                        step="0.5"\n                        initialValue={task.loggedHours || ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'loggedHours', parseFloat(val) || 0)}/g;

$content =~ s/<input \s+value=\{task\.labels\?\.join\(', '\) \|\| ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'labels', e\.target\.value\.split\(','\)\.map\(l => l\.trim\(\)\)\.filter\(Boolean\)\)\}/<UncontrolledInput \n                          initialValue={task.labels?.join(', ') || ''}\n                          onSave={(val: any) => updateTaskField(task.id, 'labels', val.split(',').map((l: any) => l.trim()).filter(Boolean))}/g;

$content =~ s/<input \s+type="date"\s+value=\{task\.startDate \? format\(ensureDate\(task\.startDate\), 'yyyy-MM-dd'\) : ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'startDate', e\.target\.value\)\}/<UncontrolledInput \n                        type="date"\n                        initialValue={task.startDate ? format(ensureDate(task.startDate), 'yyyy-MM-dd') : ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'startDate', val)}/g;

$content =~ s/<input \s+type="date"\s+value=\{task\.endDate \? format\(ensureDate\(task\.endDate\), 'yyyy-MM-dd'\) : ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'endDate', e\.target\.value\)\}/<UncontrolledInput \n                        type="date"\n                        initialValue={task.endDate ? format(ensureDate(task.endDate), 'yyyy-MM-dd') : ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'endDate', val)}/g;

$content =~ s/<input \s+type="date"\s+value=\{task\.dueDate \? format\(ensureDate\(task\.dueDate\), 'yyyy-MM-dd'\) : ''\}\s+onChange=\{\(e\) => updateTaskField\(task\.id, 'dueDate', e\.target\.value\)\}/<UncontrolledInput \n                        type="date"\n                        initialValue={task.dueDate ? format(ensureDate(task.dueDate), 'yyyy-MM-dd') : ''}\n                        onSave={(val: any) => updateTaskField(task.id, 'dueDate', val)}/g;

open $fh, '>', 'src/features/issues/TaskDetailModal.tsx' or die $!;
print $fh $content;
close $fh;
