const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const modalState = `  const [socket, setSocket] = useState<any>(null);
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [pendingLoginCredentials, setPendingLoginCredentials] = useState<any>(null);
`;

code = code.replace(
  '  const [socket, setSocket] = useState<any>(null);',
  modalState
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx with modal state");
