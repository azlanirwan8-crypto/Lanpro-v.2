const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import { LiveChatWidget } from "./components/LiveChatWidget";',
  'import { LiveChatWidget } from "./components/LiveChatWidget";\nimport { PresenceProvider } from "./contexts/PresenceContext";\nimport { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";'
);

// 2. Wrap the main app inside PresenceProvider.
// Wait, we can wrap it right before <AuthToastContainer /> or around the main return block.
// The main return block starts with `<div className={`flex h-screen w-full`}`
const returnStart = 'return (\n    <div className={`flex h-screen w-full bg-slate-50 text-slate-900 font-sans ${theme === \'dark\' ? \'dark bg-slate-900 text-slate-100\' : \'\'} ${isFullscreen ? \'fixed inset-0 z-50\' : \'\'}`}>';
const wrappedReturnStart = `return (
  <PresenceProvider allUsers={allUsers} currentUser={currentUser} selectedProject={selectedProject}>
    <div className={\`flex h-screen w-full bg-slate-50 text-slate-900 font-sans \${theme === 'dark' ? 'dark bg-slate-900 text-slate-100' : ''} \${isFullscreen ? 'fixed inset-0 z-50' : ''}\`}>`;

code = code.replace(returnStart, wrappedReturnStart);

// 3. Find the end of the return block to close the provider
const returnEnd = `    </div>\n  );\n}\n\nexport default App;`;
const wrappedReturnEnd = `    </div>\n  </PresenceProvider>\n  );\n}\n\nexport default App;`;
code = code.replace(returnEnd, wrappedReturnEnd);

// 4. Replace the old Avatar Stack with <HeaderAvatarGroup />
const oldAvatarStart = `{/* Global Avatar Stack Singularity: Seluruh pengguna disatukan dengan indikator online via Socket.io / API */}`;
const oldAvatarRegex = /\{\/\* Global Avatar Stack Singularity[\s\S]*?<\/div>[\s\S]*?\} \(\)\)}[\s\S]*?<\/div>/;

code = code.replace(oldAvatarRegex, `<HeaderAvatarGroup allUsers={allUsers} currentUserUid={currentUser?.uid || currentUser?.id} />`);

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx presence patched.");
