export interface QAComment {
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
