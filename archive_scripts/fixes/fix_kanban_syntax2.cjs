const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/index.tsx', 'utf8');

const badPart = `        )}
             </div>
          </div>
        ))}
      </div>`;
const goodPart = `        )}
      </div>`;

if (code.includes(badPart)) {
    code = code.replace(badPart, goodPart);
    fs.writeFileSync('src/features/Kanban/index.tsx', code);
    console.log("Syntax fixed correctly");
} else {
    console.log("Could not find exact bad string. Let's try indexOf");
    const ix = code.lastIndexOf('))}');
    if (ix > -1) {
        // find ')}' before it
        code = code.substring(0, code.indexOf('             </div>', code.lastIndexOf('        )}'))) + '      </div>\n    );\n  };\n\n  return (';
        fs.writeFileSync('src/features/Kanban/index.tsx', code);
        console.log("Manual substring fix applied.");
    }
}

