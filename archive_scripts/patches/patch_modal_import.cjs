const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { SingleLoginCollisionModal }')) {
  code = code.replace(
    'import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";',
    'import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";\nimport { SingleLoginCollisionModal } from "./components/SingleLoginCollisionModal";'
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with SingleLoginCollisionModal import");
