const fs = require('fs');
let code = fs.readFileSync('src/features/flowchart/index.tsx', 'utf8');

const regex = /\/\/ Create initial demo flows so the board is never empty[\s\S]*?(?=  \/\/ Helper to transform Google Doc \/ Sheet \/ Slides URL to preview\/embed mode)/;
const replacement = `  // Init empty flowchart state
  const createDefaultInitialFlowchart = (currentList: FlowchartData[]) => {
    setFlowcharts(currentList);
    localStorage.setItem(\`lanpro_multicharts_\${selectedProject.id}\`, JSON.stringify(currentList));
    
    // Set active flow states to empty (not pre-selected)
    setSelectedFlowId(null);
    setNodes([]);
    setEdges([]);
    setCanvasTheme("miro");
    setHistoryStack([]);
    setHistoryIndex(0);
    setRightViewMode("embed");
  };

`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/features/flowchart/index.tsx', code);
console.log("Dummy data removed from flowchart");
