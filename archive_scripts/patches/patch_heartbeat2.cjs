const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldHeartbeat = `      const pingHeartbeat = async () => {
        try {
          await apiRequest('/api/users/heartbeat', { method: 'POST' });
        } catch(e) {
          // silent fail
        }
      };
      pingHeartbeat();
      intervalId = setInterval(pingHeartbeat, 45000); // 45 seconds`;

const newHeartbeat = `      const pingHeartbeat = async () => {
        try {
          await apiRequest('/api/users/heartbeat', { method: 'POST' });
          fetchAllUsers(); // GET latest users including their lastSeen
        } catch(e) {
          // silent fail
        }
      };
      pingHeartbeat();
      intervalId = setInterval(pingHeartbeat, 30000); // 30 seconds`;

code = code.replace(oldHeartbeat, newHeartbeat);
fs.writeFileSync('src/App.tsx', code);
console.log("Heartbeat polling fixed.");
