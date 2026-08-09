sed -i -e 's/onClick={handleUpdateSprint}/onClick={wrapAppSubmit("updateSprint", handleUpdateSprint)} disabled={isSubmitting["updateSprint"]}/g' src/App.tsx
sed -i -e 's/onClick={handleUpdateProject}/onClick={wrapAppSubmit("updateProject", handleUpdateProject)} disabled={isSubmitting["updateProject"]}/g' src/App.tsx
sed -i -e 's/onClick={handleUpdateTask}/onClick={wrapAppSubmit("updateTask", handleUpdateTask)} disabled={isSubmitting["updateTask"]}/g' src/App.tsx
sed -i -e 's/onClick={handleUpdateProfile}/onClick={wrapAppSubmit("updateProfile", handleUpdateProfile)} disabled={isSubmitting["updateProfile"]}/g' src/App.tsx
