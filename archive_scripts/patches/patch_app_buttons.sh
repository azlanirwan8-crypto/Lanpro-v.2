sed -i -e 's/onClick={handleCreateSprint}/onClick={wrapAppSubmit("createSprint", handleCreateSprint)} disabled={isSubmitting["createSprint"]}/g' src/App.tsx
sed -i -e 's/onClick={handleCreateProject}/onClick={wrapAppSubmit("createProject", handleCreateProject)} disabled={isSubmitting["createProject"]}/g' src/App.tsx
sed -i -e 's/onClick={handleCreateTask}/onClick={wrapAppSubmit("createTask", handleCreateTask)} disabled={isSubmitting["createTask"]}/g' src/App.tsx
