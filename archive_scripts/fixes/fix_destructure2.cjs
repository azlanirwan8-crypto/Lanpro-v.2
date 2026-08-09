const fs = require('fs');
let content = fs.readFileSync('src/features/dashboard/index.tsx', 'utf8');

const targetStr2 = `  }, [tasks, currentUser]);`;
const newStr2 = `  }, [tasks, props.currentUser]);`;

content = content.replace(targetStr2, newStr2);
fs.writeFileSync('src/features/dashboard/index.tsx', content);
console.log("Fixed destructuring issue 2");
