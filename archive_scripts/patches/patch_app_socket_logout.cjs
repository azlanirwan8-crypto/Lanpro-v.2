const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const forceLogoutListener = `
    socket.on("FORCE_LOGOUT_EVENT", (data: any) => {
      const storedUser = localStorage.getItem("sessionUser");
      const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);
      const currentUserId = activeUser?.id || activeUser?.uid;
      const currentToken = localStorage.getItem("lanpro_jwt_token");
      
      if (currentUserId && currentUserId.toString() === data.userId && currentToken !== data.newToken) {
        toast.error("Sesi Anda telah diakhiri karena login di perangkat lain.");
        handleLogout(true);
      }
    });
`;

code = code.replace(
  'socket.on("connect", () => {',
  forceLogoutListener + '\n    socket.on("connect", () => {'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with FORCE_LOGOUT_EVENT listener");
