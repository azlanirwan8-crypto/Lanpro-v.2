const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/index.tsx', 'utf8');

// The first regex was:
// code = code.replace(/\{epics\.map\(epic => \([\s\S]*?\)\)\}/, lanesRenderReplace);
// Let's see if it's there.
if (code.includes('epics.map(epic => (')) {
    console.log("EPIC MAP FOUND, replacing it directly without regex");
    const startIndex = code.indexOf('{epics.map(epic => (');
    const endIndex = code.indexOf('))}</div>', startIndex) > -1 ? code.indexOf('))}</div>', startIndex) : code.indexOf('))}            </div>', startIndex);
    console.log(endIndex);
}

