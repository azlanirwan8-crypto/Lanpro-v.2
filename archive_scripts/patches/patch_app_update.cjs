const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add isUpdatingTask state
if (!code.includes('const [isUpdatingTask, setIsUpdatingTask]')) {
  code = code.replace(
    /const \[isNewSprintModalOpen, setIsNewSprintModalOpen\] = useState\(false\);/,
    "const [isUpdatingTask, setIsUpdatingTask] = useState<Record<string, boolean>>({});\n  const [isNewSprintModalOpen, setIsNewSprintModalOpen] = useState(false);"
  );
}

// 2. Modify updateTaskField
const updateTaskFieldRegex = /(const updateTaskField = async \(taskId: string, field: string, value: any\) => {[\s\S]*?)const data = await apiRequest\(\/api\/projects\/\$\{selectedProject\.id\}\/tasks\/\$\{taskId\}\`, \{\n\s*method: "PUT",\n\s*body: updateData\n\s*\}\);\s*if \(data\.status !== "success"\) throw new Error\(data\.message\);/m;

const replacement = `$1
      setIsUpdatingTask((prev) => ({ ...prev, [taskId]: true }));
      try {
        const data = await apiRequest(\`/api/projects/\${selectedProject.id}/tasks/\${taskId}\`, {
          method: "PUT",
          body: updateData
        });
        if (data.status !== "success") throw new Error(data.message);
      } finally {
        setIsUpdatingTask((prev) => ({ ...prev, [taskId]: false }));
      }
`;

code = code.replace(updateTaskFieldRegex, replacement);

fs.writeFileSync('src/App.tsx', code);
