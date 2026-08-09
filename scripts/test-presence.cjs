const { io } = require("socket.io-client");

async function run() {
  const socket1 = io("http://localhost:3000");
  const socket2 = io("http://localhost:3000");

  socket1.on("connect", () => {
    socket1.emit("join_presence", { id: "admin", displayName: "Admin" });
  });

  socket2.on("connect", () => {
    socket2.emit("join_presence", { id: "user", displayName: "User" });
  });

  socket1.on("presence_sync", (users) => {
    console.log("Socket 1 sync:", users.map(u => u.displayName));
  });

  socket2.on("presence_sync", (users) => {
    console.log("Socket 2 sync:", users.map(u => u.displayName));
  });

  setTimeout(() => {
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }, 2000);
}
run();
