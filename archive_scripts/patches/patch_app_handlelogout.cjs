const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `const handleLogout = async (silent = false) => {
    const wasLoggedIn = isLoggedIn || !!currentUser || !!localStorage.getItem("lanpro_jwt_token");
    const activeUserId = currentUser?.id || currentUser?.uid;

    if (activeUserId) {
      try {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          body: { userId: activeUserId }
        });
      } catch (e) {
        console.error("Logout api error", e);
      }
    }`;

code = code.replace(
  /const handleLogout = async \(silent = false\) => \{[\s\S]*?const wasLoggedIn = isLoggedIn \|\| !!currentUser \|\| !!localStorage\.getItem\("lanpro_jwt_token"\);/,
  replacement
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx handleLogout API call");
