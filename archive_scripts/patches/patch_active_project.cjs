const fs = require('fs');
let code = fs.readFileSync('src/features/dashboard/index.tsx', 'utf8');

const regex = /(<div className=\{styles\.headerSubtitleWrapper\}\>[\s\S]*?<\/div>)/;

if (code.match(regex)) {
  code = code.replace(regex, `{userRole === 'admin' && (\n              $1\n            )}`);
  fs.writeFileSync('src/features/dashboard/index.tsx', code);
  console.log("Patched Active Project subtitle");
} else {
  console.log("Not found");
}
