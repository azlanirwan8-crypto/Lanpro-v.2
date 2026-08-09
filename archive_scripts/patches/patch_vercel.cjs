const fs = require('fs');
let code = fs.readFileSync('vercel.json', 'utf8');

code = code.replace(
  '"value": "*"',
  '"value": "https://lanpro.vercel.app, https://ais-pre-rtfupl3iuxpisvz4rpxjvd-272931749989.asia-southeast1.run.app"'
);
fs.writeFileSync('vercel.json', code);
console.log("Vercel config updated.");
