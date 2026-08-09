const fs = require('fs');
let code = fs.readFileSync('src/features/issues/TaskDetailModal.tsx', 'utf8');

code = code.replace(/export const TaskDetailModal: React\.FC<TaskDetailModalProps> = \(\{/, 
  "export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({\n  isUpdatingTask,");

fs.writeFileSync('src/features/issues/TaskDetailModal.tsx', code);
