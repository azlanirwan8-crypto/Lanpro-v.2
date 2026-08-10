const { io } = require("socket.io-client");
const socket1 = io("http://localhost:3000");
const socket2 = io("http://localhost:3000");

socket1.on("connect", () => {
  socket1.emit("join_presence", { id: "user1", displayName: "User 1" });
});
socket2.on("connect", () => {
  socket2.emit("join_presence", { id: "user2", displayName: "User 2" });
});

socket2.on("presence_sync", (users) => {
  console.log("Socket 2 received presence:", users.length, "users");
});
setTimeout(() => {
  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}, 2000);
