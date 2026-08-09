const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /<TaskDetailModal\n\s*isOpen={isTaskDetailModalOpen}/;
const replacement = `<TaskDetailModal
          isUpdatingTask={isUpdatingTask}
          isOpen={isTaskDetailModalOpen}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);
