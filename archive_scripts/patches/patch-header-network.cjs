const fs = require('fs');
let code = fs.readFileSync('src/components/HeaderNetworkStatus.tsx', 'utf8');

code = code.replace(/\\\$/g, '$');
code = code.replace(/\\`/g, '`');

fs.writeFileSync('src/components/HeaderNetworkStatus.tsx', code);
console.log("Patched HeaderNetworkStatus.tsx");
