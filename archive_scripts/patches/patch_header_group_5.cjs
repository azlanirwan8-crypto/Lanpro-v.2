const fs = require('fs');
let code = fs.readFileSync('src/components/HeaderAvatarGroup.tsx', 'utf8');

code = code.replace(
  'onlineUsers.slice(0, 3).map(',
  'onlineUsers.slice(0, 5).map('
);

code = code.replace(
  'onlineUsers.length > 3 &&',
  'onlineUsers.length > 5 &&'
);

code = code.replace(
  '+{onlineUsers.length - 3}',
  '+{onlineUsers.length - 5}'
);

fs.writeFileSync('src/components/HeaderAvatarGroup.tsx', code);
console.log("Patched avatar count to 5.");
