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
  priority?: "High" | "Medium" | "Low" | "Critical"; 
  tags?: string[]; 
  comments?: QAComment[];
  commentsList?: QAComment[];
  evidences?: QAEvidence[];
  history?: any[];
  activeTesterId?: string;
}

export interface TestQAPanelProps {
  tasks: any[];
  projectMembers: any[];
  selectedProject: any;
  user: any;
  initialStatusFilter?: "ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending";
  setSelectedTaskForDetail?: (task: any) => void;
  setIsTaskDetailModalOpen?: (open: boolean) => void;
  updateTaskField?: (id: string, field: string, value: any) => any;
  updateTaskStatus?: (id: string, status: string) => void;
  socket?: any;
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
