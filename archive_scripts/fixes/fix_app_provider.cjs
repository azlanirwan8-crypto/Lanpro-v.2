const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const returnStart = '  return (\n    <div className="min-h-screen flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-200">';
const wrappedReturnStart = `  return (
  <PresenceProvider allUsers={allUsers} currentUser={currentUser} selectedProject={selectedProject}>
    <div className="min-h-screen flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-100 transition-colors duration-200">`;

code = code.replace(returnStart, wrappedReturnStart);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed provider wrap.");
