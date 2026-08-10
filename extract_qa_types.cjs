const fs = require('fs');

let qaContent = fs.readFileSync('src/features/qa/TestQAPanel.tsx', 'utf8');

const startMarker = 'export interface QAComment {';
const endMarker = 'export function TestQAPanel({';

const startIndex = qaContent.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = qaContent.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    let chunk = qaContent.substring(startIndex, endIndex);
    
    const typesFile = `export interface QAComment {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface QAEvidence {
  id: string;
  name: string;
  url: string;
  type: "image" | "video" | "file";
}

export interface QATestCase {
  id: string;
  suiteId: string;
  rowNum: number;
  title: string;
  steps: string;
  expectedResult: string;
  status: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending";
  comment?: string;
  evidenceUrl?: string;
  evidenceType?: "image" | "video" | "file";
  evidenceName?: string;
  linkedBugKey?: string; 
  assignedTo?: string; 
  priority?: "High" | "Medium" | "Low"; 
  tags?: string[]; 
  comments?: QAComment[];
  evidences?: QAEvidence[];
}

export interface QATestSuite {
  id: string;
  projectId: string;
  name: string;
  phase: "SIT" | "UAT" | "PTR";
  uploadedBy: string;
  uploadedAt: string;
  fileName?: string;
  cases: QATestCase[];
}
`;

    fs.writeFileSync('src/features/qa/types.ts', typesFile);

    const importStatement = `import { QAComment, QAEvidence, QATestCase, QATestSuite } from "./types";\n`;
    
    qaContent = qaContent.substring(0, startIndex) + importStatement + qaContent.substring(endIndex);
    fs.writeFileSync('src/features/qa/TestQAPanel.tsx', qaContent);
    console.log("Types extracted successfully!");
  }
}
