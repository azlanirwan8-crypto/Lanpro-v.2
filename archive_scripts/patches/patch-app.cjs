const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// import HeaderNetworkStatus
if (!code.includes('import { HeaderNetworkStatus }')) {
  code = code.replace(
    'import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";',
    'import { HeaderAvatarGroup } from "./components/HeaderAvatarGroup";\nimport { HeaderNetworkStatus } from "./components/HeaderNetworkStatus";'
  );
}

// remove the line <HeaderNetworkStatus ... /> from App.tsx since the UI is already in App.tsx
// Actually wait! Let's just remove `<HeaderNetworkStatus ... />` and use the one built into App.tsx? No, user explicitly said "ReferenceErrors (seperti HeaderNetworkStatus...)". So we must fix the import and the props.
code = code.replace(
  '<HeaderNetworkStatus latencyStatus={latencyStatus} latencyText={latencyText} selectedProjectKey={selectedProject.key} />',
  '<HeaderNetworkStatus latencyStatus={latencyStatus === "excellent" ? "good" : latencyStatus} latencyText={`API PING: ${apiLatency !== null ? apiLatency + "ms" : "Menghubungkan..."}`} selectedProjectKey={selectedProject?.key || ""} />'
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
