const fs = require('fs');
let content = fs.readFileSync('src/features/dashboard/components/MetricCard.tsx', 'utf8');

const targetStr = `    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4">`;
const newStr = `    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-slate-200">`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('src/features/dashboard/components/MetricCard.tsx', content);
console.log("Fixed MetricCard hover states");
