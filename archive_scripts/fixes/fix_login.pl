use strict;
use warnings;

local $/;
open my $fh, '<', 'src/App.tsx' or die $!;
my $content = <$fh>;
close $fh;

# Restore RegisterScreen
$content =~ s/<form className="space-y-4" onSubmit=\{\(e\) => \{ e\.preventDefault\(\); onLogin\(username, password, rememberMe\); \}\}>/<div className="space-y-4">/s;
$content =~ s/            <button\n              type="submit"\n              className="w-full bg-indigo-600/            <button\n              onClick={() => onRegister(username, password, name, email)}\n              className="w-full bg-indigo-600/s;
$content =~ s/          <\/form>\n          <p className="text-center/          <\/div>\n          <p className="text-center/s;

# Now specifically for LoginScreen
$content =~ s/          <div className="space-y-4">\n            <div className="space-y-1">\n              <label className="text-\[10px\] font-black text-slate-400 uppercase tracking-\[0\.2em\] ml-1">\n                USERNAME/          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(username, password, rememberMe); }}>\n            <div className="space-y-1">\n              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">\n                USERNAME/s;

$content =~ s/            <button\n              onClick=\{\(\) => onLogin\(username, password, rememberMe\)\}\n              className="w-full bg-slate-900 text-white/            <button\n              type="submit"\n              className="w-full bg-slate-900 text-white/s;

$content =~ s/          <\/div>\n          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4"><\/div>/          <\/form>\n          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4"><\/div>/s;

open $fh, '>', 'src/App.tsx' or die $!;
print $fh $content;
close $fh;
