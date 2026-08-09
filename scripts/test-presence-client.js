import { io } from "socket.io-client";

const socket1 = io("http://localhost:3000");
socket1.on("connect", () => {
  socket1.emit("join_presence", { id: "user1", uid: "user1", displayName: "User 1" });
});
socket1.on("presence_sync", (users) => {
  console.log("S1 sees:", users.map(u => u.displayName).join(", "));
});

setTimeout(() => {
  const socket2 = io("http://localhost:3000");
  socket2.on("connect", () => {
    socket2.emit("join_presence", { id: "user2", uid: "user2", displayName: "User 2" });
  });
  socket2.on("presence_sync", (users) => {
    console.log("S2 sees:", users.map(u => u.displayName).join(", "));
  });

  setTimeout(() => {
    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
  }, 2000);
}, 1000);
