const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /(<div className="hidden sm:flex items-center gap-4">\s*<div className="flex items-center gap-1\.5">\s*<Globe className="w-3\.5 h-3\.5 text-slate-400" \/>\s*<span>Proyek: <strong className="text-slate-700">\{selectedProject\.key\}<\/strong><\/span>\s*<\/div>\s*<div className="h-3 w-px bg-slate-200" \/>\s*<span className="text-\[9px\] text-slate-400 font-bold">v1\.6 Live Ready<\/span>\s*<\/div>)/;

if (code.match(regex)) {
  code = code.replace(regex, `{effectiveRole === 'admin' && (\n              $1\n              )}`);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched correctly");
} else {
  console.log("Not found");
}
