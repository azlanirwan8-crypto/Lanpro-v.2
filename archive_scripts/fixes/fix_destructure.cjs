const fs = require('fs');
let content = fs.readFileSync('src/features/dashboard/index.tsx', 'utf8');

const targetStr = `  const myPersonalMetrics = useMemo(() => {
    if (!currentUser) {`;

const newStr = `  const myPersonalMetrics = useMemo(() => {
    const currentUser = props.currentUser;
    if (!currentUser) {`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/features/dashboard/index.tsx', content);
console.log("Fixed destructuring issue");
