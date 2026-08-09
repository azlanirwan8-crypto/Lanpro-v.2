const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Socket initialization and polling logic
const oldSocket = `
  useEffect(() => {
    const socket = io();
    setSocket(socket);

    socket.on("connect", () => {
       console.log("[SOCKET] Terhubung ke server.");
    });
`;
const newSocket = `
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    // Vercel friendly socket config
    const socket = io({
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ['polling', 'websocket']
    });
    setSocket(socket);

    socket.on("connect", () => {
       console.log("[SOCKET] Terhubung ke server.");
       setSocketConnected(true);
    });
    
    socket.on("connect_error", (err) => {
       // Suppress loud socket errors to avoid Vercel console spam
       setSocketConnected(false);
    });
    
    socket.on("disconnect", () => {
       setSocketConnected(false);
    });
`;
code = code.replace(oldSocket, newSocket);

// 2. Heartbeat logic
const oldHeartbeat = `
  useEffect(() => {
    if (!socket || !selectedProject || !currentUser) return;
`;
const newHeartbeat = `
  // Serverless Heartbeat Fallback
  useEffect(() => {
    if (!currentUser) return;
    let intervalId;
    if (!socketConnected) {
      const pingHeartbeat = async () => {
        try {
          await apiRequest('/api/users/heartbeat', { method: 'POST' });
        } catch(e) {
          // silent fail
        }
      };
      pingHeartbeat();
      intervalId = setInterval(pingHeartbeat, 45000); // 45 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [socketConnected, currentUser]);

  useEffect(() => {
    if (!socket || !selectedProject || !currentUser) return;
`;
code = code.replace(oldHeartbeat, newHeartbeat);

fs.writeFileSync('src/App.tsx', code);
console.log("Socket and Heartbeat frontend patched.");
