const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /\{\/\* Network Latency Monitor & Status Footer Bar \*\/\}\n\s*<div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-\[10px\] font-black uppercase tracking-wider text-slate-400 shrink-0 z-10 select-none">\n\s*\{effectiveRole === 'admin' && \(\n\s*<div className="flex items-center gap-4">/,
  `{/* Network Latency Monitor & Status Footer Bar */}
            {effectiveRole === 'admin' && (
            <div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 z-10 select-none">
              <div className="flex items-center gap-4">`
);

code = code.replace(
  /\s*<\/div>\n\s*\)\}\n\s*\{effectiveRole === 'admin' && \(\n\s*<div className="hidden sm:flex items-center gap-4">\n\s*<div className="flex items-center gap-1\.5">\n\s*<Globe className="w-3\.5 h-3\.5 text-slate-400" \/>\n\s*<span>Proyek: <strong className="text-slate-700">\{selectedProject\.key\}<\/strong><\/span>\n\s*<\/div>\n\s*<div className="h-3 w-px bg-slate-200" \/>\n\s*<span className="text-\[9px\] text-slate-400 font-bold">v1\.6 Live Ready<\/span>\n\s*<\/div>\n\s*\)\}\n\s*<\/div>\n\s*<\/React\.Fragment>/,
  `              </div>
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Proyek: <strong className="text-slate-700">{selectedProject.key}</strong></span>
                </div>
                <div className="h-3 w-px bg-slate-200" />
                <span className="text-[9px] text-slate-400 font-bold">v1.6 Live Ready</span>
              </div>
            </div>
            )}
          </React.Fragment>`
);

fs.writeFileSync('src/App.tsx', code);
