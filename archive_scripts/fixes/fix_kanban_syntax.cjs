const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/index.tsx', 'utf8');

code = code.replace(
  /        \)\}\n             <\/div>\n          <\/div>\n        \)\}\n      <\/div>/,
  '        )}\n      </div>'
);

fs.writeFileSync('src/features/Kanban/index.tsx', code);
console.log("Syntax fixed");
