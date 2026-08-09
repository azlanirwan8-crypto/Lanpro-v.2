use strict;
use warnings;

local $/;
open my $fh, '<', 'src/App.tsx' or die $!;
my $content = <$fh>;
close $fh;

$content =~ s/              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" \/>\n            <\/button>\n          <\/div>\n          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4"><\/div>/              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" \/>\n            <\/button>\n          <\/form>\n          <div className="pt-6 border-t border-slate-100 flex flex-col gap-4"><\/div>/s;

open $fh, '>', 'src/App.tsx' or die $!;
print $fh $content;
close $fh;
