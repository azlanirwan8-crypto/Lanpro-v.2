use strict;
use warnings;

local $/;
open my $fh, '<', 'src/App.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/<div className="space-y-4">/<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(username, password, rememberMe); }}>/s;

$content =~ s/            <button\n              onClick=\{\(\) => onLogin\(username, password, rememberMe\)\}\n              className="w-full/            <button\n              type="submit"\n              className="w-full/s;

$content =~ s/          <\/div>\n          <div className="pt-6/          <\/form>\n          <div className="pt-6/s;

open $fh, '>', 'src/App.tsx' or die $!;
print $fh $content;
close $fh;
