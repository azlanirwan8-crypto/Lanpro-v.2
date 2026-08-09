const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<LoginScreen',
  `
          <SingleLoginCollisionModal
            isOpen={showCollisionModal}
            activeSession={activeSessionData}
            onClose={() => {
              setShowCollisionModal(false);
              setPendingLoginCredentials(null);
            }}
            onForceLogout={() => {
              if (pendingLoginCredentials) {
                handleManualLogin(
                  pendingLoginCredentials.username,
                  pendingLoginCredentials.password,
                  pendingLoginCredentials.remember,
                  true
                );
              }
            }}
            isLoading={loading}
          />
          <LoginScreen`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx render modal");
