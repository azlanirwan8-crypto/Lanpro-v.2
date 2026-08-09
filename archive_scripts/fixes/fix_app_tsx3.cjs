const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/setConfirmAction\(prev => prev \? \{ \.\.\.prev, isLoading: true \} : null\);/g, 'setConfirmAction(prev => prev ? { ...prev, isLoading: true } : prev);');
fs.writeFileSync('src/App.tsx', code);
