const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /      const data = await apiRequest\(\`\/api\/projects\/\$\{selectedProject\.id\}\/tasks\/\$\{taskId\}\`, \{\n        method: "PUT",\n        body: updateData\n      \}\);\n      if \(data\.status !== "success"\) throw new Error\(data\.message\);/g;

const replacement = `      setIsUpdatingTask((prev) => ({ ...prev, [taskId]: true }));
      let data;
      try {
        data = await apiRequest(\`/api/projects/\${selectedProject.id}/tasks/\${taskId}\`, {
          method: "PUT",
          body: updateData
        });
        if (data.status !== "success") throw new Error(data.message);
      } finally {
        setIsUpdatingTask((prev) => ({ ...prev, [taskId]: false }));
      }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Success");
} else {
  console.log("No match found");
}
