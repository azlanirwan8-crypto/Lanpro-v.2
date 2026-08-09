const fs = require('fs');
let code = fs.readFileSync('src/components/HeaderAvatarGroup.tsx', 'utf8');

code = code.replace(
  'onlineUsers.slice(0, 4).map(',
  'onlineUsers.slice(0, 3).map('
);

code = code.replace(
  'onlineUsers.length > 4 &&',
  'onlineUsers.length > 3 &&'
);

code = code.replace(
  '+{onlineUsers.length - 4}',
  '+{onlineUsers.length - 3}'
);

fs.writeFileSync('src/components/HeaderAvatarGroup.tsx', code);
console.log("Patched avatar count.");
