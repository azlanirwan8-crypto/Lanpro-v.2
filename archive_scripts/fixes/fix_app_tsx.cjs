const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `        {confirmAction?.isOpen && (
          <ConfirmationModal
            isOpen={confirmAction?.isOpen || false}
            onClose={() => setConfirmAction(null)}
            title={confirmAction?.title || "Konfirmasi Tindakan"}
            message={confirmAction?.message || ""}
            onConfirm={async () => {
              if (confirmAction?.onConfirm) {
                try {
                  await confirmAction.onConfirm();
                } catch (e) {
                  console.error("Action error:", e);
                }
              }
              setConfirmAction(null);
            }}
            confirmText={confirmAction?.isAlert ? "OK" : "Ya, Lanjutkan"}
            cancelText="Batal"
            isAlert={confirmAction?.isAlert || false}
            variant={
              confirmAction?.isAlert
                ? "warning"
                : confirmAction?.title?.toLowerCase().includes("hapus")
                  ? "danger"
                  : "warning"
            }
          />
        )}`;

const replacementStr = `        {confirmAction?.isOpen && (
          <ConfirmationModal
            isOpen={confirmAction?.isOpen || false}
            onClose={() => setConfirmAction(null)}
            title={confirmAction?.title || "Konfirmasi Tindakan"}
            message={confirmAction?.message || ""}
            isLoading={confirmAction?.isLoading}
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
            }}
            confirmText={confirmAction?.isAlert ? "OK" : "Ya, Lanjutkan"}
            cancelText="Batal"
            isAlert={confirmAction?.isAlert || false}
            variant={
              confirmAction?.isAlert
                ? "warning"
                : confirmAction?.title?.toLowerCase().includes("hapus")
                  ? "danger"
                  : "warning"
            }
          />
        )}`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Fixed ConfirmAction loading state");
} else {
    console.log("Could not find target string in App.tsx");
}
