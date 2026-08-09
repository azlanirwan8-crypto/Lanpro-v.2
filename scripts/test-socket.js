const { io } = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to socket");
  socket.emit("join_presence", {
    id: "user2",
    uid: "user2",
    displayName: "Ribka",
    role: "user"
  });
});

socket.on("presence_sync", (users) => {
  console.log("Received presence:", users);
});

setTimeout(() => {
  console.log("Closing connection");
  socket.disconnect();
  process.exit(0);
}, 5000);
