const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /onConfirm=\{async \(\) => \{\s+if \(confirmAction\?\.onConfirm\) \{\s+try \{\s+await confirmAction\.onConfirm\(\);\s+\} catch \(e\) \{\s+console\.error\("Action error:", e\);\s+\}\s+\}\s+setConfirmAction\(null\);\s+\}\}/;

const replacement = `isLoading={confirmAction?.isLoading}
            onConfirm={async () => {
              if (confirmAction?.onConfirm) {
                setConfirmAction(prev => prev ? { ...prev, isLoading: true } : null);
                try {
                  await confirmAction.onConfirm();
                } catch (e) {
                  console.error("Action error:", e);
                }
              }
              setConfirmAction(null);
            }}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed via regex");
