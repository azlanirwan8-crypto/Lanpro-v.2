const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Navbar area (Density, Cache/Sync, Keyboard)
const navRegex = /(<div className="flex items-center gap-1 bg-slate-100 p-0\.5 rounded-xl border border-slate-200\/60 select-none mr-2">[\s\S]*?<\/button>\s*<\/div>\s*\{\/\* Cache & Sync Status Button \*\/\}[\s\S]*?<\/button>\s*\{\/\* Keyboard Shortcuts Button \*\/\}[\s\S]*?<\/button>)/;
if (code.match(navRegex)) {
  code = code.replace(navRegex, `{effectiveRole === 'admin' && (\n                  <>\n$1\n                  </>\n                )}`);
  console.log("Patched Nav icons");
} else {
  console.log("Failed to patch Nav icons");
}

// 2. Footer Ping & Realtime
const footerRegex = /(<div className="flex items-center gap-4">\s*<div\s*onClick=\{checkLatency\}[\s\S]*?<\/div>\s*<\/div>)/;
if (code.match(footerRegex)) {
  code = code.replace(footerRegex, `{effectiveRole === 'admin' && (\n              $1\n              )}`);
  console.log("Patched Footer ping");
} else {
  console.log("Failed to patch Footer ping");
}

fs.writeFileSync('src/App.tsx', code);
