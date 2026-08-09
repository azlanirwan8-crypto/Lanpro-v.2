const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('ApiError')) {
  code = code.replace(
    'import { apiRequest } from "./lib/api";',
    'import { apiRequest, ApiError } from "./lib/api";\nimport { SingleLoginCollisionModal } from "./components/SingleLoginCollisionModal";'
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with ApiError import");
