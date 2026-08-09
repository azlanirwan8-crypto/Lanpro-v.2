const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { username, password, force }
      });`,
  `const endpoint = force ? '/api/auth/force-logout' : '/api/auth/login';
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: { username, password, force }
      });`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx to use /api/auth/force-logout");
