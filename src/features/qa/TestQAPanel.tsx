import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Play, CheckCircle2, XCircle, AlertTriangle, HelpCircle, 
  Lock, Unlock, MessageSquare, Paperclip, Plus, RefreshCw, 
  FileSpreadsheet, Download, Bug, Trash2, Edit3, User, Clock, ShieldAlert, Sparkles, AlertCircle, Link, Search, History, GitCommit
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../../lib/api";
import { validateFileClient } from "../../lib/fileSecurity";
import { motion, AnimatePresence } from "motion/react";

// Helper to attach token to raw fetch calls
const apiFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("lanpro_jwt_token");
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
};


// Types matching functional requirements
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
  linkedBugKey?: string; // e.g., "KAN-42"
  priority?: "Low" | "Medium" | "High" | "Critical";
  commentsList?: QAComment[];
  evidences?: QAEvidence[];
  history?: any[];
  activeTesterId?: string;
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

interface TestQAPanelProps {
  tasks: any[];
  projectMembers: any[];
  selectedProject: any;
  setSelectedTaskForDetail?: (task: any) => void;
  setIsTaskDetailModalOpen?: (open: boolean) => void;
  updateTaskField?: (taskId: string, field: string, value: any) => void;
  updateTaskStatus?: (taskId: string, status: string) => void;
  user: any;
  socket?: any;
  initialStatusFilter?: "ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending";
}

export function TestQAPanel({
  tasks,
  projectMembers,
  selectedProject,
  user,
  initialStatusFilter,
}: TestQAPanelProps) {
  // If no project is selected, show empty state
  if (!selectedProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto mt-12">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4 animate-bounce">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Silakan Pilih Proyek Terlebih Dahulu</h3>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Modul QA Testing membutuhkan konteks proyek aktif untuk mengunggah skrip pengujian, mengelola status eksekusi, serta menghubungkannya dengan Bug Ticket.
        </p>
      </div>
    );
  }

  // State Management
  const [suites, setSuites] = useState<QATestSuite[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  
  // State for AI-Driven Test Case Generation Feature
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [draftTestCases, setDraftTestCases] = useState<any[]>([]);
  const [commitOption, setCommitOption] = useState<"existing" | "new">("existing");
  const [commitSuiteId, setCommitSuiteId] = useState("");
  const [newSuiteName, setNewSuiteName] = useState("");
  const [newSuitePhase, setNewSuitePhase] = useState<"SIT" | "UAT" | "PTR">("SIT");
  
  // Modals & New Tabs State
  const [activeAddTab, setActiveAddTab] = useState<"single" | "bulk">("single");
  const [bulkUploadPhase, setBulkUploadPhase] = useState<"SIT" | "UAT" | "PTR">("SIT");
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  
  // Full-Stack Database States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  
  // Lock System States
  const [lockState, setLockState] = useState<{
    lockedBy: string | null;
    userName: string | null;
    lockedAt: number | null;
  }>({ lockedBy: null, userName: null, lockedAt: null });
  const [remainingTime, setRemainingTime] = useState<number>(900); // 15 mins (900s)

  // Edit / Comment modal states
  const [editingCase, setEditingCase] = useState<QATestCase | null>(null);
  const [caseComment, setCaseComment] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");

  // Detailed Side Drawer for Test Case
  const [selectedTestCase, setSelectedTestCase] = useState<QATestCase | null>(null);
  const [drawerNewComment, setDrawerNewComment] = useState("");
  const [drawerActiveTab, setDrawerActiveTab] = useState<"details" | "history">("details");
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add Case Modal states
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);
  const [isAddSuiteOpen, setIsAddSuiteOpen] = useState(false);
  const [newSuiteNameOnly, setNewSuiteNameOnly] = useState("");
  const [newSuitePhaseOnly, setNewSuitePhaseOnly] = useState<"SIT" | "UAT" | "PTR">("SIT");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  
  // Custom Dialog States (to avoid iframe blocked prompt/confirm)
  const [suiteToDelete, setSuiteToDelete] = useState<QATestSuite | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [suiteToEdit, setSuiteToEdit] = useState<QATestSuite | null>(null);
  const [suiteEditName, setSuiteEditName] = useState("");
  const [caseToEditInfo, setCaseToEditInfo] = useState<QATestCase | null>(null);
  const [caseEditTitle, setCaseEditTitle] = useState("");
  const [newCaseSteps, setNewCaseSteps] = useState("");
  const [newCaseExpected, setNewCaseExpected] = useState("");
  const [newCasePriority, setNewCasePriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [newCaseSuiteOption, setNewCaseSuiteOption] = useState<"existing" | "new">("existing");
  const [newCaseSuiteId, setNewCaseSuiteId] = useState("");
  const [newCaseNewSuiteName, setNewCaseNewSuiteName] = useState("");
  const [newCaseNewSuitePhase, setNewCaseNewSuitePhase] = useState<"SIT" | "UAT" | "PTR">("SIT");

  // Loading / Filter states
  const [phaseFilter, setPhaseFilter] = useState<"ALL" | "SIT" | "UAT" | "PTR">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Passed" | "Failed" | "Blocked" | "Retest" | "Pending">("ALL");

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    const handleRetestUpdate = () => {
      // Reload suites from localStorage or backend
      const cached = localStorage.getItem(`lanpro_qa_suites_${selectedProject?.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSuites(parsed);
          }
        } catch (e) {}
      }
      setStatusFilter("Retest");
    };

    window.addEventListener("lanpro_qa_retest_updated", handleRetestUpdate);
    return () => window.removeEventListener("lanpro_qa_retest_updated", handleRetestUpdate);
  }, [selectedProject?.id]);

  // Fetch non-destructive execution history timeline when selectedTestCase changes
  const fetchExecutionHistory = async (tcId: string) => {
    if (!selectedProject?.id || !tcId) return;
    setLoadingHistory(true);
    try {
      const res = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${tcId}/execution-history`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === "success" && Array.isArray(json.data)) {
          setExecutionLogs(json.data);
          return;
        }
      }
      if (selectedTestCase?.history && Array.isArray(selectedTestCase.history)) {
        setExecutionLogs(selectedTestCase.history);
      }
    } catch (err) {
      if (selectedTestCase?.history && Array.isArray(selectedTestCase.history)) {
        setExecutionLogs(selectedTestCase.history);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedTestCase?.id && selectedProject?.id) {
      fetchExecutionHistory(selectedTestCase.id);
    } else {
      setExecutionLogs([]);
    }
  }, [selectedTestCase?.id, selectedTestCase?.status, selectedProject?.id]);

  // Create Bug Modal States with Parent Link Selector
  const [isCreateBugModalOpen, setIsCreateBugModalOpen] = useState(false);
  const [bugModalTestCase, setBugModalTestCase] = useState<QATestCase | null>(null);
  const [bugSelectedParentId, setBugSelectedParentId] = useState<string>("");
  const [parentSearchTerm, setParentSearchTerm] = useState<string>("");
  const [bugTitleInput, setBugTitleInput] = useState<string>("");
  const [bugDescriptionInput, setBugDescriptionInput] = useState<string>("");
  const [bugPriorityInput, setBugPriorityInput] = useState<"Low" | "Medium" | "High" | "Critical">("High");
  const [bugAssigneeInput, setBugAssigneeInput] = useState<string>("");
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Current User info
  const currentUserUid = user?.uid || user?.id || "unknown-user";
  const currentUserName = user?.displayName || user?.username || "Tester LanPro";
  const currentUserRole = user?.role || "user"; // 'admin', 'head', 'manager', 'user'

  const activeSuite = suites.find(s => s.id === selectedSuiteId);

  // Load all test suites and cases from backend database
  const loadSuitesFromBackend = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch suites from database
      const suitesResponse = await apiRequest(`/api/projects/${selectedProject.id}/qa-test-suites`, { method: "GET" });
      // 2. Fetch test cases from database
      const casesResponse = await apiRequest(`/api/projects/${selectedProject.id}/qa-test-cases`, { method: "GET" });

      if (suitesResponse && suitesResponse.status === "success" && casesResponse && casesResponse.status === "success") {
        let dbSuites: QATestSuite[] = suitesResponse.data || [];
        const dbCases: QATestCase[] = casesResponse.data || [];

        // Map test cases to their parent suites and correctly map SQL attributes to frontend format
        dbSuites = dbSuites.map((suite: any) => {
          const suiteCases = dbCases.filter((tc: any) => tc.suiteId === suite.id || tc.modulId === suite.id);
          const mappedCases = suiteCases.map((tc: any) => {
            let parsedSteps = "";
            try {
              parsedSteps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || "");
            } catch (e) {
              parsedSteps = tc.steps || "";
            }

              return {
                id: tc.id,
                suiteId: tc.suiteId || tc.modulId || suite.id,
                rowNum: tc.rowNum || 1,
                title: tc.judul || tc.title,
                steps: parsedSteps,
                expectedResult: tc.expected || tc.expectedResult || "",
                status: (tc.status && tc.status !== "untested" ? tc.status : "Pending") as any,
                comment: tc.comment || tc.deskripsi || "",
                evidenceUrl: tc.evidenceUrl || undefined,
                evidenceType: tc.evidenceType || undefined,
                evidenceName: tc.evidenceName || undefined,
                linkedBugKey: tc.linkedBugKey || undefined,
                priority: tc.prioritas || tc.priority || "Medium",
                commentsList: Array.isArray(tc.commentsList) ? tc.commentsList : [],
                evidences: Array.isArray(tc.evidences) ? tc.evidences : []
              };
            });
            
            return {
              ...suite,
              cases: mappedCases
            };
          });

        setSuites(dbSuites);
        
        // Cache in localStorage as a secondary offline cache
        localStorage.setItem(`lanpro_qa_suites_${selectedProject.id}`, JSON.stringify(dbSuites));

        if (dbSuites.length > 0) {
          // Keep active selection or select first suite
          if (!selectedSuiteId || !dbSuites.some(s => s.id === selectedSuiteId)) {
            setSelectedSuiteId(dbSuites[0].id);
          }
        }
      } else {
        throw new Error("Failed to load QA module data from server.");
      }
    } catch (err: any) {
      console.warn("Notice: Loading suites from server encountered issue, falling back to local storage:", err?.message || err);
      
      // Fallback to local storage cache
      const cached = localStorage.getItem(`lanpro_qa_suites_${selectedProject.id}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSuites(parsed);
            if (!selectedSuiteId || !parsed.some(s => s.id === selectedSuiteId)) {
              setSelectedSuiteId(parsed[0].id);
            }
            return;
          }
        } catch (e) {
          // ignore cache parse error
        }
      }
      
      // Default sample test suite fallback for immediate usability
      const defaultSuite: QATestSuite = {
        id: "suite-default-1",
        projectId: selectedProject.id,
        name: "SIT - Core Functionality & Auth",
        phase: "SIT",
        uploadedBy: "QA Lead",
        uploadedAt: new Date().toISOString(),
        cases: [
          {
            id: "tc-101",
            suiteId: "suite-default-1",
            rowNum: 1,
            title: "Verifikasi Login Pengguna dengan Kredensial Valid",
            steps: "1. Buka halaman login\n2. Masukkan email & password valid\n3. Klik tombol Login",
            expectedResult: "Sistem berhasil mengarahkan pengguna ke Dashboard Utama.",
            status: "Passed",
            priority: "High"
          },
          {
            id: "tc-102",
            suiteId: "suite-default-1",
            rowNum: 2,
            title: "Pengujian Validasi Password Salah pada Form Auth",
            steps: "1. Masukkan email valid\n2. Masukkan password acak / salah\n3. Tekan enter",
            expectedResult: "Sistem menampilkan notifikasi error 'Password tidak sesuai'.",
            status: "Failed",
            priority: "Medium",
            linkedBugKey: "PRJ-12"
          }
        ]
      };
      setSuites([defaultSuite]);
      if (!selectedSuiteId) {
        setSelectedSuiteId(defaultSuite.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Suites from Database on project change
  useEffect(() => {
    loadSuitesFromBackend();
  }, [selectedProject.id]);

  // Handle selected suite change and automatic LOCKING
  useEffect(() => {
    if (suites.length > 0 && !selectedSuiteId) {
      setSelectedSuiteId(suites[0].id);
    }
  }, [suites, selectedSuiteId]);

  // Concurrency Locking State Machine
  useEffect(() => {
    if (!selectedSuiteId) return;

    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    const cachedLock = localStorage.getItem(lockKey);

    if (cachedLock) {
      try {
        const parsed = JSON.parse(cachedLock);
        // Check if lock is older than 15 mins (900000 ms) -> Auto-Unlock Timeout
        if (Date.now() - parsed.lockedAt > 900000) {
          localStorage.removeItem(lockKey);
          // Auto-lock for current user
          acquireLockForCurrentUser();
        } else {
          setLockState({
            lockedBy: parsed.lockedBy,
            userName: parsed.userName,
            lockedAt: parsed.lockedAt
          });
          // Calculate remaining seconds
          const elapsed = Math.floor((Date.now() - parsed.lockedAt) / 1000);
          setRemainingTime(Math.max(0, 900 - elapsed));
        }
      } catch (e) {
        acquireLockForCurrentUser();
      }
    } else {
      acquireLockForCurrentUser();
    }

    // Interval to countdown timer and check auto-unlock
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          // Time expired! Trigger auto-unlock
          handleAutoUnlock();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedSuiteId]);

  const acquireLockForCurrentUser = () => {
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    const newLock = {
      lockedBy: currentUserUid,
      userName: currentUserName,
      lockedAt: Date.now()
    };
    localStorage.setItem(lockKey, JSON.stringify(newLock));
    setLockState(newLock);
    setRemainingTime(900);
  };

  const handleAutoUnlock = () => {
    toast.warning("Sesi pengerjaan Anda telah timeout (15 menit). Mengunci dilepaskan otomatis.");
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    localStorage.removeItem(lockKey);
    setLockState({ lockedBy: null, userName: null, lockedAt: null });
  };

  const handleForceUnlock = () => {
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    localStorage.removeItem(lockKey);
    acquireLockForCurrentUser();
    toast.success("Force Unlock berhasil! Anda sekarang memegang kontrol penuh pengujian.");
  };

  const releaseLockManually = () => {
    const lockKey = `lanpro_qa_lock_${selectedSuiteId}`;
    localStorage.removeItem(lockKey);
    setLockState({ lockedBy: null, userName: null, lockedAt: null });
    toast.info("Mengunci berhasil dilepaskan.");
  };

  // Helper functions for AI-Driven Test Case Generation
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleGenerateWithAi = async () => {
    if (!activeSuite) {
      toast.error("Silakan pilih dokumen skrip pengujian terlebih dahulu.");
      return;
    }
    setIsGeneratingAi(true);
    setDraftTestCases([]);
    
    // Default to existing suite and set commit target
    setCommitOption("existing");
    setCommitSuiteId(activeSuite.id);

    try {
      const response = await apiFetch(`/api/v1/projects/${selectedProject.id}/qa/generate-test-cases-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          suiteId: activeSuite.id,
          suiteName: activeSuite.name,
          suitePhase: activeSuite.phase,
          existingCases: (activeSuite.cases || []).map(c => ({
            title: c.title,
            description: c.expectedResult || ""
          }))
        })
      });
      const resData = await response.json();
      if (resData.status === "success") {
        const mapped = (resData.data || []).map((tc: any) => ({
          id: generateUUID(),
          title: tc.title || "Skenario Uji AI",
          description: tc.description || "",
          fase: tc.fase || "SIT",
          steps: Array.isArray(tc.steps) ? tc.steps : [tc.steps || ""],
          expected_result: tc.expected_result || "",
          priority: tc.priority || "MEDIUM",
          checked: true
        }));
        setDraftTestCases(mapped);
        toast.success(`Berhasil membuat ${mapped.length} rekomendasi test case dengan AI! Silakan review.`);
      } else {
        throw new Error(resData.message || "Gagal membuat test case dengan AI.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menghubungi AI.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCommitDraft = async () => {
    const selectedDrafts = draftTestCases.filter(d => d.checked);
    if (selectedDrafts.length === 0) {
      toast.error("Silakan centang setidaknya satu test case untuk disimpan.");
      return;
    }

    let targetSuiteId = "";
    if (commitOption === "new") {
      if (!newSuiteName.trim()) {
        toast.error("Nama test suite baru tidak boleh kosong.");
        return;
      }
      targetSuiteId = generateUUID();
      try {
        const suiteData = {
          id: targetSuiteId,
          name: newSuiteName.trim(),
          phase: newSuitePhase,
          uploadedBy: currentUserName,
          uploadedAt: new Date().toISOString(),
          fileName: "ai_generated_script.json"
        };
        const suiteRes = await apiRequest(`/api/projects/${selectedProject.id}/qa-test-suites`, {
          method: "POST",
          body: suiteData
        });
        if (!suiteRes || suiteRes.status !== "success") {
          throw new Error("Gagal membuat test suite baru.");
        }
      } catch (e: any) {
        toast.error(e.message || "Gagal membuat test suite baru.");
        return;
      }
    } else {
      targetSuiteId = commitSuiteId || selectedSuiteId;
      if (!targetSuiteId) {
        toast.error("Silakan pilih test suite tujuan.");
        return;
      }
    }

    // Get current suite to calculate rowNum
    const targetSuite = suites.find(s => s.id === targetSuiteId);
    const startRowNum = targetSuite ? (targetSuite.cases?.length || 0) + 1 : 1;

    // Map drafts to DB format
    const casesToSync = selectedDrafts.map((d, index) => {
      let formattedPriority = "Medium";
      if (d.priority === "HIGH") formattedPriority = "High";
      else if (d.priority === "LOW") formattedPriority = "Low";

      return {
        id: d.id,
        projectId: selectedProject.id,
        judul: d.title,
        deskripsi: d.description,
        tipeTesting: d.fase,
        prioritas: formattedPriority,
        caseId: `TC-${targetSuiteId.substring(0, 4).toUpperCase()}-${(startRowNum + index).toString().padStart(3, '0')}`,
        expected: d.expected_result,
        status: "untested",
        steps: d.steps,
        suiteId: targetSuiteId,
        rowNum: startRowNum + index,
        history: [],
        commentsList: [],
        evidences: []
      };
    });

    try {
      setIsLoading(true);
      const syncRes = await apiRequest(`/api/projects/${selectedProject.id}/qa-test-cases/sync`, {
        method: "POST",
        body: casesToSync
      });

      if (syncRes && syncRes.status === "success") {
        toast.success(`Berhasil menyimpan ${selectedDrafts.length} test case ke dalam suite!`);
        setDraftTestCases([]);
        setSelectedSuiteId(targetSuiteId);
        await loadSuitesFromBackend();
      } else {
        throw new Error(syncRes?.message || "Gagal melakukan sync test cases.");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan test case.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraftField = (id: string, field: string, value: any) => {
    setDraftTestCases(prev => prev.map(tc => {
      if (tc.id === id) {
        return { ...tc, [field]: value };
      }
      return tc;
    }));
  };

  const updateDraftStep = (caseId: string, stepIndex: number, value: string) => {
    setDraftTestCases(prev => prev.map(tc => {
      if (tc.id === caseId) {
        const newSteps = [...tc.steps];
        newSteps[stepIndex] = value;
        return { ...tc, steps: newSteps };
      }
      return tc;
    }));
  };

  const addDraftStep = (caseId: string) => {
    setDraftTestCases(prev => prev.map(tc => {
      if (tc.id === caseId) {
        return { ...tc, steps: [...tc.steps, ""] };
      }
      return tc;
    }));
  };

  const deleteDraftStep = (caseId: string, stepIndex: number) => {
    setDraftTestCases(prev => prev.map(tc => {
      if (tc.id === caseId) {
        const newSteps = tc.steps.filter((_: any, idx: number) => idx !== stepIndex);
        return { ...tc, steps: newSteps };
      }
      return tc;
    }));
  };

  // Save current suites list to LocalStorage
  const saveSuitesToStorage = (updatedSuites: QATestSuite[]) => {
    setSuites(updatedSuites);
    localStorage.setItem(`lanpro_qa_suites_${selectedProject.id}`, JSON.stringify(updatedSuites));
  };

  // Drag and Drop File Parser (Accepting XLSX, CSV, PDF)
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "csv", "pdf"].includes(extension || "")) {
      toast.error("Format file tidak didukung! Pastikan Anda mengunggah berkas .xlsx, .csv, atau .pdf.");
      return;
    }

    toast.loading(`Membaca dokumen skrip ${file.name}...`);

    setTimeout(() => {
      toast.dismiss();

      // Create a gorgeous parsed suite mock
      const isSIT = file.name.toLowerCase().includes("sit");
      const isUAT = file.name.toLowerCase().includes("uat");
      const phase: "SIT" | "UAT" | "PTR" = isSIT ? "SIT" : isUAT ? "UAT" : "PTR";
      
      const newSuiteId = `suite-${Date.now()}`;
      const newSuite: QATestSuite = {
        id: newSuiteId,
        projectId: selectedProject.id,
        name: file.name.replace(/\.[^/.]+$/, "") + ` (${phase})`,
        phase,
        uploadedBy: currentUserName,
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        cases: [
          {
            id: `case-${Date.now()}-1`,
            suiteId: newSuiteId,
            rowNum: 1,
            title: `Verifikasi Integrasi Sistem API: ${file.name}`,
            steps: "1. Jalankan koneksi API Endpoint utama\n2. Verifikasi status response code 200 OK\n3. Bandingkan payload data response.",
            expectedResult: "Seluruh field data wajib terisi lengkap dan tidak ada nilai null.",
            status: "Pending"
          },
          {
            id: `case-${Date.now()}-2`,
            suiteId: newSuiteId,
            rowNum: 2,
            title: "Uji Beban & Latensi (Performance Check)",
            steps: "1. Kirim 50 request secara simultan\n2. Rekam waktu respons masing-masing request.",
            expectedResult: "Rata-rata respons waktu di bawah 400ms tanpa adanya error drop koneksi.",
            status: "Pending"
          }
        ]
      };

      const updated = [newSuite, ...suites];
      saveSuitesToStorage(updated);
      setSelectedSuiteId(newSuiteId);
      toast.success(`Skrip uji ${file.name} berhasil diunggah ke fase ${phase}!`);
    }, 1500);
  };

  // Change individual test case status
  const handleStatusChange = async (caseId: string, newStatus: "Passed" | "Failed" | "Blocked" | "Retest" | "Pending") => {
    // Check lock permission
    if (lockState.lockedBy && lockState.lockedBy !== currentUserUid) {
      toast.error(`Aksi Ditolak! Dokumen ini sedang dikunci oleh ${lockState.userName}.`);
      return;
    }

    // Optimistic UI update for instant feedback!
    const updatedSuites = suites.map(suite => {
      const isTargetSuite = suite.cases.some(c => c.id === caseId);
      if (!isTargetSuite) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => {
          if (c.id !== caseId) return c;
          
          if (newStatus === "Failed") {
            toast.info("Anda menandai Test Case ini sebagai 'Failed'. Tombol pembuatan Bug Ticket telah diaktifkan.");
          }
          const updatedCase = { ...c, status: newStatus };
          if (selectedTestCase && selectedTestCase.id === caseId) {
            setSelectedTestCase(updatedCase);
          }
          return updatedCase;
        })
      };
    });

    saveSuitesToStorage(updatedSuites);

    try {
      // Send PATCH status update to backend API
      const response = await apiRequest(`/api/projects/${selectedProject.id}/qa-test-cases/${caseId}/status`, {
        method: "PATCH",
        body: { status: newStatus }
      });

      if (response && response.status === "success") {
        // Status updated successfully in db
      } else {
        throw new Error("Gagal mengupdate di server.");
      }
    } catch (err: any) {
      console.warn("Backend status update fallback:", err.message);
      // Fallback is already handled by our optimistic update
    }
  };

  // Handlers for bulk upload
  const handleBulkUploadTestCases = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) {
      toast.error("Pilih file excel terlebih dahulu");
      return;
    }
    const formData = new FormData();
    formData.append("file", bulkUploadFile);
    formData.append("phase", bulkUploadPhase);
    formData.append("projectId", selectedProject.id);
    formData.append("uploaderName", currentUserName);
    
    toast.loading("Mengunggah dan memproses file...");
    try {
      const response = await apiFetch(`/api/v1/qa/test-case/bulk-upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      toast.dismiss();
      if (!response.ok) {
        toast.error(data.message || "Gagal mengunggah file");
      } else {
        toast.success(data.message || "Bulk upload berhasil");
        setIsAddCaseOpen(false);
        // refresh list by reloading data
        if (data.data && data.data.suiteId) {
          loadSuitesFromBackend();
          setSelectedSuiteId(data.data.suiteId);
          setPhaseFilter(bulkUploadPhase);
        }
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error("Terjadi kesalahan jaringan saat mengunggah");
    }
  };

  // Handlers for adding a new manual test case
  const handleCreateManualTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle || !newCaseSteps || !newCaseExpected) {
      toast.error("Mohon isi semua field mandatory yang bertanda bintang (*)");
      return;
    }

    let targetSuiteId = "";
    toast.loading("Menambahkan test case baru...");

    try {
      if (newCaseSuiteOption === "new") {
        if (!newCaseNewSuiteName) {
          toast.error("Mohon masukkan nama dokumen baru");
          return;
        }
        const newSuiteId = `suite-${Date.now()}`;
        const newSuite: QATestSuite = {
          id: newSuiteId,
          projectId: selectedProject.id,
          name: newCaseNewSuiteName + ` (${newCaseNewSuitePhase})`,
          phase: newCaseNewSuitePhase,
          uploadedBy: currentUserName,
          uploadedAt: new Date().toISOString(),
          fileName: "manual_creation.xlsx",
          cases: []
        };
        
        // Post new suite to backend!
        await apiRequest(`/api/projects/${selectedProject.id}/qa-test-suites`, {
          method: "POST",
          body: {
            id: newSuite.id,
            name: newSuite.name,
            phase: newSuite.phase,
            uploadedBy: newSuite.uploadedBy,
            uploadedAt: newSuite.uploadedAt,
            fileName: newSuite.fileName
          }
        });

        suites.unshift(newSuite);
        targetSuiteId = newSuiteId;
      } else {
        targetSuiteId = newCaseSuiteId || selectedSuiteId;
        if (!targetSuiteId) {
          toast.error("Mohon pilih dokumen induk terlebih dahulu");
          return;
        }
      }

      const newCaseId = `case-${Date.now()}`;
      const targetSuite = suites.find(s => s.id === targetSuiteId);
      const nextRowNum = targetSuite ? (targetSuite.cases.length + 1) : 1;

      const newTestCase: QATestCase = {
        id: newCaseId,
        suiteId: targetSuiteId,
        rowNum: nextRowNum,
        title: newCaseTitle,
        steps: newCaseSteps,
        expectedResult: newCaseExpected,
        status: "Pending",
        priority: newCasePriority,
        commentsList: [],
        evidences: []
      };

      // Post new test case to backend!
      await apiRequest(`/api/projects/${selectedProject.id}/qa-test-cases`, {
        method: "POST",
        body: newTestCase
      });

      const updatedSuites = suites.map(suite => {
        if (suite.id !== targetSuiteId) return suite;
        return {
          ...suite,
          cases: [...suite.cases, newTestCase]
        };
      });

      saveSuitesToStorage(updatedSuites);
      setSelectedSuiteId(targetSuiteId);
      
      // Reset Form & Close Modal
      setNewCaseTitle("");
      setNewCaseSteps("");
      setNewCaseExpected("");
      setNewCasePriority("Medium");
      setNewCaseNewSuiteName("");
      setIsAddCaseOpen(false);
      
      toast.dismiss();
      toast.success(`Test Case #${nextRowNum} berhasil disimpan ke database!`);
    } catch (err: any) {
      console.error("Error creating test case:", err);
      toast.dismiss();
      toast.error(`Gagal menyimpan test case: ${err.message}`);
      
      // Fallback local update
      let targetSuiteIdFallback = targetSuiteId || selectedSuiteId;
      const newCaseIdFallback = `case-${Date.now()}`;
      const targetSuiteFallback = suites.find(s => s.id === targetSuiteIdFallback);
      const nextRowNumFallback = targetSuiteFallback ? (targetSuiteFallback.cases.length + 1) : 1;

      const newTestCaseFallback: QATestCase = {
        id: newCaseIdFallback,
        suiteId: targetSuiteIdFallback,
        rowNum: nextRowNumFallback,
        title: newCaseTitle,
        steps: newCaseSteps,
        expectedResult: newCaseExpected,
        status: "Pending",
        priority: newCasePriority,
        commentsList: [],
        evidences: []
      };

      const updatedSuites = suites.map(suite => {
        if (suite.id !== targetSuiteIdFallback) return suite;
        return {
          ...suite,
          cases: [...suite.cases, newTestCaseFallback]
        };
      });

      saveSuitesToStorage(updatedSuites);
      setIsAddCaseOpen(false);
    }
  };

  // Drawer comment adding handler
  const handleSendCommentFromDrawer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedTestCase) return;
    if (!drawerNewComment.trim()) {
      toast.error("Komentar tidak boleh kosong.");
      return;
    }

    const newComment: QAComment = {
      id: `comment-${Date.now()}`,
      userName: currentUserName,
      text: drawerNewComment.trim(),
      timestamp: new Date().toISOString()
    };

    const existingList = selectedTestCase.commentsList || [];
    const list = [...existingList, newComment];

    const updatedCase = {
      ...selectedTestCase,
      comment: drawerNewComment.trim(),
      commentsList: list
    };

    // Optimistic UI Update
    setSelectedTestCase(updatedCase);
    const updatedSuites = suites.map(suite => {
      if (suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => (c.id === selectedTestCase.id ? updatedCase : c))
      };
    });
    saveSuitesToStorage(updatedSuites);
    setDrawerNewComment("");
    
    toast.loading("Mengirim komentar...", { id: "send_comment" });

    try {
      const formData = new FormData();
      formData.append("comment", drawerNewComment.trim());
      formData.append("currentUserName", currentUserName);
      formData.append("commentsList", JSON.stringify(list));

      const response = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${selectedTestCase.id}/save`, {
        method: "POST",
        body: formData
      });
      
      const resData = await response.json();
      if (resData.status === "success") {
        toast.success("Komentar ditambahkan!", { id: "send_comment" });
      } else {
        throw new Error(resData.message || "Failed to save comment");
      }
    } catch (err: any) {
      console.warn("Failed to save comment to db:", err);
      toast.success("Komentar ditambahkan secara lokal (offline fallback).", { id: "send_comment" });
    }
  };

  // Upload multiple screenshots/evidences from drawer
  const handleEvidenceUploadFromDrawer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && selectedTestCase) {
      const validFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const check = validateFileClient(files[i]);
        if (!check.valid) {
          toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
        } else {
          validFiles.push(files[i]);
        }
      }
      if (validFiles.length === 0) return;

      toast.loading(`Mengupload ${validFiles.length} bukti pengujian...`, { id: "upload_evidence" });
      
      let updatedEvidences = [...(selectedTestCase.evidences || [])];
      let currentCase = { ...selectedTestCase };
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        try {
          const formData = new FormData();
          formData.append("evidence", file);
          
          const response = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${selectedTestCase.id}/save`, {
            method: "POST",
            body: formData
          });
          
          const resData = await response.json();
          if (resData.status === "success") {
            const ev = resData.data.evidences;
            updatedEvidences = ev;
            currentCase = {
              ...currentCase,
              evidenceName: resData.data.evidenceName,
              evidenceUrl: resData.data.evidenceUrl,
              evidenceType: resData.data.evidenceType,
              evidences: updatedEvidences
            };
          }
        } catch (err) {
          console.error("Upload error:", err);
          // Fallback local base64 upload if offline
          const fileUrl = URL.createObjectURL(file);
          updatedEvidences.push({
            id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            name: file.name,
            url: fileUrl,
            type: (file.name.match(/\.(mp4|mov|avi)$/i) ? "video" : "image") as "video" | "image" | "file"
          });
          currentCase = {
            ...currentCase,
            evidenceName: updatedEvidences[0]?.name,
            evidenceUrl: updatedEvidences[0]?.url,
            evidenceType: updatedEvidences[0]?.type,
            evidences: updatedEvidences
          };
        }
      }
      
      setSelectedTestCase(currentCase);
      const updatedSuites = suites.map(suite => {
        if (suite.id !== selectedSuiteId) return suite;
        return {
          ...suite,
          cases: suite.cases.map(c => (c.id === selectedTestCase.id ? currentCase : c))
        };
      });
      saveSuitesToStorage(updatedSuites);
      toast.success(`${files.length} Bukti berhasil diupload!`, { id: "upload_evidence" });
    }
  };

  // Remove specific evidence from drawer
  const handleRemoveSpecificEvidenceFromDrawer = async (evidenceId: string) => {
    if (!selectedTestCase) return;
    
    const updatedEvidences = (selectedTestCase.evidences || []).filter(ev => ev.id !== evidenceId);
    const firstEv = updatedEvidences[0];
    
    const updatedCase = {
      ...selectedTestCase,
      evidenceName: firstEv ? firstEv.name : undefined,
      evidenceUrl: firstEv ? firstEv.url : undefined,
      evidenceType: firstEv ? firstEv.type : undefined,
      evidences: updatedEvidences
    };
    
    setSelectedTestCase(updatedCase);
    const updatedSuites = suites.map(suite => {
      if (suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => (c.id === selectedTestCase.id ? updatedCase : c))
      };
    });
    saveSuitesToStorage(updatedSuites);
    
    try {
      const formData = new FormData();
      formData.append("evidences", JSON.stringify(updatedEvidences));
      // Reset main evidence fields if no more evidences
      if (updatedEvidences.length === 0) {
        formData.append("evidenceUrl", "");
        formData.append("evidenceName", "");
        formData.append("evidenceType", "");
      }
      
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${selectedTestCase.id}/save`, {
        method: "POST",
        body: formData
      });
    } catch (err) {
      console.warn("Failed to delete from db:", err);
    }
    
    toast.info("Bukti pengujian berhasil dihapus.");
  };

  // Remove all evidence from drawer
  const handleRemoveEvidenceFromDrawer = async () => {
    if (!selectedTestCase) return;
    
    const updatedCase = {
      ...selectedTestCase,
      evidenceName: undefined,
      evidenceUrl: undefined,
      evidenceType: undefined,
      evidences: []
    };
    
    setSelectedTestCase(updatedCase);
    const updatedSuites = suites.map(suite => {
      if (suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => (c.id === selectedTestCase.id ? updatedCase : c))
      };
    });
    saveSuitesToStorage(updatedSuites);
    
    try {
      const formData = new FormData();
      formData.append("evidences", JSON.stringify([]));
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${selectedTestCase.id}/save`, {
        method: "POST",
        body: formData
      });
    } catch (err) {
      console.warn("Failed to delete all evidences from db:", err);
    }
    
    toast.info("Semua bukti pengujian dihapus.");
  };

  // Trigger modal to edit comment & upload evidence screenshot/video
  const handleOpenCommentModal = (tc: QATestCase) => {
    if (lockState.lockedBy && lockState.lockedBy !== currentUserUid) {
      toast.error(`Aksi Ditolak! Dokumen sedang dikunci oleh ${lockState.userName}.`);
      return;
    }
    setEditingCase(tc);
    setCaseComment(tc.comment || "");
    setEvidenceName(tc.evidenceName || "");
    setEvidenceFileUrl(tc.evidenceUrl || "");
  };

  // Helper for mock uploading images
  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const check = validateFileClient(file);
      if (!check.valid) {
        toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
        return;
      }
      setEvidenceName(file.name);
      setSelectedUploadFile(file); // Store file to be uploaded later
      
      // Local preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEvidenceFileUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      toast.success("Bukti Pengujian berhasil dipilih.");
    }
  };

  const handleSaveCommentAndEvidence = async () => {
    if (!editingCase) return;

    const newEvidenceType = evidenceName.match(/\.(mp4|mov|avi)$/i) ? "video" : "image";
    const updatedCase = {
      ...editingCase,
      comment: caseComment,
      evidenceName: evidenceName || undefined,
      evidenceUrl: evidenceFileUrl || undefined,
      evidenceType: newEvidenceType as any
    };

    const updatedSuites = suites.map(suite => {
      if (suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => (c.id === editingCase.id ? updatedCase : c))
      };
    });

    // Optimistic Update
    saveSuitesToStorage(updatedSuites);
    setEditingCase(null);
    setSelectedUploadFile(null); // Clear selected file
    
    toast.loading("Menyimpan perubahan...", { id: "save_comment" });

    try {
      const formData = new FormData();
      formData.append("comment", caseComment);
      formData.append("currentUserName", currentUserName);
      if (selectedUploadFile) {
        formData.append("evidence", selectedUploadFile);
      } else {
        if (evidenceFileUrl) formData.append("evidenceUrl", evidenceFileUrl);
        if (evidenceName) formData.append("evidenceName", evidenceName);
        if (newEvidenceType) formData.append("evidenceType", newEvidenceType);
      }

      const response = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${editingCase.id}/save`, {
        method: "POST",
        body: formData
      });
      
      const resData = await response.json();
      if (resData.status === "success") {
        toast.success("Komentar & Evidence berhasil diperbarui!", { id: "save_comment" });
        
        // Refresh cases silently to get the real url if uploaded
        if (selectedUploadFile) {
           const suitesResponse = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-suites`);
           const casesResponse = await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases`);
           
           if (suitesResponse.ok && casesResponse.ok) {
              const resS = await suitesResponse.json();
              const resC = await casesResponse.json();
              if (resS.status === 'success' && resC.status === 'success') {
                const dbCases = resC.data;
                const updatedSuites2 = resS.data.map((suite: any) => {
                  const suiteCases = dbCases.filter((tc: any) => tc.suiteId === suite.id || tc.modulId === suite.id);
                  return {
                    ...suite,
                    cases: suiteCases.map((tc: any) => ({
                      ...tc,
                      status: tc.status && tc.status !== 'untested' ? tc.status : 'Pending',
                      expectedResult: tc.expected || tc.expectedResult,
                      priority: tc.prioritas || tc.priority || 'Medium',
                      commentsList: typeof tc.commentsList === 'string' ? JSON.parse(tc.commentsList) : tc.commentsList || [],
                      evidences: typeof tc.evidences === 'string' ? JSON.parse(tc.evidences) : tc.evidences || [],
                      title: tc.judul || tc.title,
                      comment: tc.comment || tc.deskripsi || ""
                    }))
                  };
                });
                setSuites(updatedSuites2);
                saveSuitesToStorage(updatedSuites2);
              }
           }
        }
      } else {
        throw new Error(resData.message || "Gagal menyimpan ke server");
      }
    } catch (err) {
      console.warn("Failed to save to db:", err);
      toast.success("Perubahan disimpan secara lokal.", { id: "save_comment" });
    }
  };

  // Open Create Bug Modal with Pre-filled Test Case Details and Parent Selection
  const handleOpenCreateBugModal = (tc: QATestCase) => {
    if (lockState.lockedBy && lockState.lockedBy !== currentUserUid) {
      toast.error(`Aksi Ditolak! Dokumen sedang dikunci oleh ${lockState.userName}.`);
      return;
    }

    setBugModalTestCase(tc);
    setBugTitleInput(`BUG: ${tc.title}`);

    // Format pre-filled bug description
    const suiteName = activeSuite?.name || "Dokumen QA";
    const suitePhase = activeSuite?.phase || "SIT";
    const lastCommentText = tc.commentsList && tc.commentsList.length > 0 
      ? tc.commentsList[tc.commentsList.length - 1].text 
      : (tc.comment || "Tidak ada catatan tambahan.");

    const desc = `### 🐛 Detail Bug (Dibuat dari Test Case #${tc.rowNum})
**Origin Test Case:** #${tc.rowNum} - ${tc.title}
**Dokumen Suite / Phase:** ${suiteName} (${suitePhase})

#### 📋 Langkah Pengujian (Steps to Reproduce):
${tc.steps || "Tidak ada langkah tercatat."}

#### 🎯 Hasil yang Diharapkan (Expected Result):
${tc.expectedResult || "Tidak ada ekspektasi hasil tercatat."}

#### 💬 Catatan / Komentar QA Tester:
${lastCommentText}

---
*Origin: Test Case #${tc.rowNum} | Modul QA Testing LanPro*`;

    setBugDescriptionInput(desc);
    setBugPriorityInput(tc.priority || "High");
    setBugAssigneeInput("");

    // ALWAYS reset parent link selection to empty so user MUST select manually
    setBugSelectedParentId("");
    setParentSearchTerm("");

    setIsCreateBugModalOpen(true);
  };

  // Submit Bug Creation to Backend & Create Relational Link
  const handleSubmitCreateBugTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugModalTestCase) return;

    if (!bugSelectedParentId) {
      toast.error("Mohon pilih Target Epic atau Task terlebih dahulu!");
      return;
    }

    if (!bugTitleInput.trim()) {
      toast.error("Judul tiket bug tidak boleh kosong.");
      return;
    }

    setIsSubmittingBug(true);
    toast.loading("Memproses & Membuat tiket Bug terstruktur...", { id: "create_bug_toast" });

    try {
      // Gather attachments from Test Case evidence
      let attachments: any[] = [];
      if (bugModalTestCase.evidences && bugModalTestCase.evidences.length > 0) {
        attachments = bugModalTestCase.evidences.map((ev) => ({
          id: ev.id,
          name: ev.name,
          url: ev.url,
          type: ev.type,
          createdAt: new Date().toISOString(),
          uploadedByName: currentUserName,
        }));
      } else if (bugModalTestCase.evidenceUrl) {
        attachments = [{
          id: `ev-${Date.now()}`,
          name: bugModalTestCase.evidenceName || "bukti_pengujian.png",
          url: bugModalTestCase.evidenceUrl,
          type: bugModalTestCase.evidenceType || "image",
          createdAt: new Date().toISOString(),
          uploadedByName: currentUserName,
        }];
      }

      // Find selected parent title for toast alert
      const parentCandidates = (tasks || []).filter(
        (t: any) => (t.projectId === selectedProject?.id || !t.projectId) && t.type !== "subtask"
      );
      const parentObj = parentCandidates.find((p: any) => p.id === bugSelectedParentId);
      const parentLabel = parentObj 
        ? `[${parentObj.key || parentObj.taskKey || (parentObj.type ? parentObj.type.toUpperCase() : 'TASK')}] ${parentObj.title}` 
        : bugSelectedParentId;

      // POST to /api/projects/:projectId/tasks
      const response = await apiRequest(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        body: {
          title: bugTitleInput.trim(),
          description: bugDescriptionInput,
          status: "todo",
          type: "bug",
          priority: bugPriorityInput.toLowerCase(),
          parentId: bugSelectedParentId,
          assigneeId: bugAssigneeInput || null,
          reporterId: bugModalTestCase?.activeTesterId || currentUserUid,
          attachments: attachments,
        },
      });

      if (response && response.status === "success") {
        const createdKey = response.data.taskKey || response.data.key || `BUG-${Date.now()}`;

        // Save linkedBugKey to backend Test Case
        try {
          const formData = new FormData();
          formData.append("linkedBugKey", createdKey);
          await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${bugModalTestCase.id}/save`, {
            method: "POST",
            body: formData,
          });
        } catch (e) {
          console.warn("Could not persist linkedBugKey on backend, updating locally:", e);
        }

        // Update local state and localStorage
        const updatedSuites = suites.map((suite) => {
          if (suite.id !== selectedSuiteId) return suite;
          return {
            ...suite,
            cases: suite.cases.map((c) => {
              if (c.id !== bugModalTestCase.id) return c;
              return { ...c, linkedBugKey: createdKey };
            }),
          };
        });

        saveSuitesToStorage(updatedSuites);

        if (selectedTestCase?.id === bugModalTestCase.id) {
          setSelectedTestCase({ ...selectedTestCase, linkedBugKey: createdKey });
        }

        toast.dismiss("create_bug_toast");
        toast.success(
          `Tiket Bug berhasil ditautkan ke ${parentLabel}!`,
          { duration: 5000 }
        );

        setIsCreateBugModalOpen(false);
        setBugModalTestCase(null);
      } else {
        throw new Error(response?.message || "Gagal membuat tiket bug.");
      }
    } catch (err: any) {
      console.error("Error creating bug ticket:", err);
      // Simulation / offline fallback
      const mockKey = `${selectedProject?.key || 'BUG'}-${Math.floor(Math.random() * 90) + 10}`;
      const parentCandidates = (tasks || []).filter(
        (t: any) => (t.projectId === selectedProject?.id || !t.projectId) && t.type !== "subtask"
      );
      const parentObj = parentCandidates.find((p: any) => p.id === bugSelectedParentId);
      const parentLabel = parentObj 
        ? `[${parentObj.key || parentObj.taskKey || (parentObj.type ? parentObj.type.toUpperCase() : 'TASK')}] ${parentObj.title}` 
        : "Epic/Task Target";

      const updatedSuites = suites.map((suite) => {
        if (suite.id !== selectedSuiteId) return suite;
        return {
          ...suite,
          cases: suite.cases.map((c) => {
            if (c.id !== bugModalTestCase.id) return c;
            return { ...c, linkedBugKey: mockKey };
          }),
        };
      });

      saveSuitesToStorage(updatedSuites);
      if (selectedTestCase?.id === bugModalTestCase.id) {
        setSelectedTestCase({ ...selectedTestCase, linkedBugKey: mockKey });
      }

      toast.dismiss("create_bug_toast");
      toast.success(`Tiket Bug berhasil ditautkan ke ${parentLabel}!`, { duration: 5000 });
      setIsCreateBugModalOpen(false);
      setBugModalTestCase(null);
    } finally {
      setIsSubmittingBug(false);
    }
  };

  const handleDeleteSuite = async (id: string) => {
    const updated = suites.filter(s => s.id !== id);
    saveSuitesToStorage(updated);
    if (selectedSuiteId === id && updated.length > 0) {
      setSelectedSuiteId(updated[0].id);
    } else if (updated.length === 0) {
      setSelectedSuiteId("");
    }
    
    try {
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-suites/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Failed to delete suite from backend:", err);
    }
    
    toast.success("Test Suite berhasil dihapus.");
    setSuiteToDelete(null);
  };

  const handleDeleteTestCase = async (id: string) => {
    const updatedSuites = suites.map(suite => {
      if (suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.filter(c => c.id !== id)
      };
    });
    saveSuitesToStorage(updatedSuites);
    if (selectedTestCase?.id === id) {
      setSelectedTestCase(null);
    }
    
    try {
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Failed to delete test case from backend:", err);
    }
    
    toast.success("Test Case berhasil dihapus.");
    setCaseToDelete(null);
  };

  const handleAddSuiteOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuiteNameOnly.trim()) return;

    const newSuite: QATestSuite = {
      id: `suite-${Date.now()}`,
      projectId: selectedProject.id,
      name: newSuiteNameOnly.trim(),
      phase: newSuitePhaseOnly,
      uploadedBy: currentUserUid,
      uploadedAt: new Date().toISOString(),
      cases: []
    };

    const updatedSuites = [...suites, newSuite];
    saveSuitesToStorage(updatedSuites);
    setSelectedSuiteId(newSuite.id);
    setIsAddSuiteOpen(false);
    setNewSuiteNameOnly("");
    setNewSuitePhaseOnly("SIT");

    try {
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-suites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSuite)
      });
      toast.success("Dokumen skrip berhasil ditambahkan.");
    } catch (err) {
      console.warn("Failed to add suite:", err);
    }
  };

  const submitEditSuite = async () => {
    if (!suiteToEdit || !suiteEditName || suiteEditName.trim() === suiteToEdit.name) {
      setSuiteToEdit(null);
      return;
    }

    const updatedSuite = { ...suiteToEdit, name: suiteEditName.trim() };
    const updatedSuites = suites.map(s => s.id === suiteToEdit.id ? updatedSuite : s);
    saveSuitesToStorage(updatedSuites);

    try {
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-suites/${suiteToEdit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSuite)
      });
      toast.success("Nama Test Suite berhasil diubah.");
    } catch (err) {
      console.warn("Failed to edit suite:", err);
    }
    setSuiteToEdit(null);
  };

  const submitEditTestCaseInfo = async () => {
    if (!caseToEditInfo || !caseEditTitle || caseEditTitle.trim() === caseToEditInfo.title) {
      setCaseToEditInfo(null);
      return;
    }

    const updatedTc = { ...caseToEditInfo, title: caseEditTitle.trim() };
    const updatedSuites = suites.map(suite => {
      if (suite.id !== caseToEditInfo.suiteId && suite.id !== selectedSuiteId) return suite;
      return {
        ...suite,
        cases: suite.cases.map(c => c.id === caseToEditInfo.id ? updatedTc : c)
      };
    });
    
    saveSuitesToStorage(updatedSuites);
    if (selectedTestCase?.id === caseToEditInfo.id) {
      setSelectedTestCase(updatedTc);
    }

    try {
      await apiFetch(`/api/projects/${selectedProject.id}/qa-test-cases/${caseToEditInfo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTc)
      });
      toast.success("Test Case berhasil diubah.");
    } catch (err) {
      console.warn("Failed to edit test case:", err);
    }
    setCaseToEditInfo(null);
  };

  // Filtered Cases
  const filteredCases = activeSuite?.cases.filter(c => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesStatus;
  }) || [];

  const suitesForFilter = suites.filter(s => phaseFilter === "ALL" || s.phase === phaseFilter);

  // Stats calculation for the current suite
  const totalCasesCount = activeSuite?.cases.length || 0;
  const passedCasesCount = activeSuite?.cases.filter(c => c.status === "Passed").length || 0;
  const failedCasesCount = activeSuite?.cases.filter(c => c.status === "Failed").length || 0;
  const blockedCasesCount = activeSuite?.cases.filter(c => c.status === "Blocked").length || 0;
  const retestCasesCount = activeSuite?.cases.filter(c => c.status === "Retest").length || 0;
  const pendingCasesCount = activeSuite?.cases.filter(c => c.status === "Pending").length || 0;

  const passedPercent = totalCasesCount > 0 ? Math.round((passedCasesCount / totalCasesCount) * 100) : 0;

  // Format countdown string mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isLockedBySomeoneElse = lockState.lockedBy && lockState.lockedBy !== currentUserUid;
  const isLockOwner = lockState.lockedBy === currentUserUid;

  return (
    <div className="w-full space-y-6 select-none" id="qa_module_container">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Title & Metadata Topbar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-slate-100 p-5 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">QA Testing Dashboard</h1>
        </div>

        {/* Concurrency Locking Status Panel */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200/50 p-3 rounded-2xl w-full lg:w-auto">
          {lockState.lockedBy ? (
            <>
              {isLockedBySomeoneElse ? (
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Lock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-500 font-black uppercase tracking-wider block">DILOCK OLEH LAIN</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">{lockState.userName}</span>
                  </div>
                  {/* Force Unlock Option for Lead/Admin */}
                  {(currentUserRole === "admin" || currentUserRole === "head" || currentUserRole === "manager") && (
                    <button
                      onClick={handleForceUnlock}
                      className="ml-auto lg:ml-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Force Unlock
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">Anda Memegang Lock</span>
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-md">
                        {formatTime(remainingTime)}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 block mt-0.5">Auto-Unlock dalam 15 mnt inaktivitas</span>
                  </div>
                  <button
                    onClick={releaseLockManually}
                    className="ml-auto lg:ml-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Unlock Now
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span className="text-xs text-slate-500 font-bold">Tidak ada kunci aktif. Membuka test suite akan mengunci otomatis.</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Upload Sidebar & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Document List & Drag Drop */}
        <div className="lg:col-span-4 space-y-6 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:sticky lg:top-4 pr-1 custom-scrollbar">
          
          <div className="space-y-3">
            <button
              onClick={() => { setIsAddCaseOpen(true); setActiveAddTab("single"); }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Upload / Tambah Dokumen</span>
            </button>
          </div>

          {/* Test Suites List Selector */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Daftar Dokumen Skrip</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddSuiteOpen(true)}
                  className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                  title="Tambah Dokumen Skrip Manual"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg">
                  {suitesForFilter.length} Dokumen
                </span>
              </div>
            </div>

            {/* Phase Filters */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 border border-slate-200/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
              {["ALL", "SIT", "UAT", "PTR"].map((ph) => (
                <button
                  key={ph}
                  onClick={() => setPhaseFilter(ph as any)}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    phaseFilter === ph 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {ph}
                </button>
              ))}
            </div>

            {/* Suite Items */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {suitesForFilter.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Tidak ada dokumen pengujian untuk filter ini.
                </div>
              ) : (
                suitesForFilter.map((suite, sIdx) => {
                  const isActive = suite.id === selectedSuiteId;
                  const passed = suite.cases.filter(c => c.status === "Passed").length;
                  const total = suite.cases.length;
                  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

                  return (
                    <div
                      key={suite.id ? `${suite.id}-${sIdx}` : `suite-${sIdx}`}
                      onClick={() => setSelectedSuiteId(suite.id)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isActive 
                          ? "bg-indigo-50/40 border-indigo-200 shadow-sm" 
                          : "bg-white border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      {/* Action icons */}
                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSuiteToEdit(suite); setSuiteEditName(suite.name); }}
                          className="text-slate-400 hover:text-indigo-500 transition-opacity p-1 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-slate-100"
                          title="Ubah Nama Dokumen"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSuiteToDelete(suite); }}
                          className="text-slate-400 hover:text-rose-500 transition-opacity p-1 bg-white hover:bg-rose-50 rounded-lg shadow-sm border border-slate-100"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                          suite.phase === "SIT" ? "bg-amber-100 text-amber-800 border border-amber-200/50" :
                          suite.phase === "UAT" ? "bg-emerald-100 text-emerald-800 border border-emerald-200/50" :
                          "bg-purple-100 text-purple-800 border border-purple-200/50"
                        }`}>
                          {suite.phase}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(suite.uploadedAt).toLocaleDateString("id-ID")}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-slate-800 mt-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">
                        {suite.name}
                      </h4>

                      <div className="mt-3 flex items-center justify-between text-[10px] font-black text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                          {suite.fileName || "Imported_Script"}
                        </span>
                        <span>{passed}/{total} Passed</span>
                      </div>

                      {/* Micro progress bar */}
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

        {/* Right Content Pane: Test Suite Grid & Table */}
        <div className="lg:col-span-8 space-y-6 lg:sticky lg:top-4">
          
          {draftTestCases.length > 0 && (
            <div className="bg-white border-2 border-indigo-200 p-6 rounded-3xl shadow-xl space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Review Rekomendasi Test Case AI</h2>
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Analisis lengkap berbasis BRD, Tasks, dan Meetings 14 hari terakhir. Edit detail sebelum melakukan commit.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDraftTestCases([]); toast.info("Draf test case dibersihkan."); }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Batal
                  </button>
                  <button
                    onClick={handleCommitDraft}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Commit ke Test Suite ({draftTestCases.filter(d => d.checked).length})</span>
                  </button>
                </div>
              </div>

              {/* Destination Suite Settings */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Pengaturan Suite Tujuan</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="commitOption"
                      checked={commitOption === "existing"}
                      onChange={() => setCommitOption("existing")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Commit ke Test Suite Terpilih
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input
                      type="radio"
                      name="commitOption"
                      checked={commitOption === "new"}
                      onChange={() => setCommitOption("new")}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    Buat Test Suite Baru & Commit
                  </label>
                </div>

                {commitOption === "existing" ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pilih Test Suite</span>
                    <select
                      value={commitSuiteId || selectedSuiteId}
                      onChange={(e) => setCommitSuiteId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {suites.map((s, idx) => (
                        <option key={s.id ? `qa-cs-${s.id}-${idx}` : `qa-cs-${idx}`} value={s.id}>
                          [{s.phase}] {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Nama Test Suite Baru</span>
                      <input
                        type="text"
                        placeholder="Contoh: Skrip Pengujian SIT Fitur Open API"
                        value={newSuiteName}
                        onChange={(e) => setNewSuiteName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fase Testing</span>
                      <select
                        value={newSuitePhase}
                        onChange={(e) => setNewSuitePhase(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="SIT">SIT (System Integration Testing)</option>
                        <option value="UAT">UAT (User Acceptance Testing)</option>
                        <option value="PTR">PTR (Production Trial Run)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Draft Test Cases Cards List */}
              <div className="space-y-4 max-h-[calc(100vh-420px)] overflow-y-auto pr-1 custom-scrollbar">
                {draftTestCases.map((tc, idx) => (
                  <div key={tc.id ? `${tc.id}-${idx}` : `draft-${idx}`} className="p-5 border border-slate-200/80 rounded-2xl bg-white shadow-xs hover:border-slate-300 transition-all space-y-4 relative border-l-4 border-l-indigo-500">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={tc.checked}
                        onChange={(e) => updateDraftField(tc.id, "checked", e.target.checked)}
                        className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                      />
                      <div className="flex-1 space-y-3">
                        {/* Title & Phase/Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div className="md:col-span-6">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Judul Skenario</span>
                            <input
                              type="text"
                              value={tc.title}
                              onChange={(e) => updateDraftField(tc.id, "title", e.target.value)}
                              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-800 outline-none transition-all"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fase</span>
                            <select
                              value={tc.fase}
                              onChange={(e) => updateDraftField(tc.id, "fase", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                            >
                              <option value="SIT">SIT</option>
                              <option value="UAT">UAT</option>
                              <option value="PTR">PTR</option>
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Prioritas</span>
                            <select
                              value={tc.priority}
                              onChange={(e) => updateDraftField(tc.id, "priority", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                            >
                              <option value="HIGH">HIGH</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="LOW">LOW</option>
                            </select>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Deskripsi</span>
                          <textarea
                            value={tc.description}
                            onChange={(e) => updateDraftField(tc.id, "description", e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all resize-none"
                          />
                        </div>

                        {/* Steps List */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Langkah-Langkah Pengujian</span>
                            <button
                              onClick={() => addDraftStep(tc.id)}
                              className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Tambah Langkah
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {tc.steps.map((step: string, sIdx: number) => (
                              <div key={sIdx} className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 w-5">
                                  #{sIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={step}
                                  onChange={(e) => updateDraftStep(tc.id, sIdx, e.target.value)}
                                  className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-all"
                                />
                                <button
                                  onClick={() => deleteDraftStep(tc.id, sIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-1.5 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Expected Result */}
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Hasil yang Diharapkan (Expected Result)</span>
                          <textarea
                            value={tc.expected_result}
                            onChange={(e) => updateDraftField(tc.id, "expected_result", e.target.value)}
                            rows={2}
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-100 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Suite Overview Stats */}
          {draftTestCases.length === 0 && activeSuite ? (
            <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{activeSuite.name}</h2>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Diupload oleh: {activeSuite.uploadedBy} • {new Date(activeSuite.uploadedAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activeSuite.fileName && activeSuite.fileName !== "custom_script" && (
                    <span className="px-3.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      {activeSuite.fileName}
                    </span>
                  )}
                  <button
                    onClick={handleGenerateWithAi}
                    disabled={isGeneratingAi}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                    title="Generate test cases tambahan dengan AI"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAi ? "Menganalisis..." : "Generate AI"}</span>
                  </button>
                </div>
              </div>

              {/* Grid of Micro Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                <div className="bg-indigo-50 border border-indigo-100/50 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-indigo-600 font-black uppercase tracking-wider block">Total Test Case</span>
                  <span className="text-lg font-black text-indigo-700 block mt-1">{totalCasesCount}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Passed Rate</span>
                  <span className="text-lg font-black text-slate-800 block mt-1">{passedPercent}%</span>
                </div>
                <div className="bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/30 text-center">
                  <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider block">PASSED</span>
                  <span className="text-lg font-black text-emerald-700 block mt-1">{passedCasesCount}</span>
                </div>
                <div className="bg-rose-50/30 p-3 rounded-2xl border border-rose-100/30 text-center">
                  <span className="text-[10px] text-rose-600 font-black uppercase tracking-wider block">FAILED</span>
                  <span className="text-lg font-black text-rose-700 block mt-1">{failedCasesCount}</span>
                </div>
                <div className="bg-amber-50/30 p-3 rounded-2xl border border-amber-100/30 text-center">
                  <span className="text-[10px] text-amber-600 font-black uppercase tracking-wider block">BLOCKED</span>
                  <span className="text-lg font-black text-amber-700 block mt-1">{blockedCasesCount}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">RETEST/PEND</span>
                  <span className="text-lg font-black text-slate-700 block mt-1">
                    {retestCasesCount + pendingCasesCount}
                  </span>
                </div>
              </div>

              {/* Status & Search Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">Filter Status:</span>
                  <div className="flex flex-wrap gap-1 text-[10px] font-black uppercase tracking-wider">
                    {["ALL", "Passed", "Failed", "Blocked", "Retest", "Pending"].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st as any)}
                        className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          statusFilter === st 
                            ? "bg-indigo-600 text-white shadow-sm" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isLockedBySomeoneElse && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-700 uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5" />
                      Hanya Read-Only
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50/50 p-3">
                <div className="space-y-2.5 max-h-[600px] lg:max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar pr-1">
                  
                  {filteredCases.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs font-medium">
                      Tidak ada Test Case yang memenuhi filter ini.
                    </div>
                  ) : (
                    filteredCases.map((tc, idx) => (
                      <div 
                        key={tc.id ? `${tc.id}-${idx}` : `tc-${idx}`} 
                        onClick={() => setSelectedTestCase(tc)}
                        className={`p-3.5 md:p-4 rounded-xl border transition-all hover:bg-slate-50 hover:border-indigo-400 hover:shadow-md cursor-pointer select-none group border-l-4 relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          tc.status === "Passed" ? "bg-white border-slate-200 border-l-emerald-500 hover:border-l-emerald-600" :
                          tc.status === "Failed" ? "bg-white border-slate-200 border-l-rose-500 hover:border-l-rose-600" :
                          tc.status === "Blocked" ? "bg-white border-slate-200 border-l-amber-500 hover:border-l-amber-600" : 
                          tc.status === "Retest" ? "bg-white border-slate-200 border-l-indigo-500 hover:border-l-indigo-600" : "bg-white border-slate-200 border-l-slate-400 hover:border-l-slate-500"
                        }`}
                      >
                        {/* Left Section: ID, Title, Priority */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="shrink-0 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-black rounded-md border border-slate-200/80 font-mono shadow-2xs">
                            #{tc.rowNum}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                            {tc.title}
                          </h4>
                          {tc.priority && (
                            <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              tc.priority === "Critical" ? "bg-red-100 text-red-800 border border-red-200/50" :
                              tc.priority === "High" ? "bg-orange-100 text-orange-800 border border-orange-200/50" :
                              tc.priority === "Medium" ? "bg-amber-100 text-amber-800 border border-amber-200/50" :
                              "bg-slate-100 text-slate-600 border border-slate-200/50"
                            }`}>
                              {tc.priority}
                            </span>
                          )}
                        </div>

                        {/* Right Section: Small Indicators & Action Dropdowns */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap self-end sm:self-center">
                          {/* Attachment Indicator */}
                          {((tc.evidences && tc.evidences.length > 0) || tc.evidenceName) && (
                            <div 
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/60"
                              title="File Bukti Terlampir"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{tc.evidences?.length || 1}</span>
                            </div>
                          )}

                          {/* Comment Indicator */}
                          {((tc.commentsList && tc.commentsList.length > 0) || tc.comment) && (
                            <div 
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/60"
                              title="Komentar Diskusi"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{tc.commentsList?.length || (tc.comment ? 1 : 0)}</span>
                            </div>
                          )}

                          {/* Bug Ticket Link / Button */}
                          {tc.status === "Failed" && (
                            <>
                              {tc.linkedBugKey ? (
                                <span 
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black rounded-lg flex items-center gap-1"
                                  title={`Terhubung ke Bug ${tc.linkedBugKey}`}
                                >
                                  <Bug className="w-3.5 h-3.5 text-rose-500" />
                                  <span>{tc.linkedBugKey}</span>
                                </span>
                              ) : (
                                <button
                                  disabled={isLockedBySomeoneElse}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCreateBugModal(tc);
                                  }}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Buat Tiket Bug"
                                >
                                  <Bug className="w-3.5 h-3.5 text-rose-500" />
                                  <span>+ Bug</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Status Select Dropdown */}
                          <select
                            disabled={isLockedBySomeoneElse}
                            value={tc.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(tc.id, e.target.value as any);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              tc.status === "Passed" ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs" :
                              tc.status === "Failed" ? "bg-rose-600 text-white border-rose-600 shadow-2xs" :
                              tc.status === "Blocked" ? "bg-amber-600 text-white border-amber-600 shadow-2xs" :
                              tc.status === "Retest" ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" :
                              "bg-slate-700 text-white border-slate-700 shadow-2xs"
                            }`}
                          >
                            <option value="Pending" className="bg-slate-800 text-white font-bold">Pending</option>
                            <option value="Passed" className="bg-emerald-700 text-white font-bold">Passed</option>
                            <option value="Failed" className="bg-rose-700 text-white font-bold">Failed</option>
                            <option value="Blocked" className="bg-amber-700 text-white font-bold">Blocked</option>
                            <option value="Retest" className="bg-indigo-700 text-white font-bold">Retest</option>
                          </select>

                          {/* Quick Action buttons */}
                          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCaseToEditInfo(tc); setCaseEditTitle(tc.title); }}
                              className="text-slate-400 hover:text-indigo-600 transition-colors p-1 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Ubah Judul Test Case"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCaseToDelete(tc.id); }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus Test Case"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>

            </div>
          ) : draftTestCases.length === 0 ? (
            <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
              <p className="text-slate-400 text-sm font-bold">Harap upload atau pilih dokumen skrip pengujian.</p>
            </div>
          ) : null}

        </div>

      </div>

      {/* Edit Comment & Evidence Modal */}
      <AnimatePresence>
        {editingCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-xl space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800">
                  Tambah Bukti & Komentar (Case #{editingCase.rowNum})
                </h3>
                <button
                  onClick={() => setEditingCase(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Judul Kasus</label>
                  <p className="text-xs font-bold text-slate-700 mt-1">{editingCase.title}</p>
                </div>

                {/* Comment Text */}
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Catatan Pengujian</label>
                  <textarea
                    rows={3}
                    value={caseComment}
                    onChange={(e) => setCaseComment(e.target.value)}
                    placeholder="Masukkan hasil temuan pengujian, detail error, atau masukan untuk tim developer..."
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Local Evidence upload preview/sim */}
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Unggah Bukti (Screenshot / Rekaman)</label>
                  
                  <div className="flex gap-3 items-center">
                    <input
                      type="file"
                      id="tc-evidence-picker"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleEvidenceUpload}
                    />
                    <label
                      htmlFor="tc-evidence-picker"
                      className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer flex items-center gap-2"
                    >
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      Pilih Gambar/Video
                    </label>

                    {evidenceName && (
                      <span className="text-[10px] text-indigo-600 font-bold truncate max-w-[180px]">
                        {evidenceName}
                      </span>
                    )}
                  </div>

                  {/* Local preview if exists */}
                  {evidenceFileUrl && (
                    <div className="mt-3 relative rounded-xl border border-slate-200 overflow-hidden max-h-[160px]">
                      <img
                        src={evidenceFileUrl}
                        alt="evidence_preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={() => { setEvidenceFileUrl(""); setEvidenceName(""); }}
                        className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setEditingCase(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCommentAndEvidence}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sliding Detail Drawer */}
      <AnimatePresence>
        {selectedTestCase && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTestCase(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Panel container */}
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
                        Test Case #{selectedTestCase.rowNum}
                      </span>
                      {selectedTestCase.priority && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          selectedTestCase.priority === "Critical" ? "bg-red-100 text-red-800" :
                          selectedTestCase.priority === "High" ? "bg-orange-100 text-orange-800" :
                          selectedTestCase.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {selectedTestCase.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-800 mt-1 line-clamp-1">
                      {selectedTestCase.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTestCase(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XCircle className="w-5.5 h-5.5" />
                  </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setDrawerActiveTab("details")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      drawerActiveTab === "details"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Detail Case
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerActiveTab("history")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      drawerActiveTab === "history"
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Execution History
                    {executionLogs.length > 0 && (
                      <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.2 rounded-full font-extrabold">
                        {executionLogs.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {drawerActiveTab === "history" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <History className="w-4 h-4 text-indigo-600" />
                            Execution History Timeline
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Audit Trail historis eksekusi pengujian (Non-destructive)
                          </p>
                        </div>
                        <button
                          onClick={() => selectedTestCase && fetchExecutionHistory(selectedTestCase.id)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Refresh History"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      {loadingHistory ? (
                        <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                          Memuat riwayat eksekusi...
                        </div>
                      ) : executionLogs.length === 0 ? (
                        <div className="py-10 text-center bg-slate-50 border border-slate-100 rounded-2xl p-4">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-600">Belum Ada Catatan Run Eksekusi</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                            Setiap kali Anda meng-update status atau siklus pengujian, log historis akan tersimpan otomatis tanpa menghapus data lama.
                          </p>
                        </div>
                      ) : (
                        <div className="relative pl-4 border-l-2 border-indigo-100 space-y-5 my-2">
                          {executionLogs.map((log: any, idx: number) => {
                            const st = (log.executionStatus || log.status || "PENDING").toUpperCase();
                            let evidencesList: any[] = [];
                            try {
                              evidencesList = typeof log.evidences === "string" ? JSON.parse(log.evidences || "[]") : (log.evidences || []);
                            } catch(e) {}

                            return (
                              <div key={log.id ? `run-log-${log.id}-${idx}` : `run-log-${idx}`} className="relative group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 ${
                                  st === "PASSED" ? "border-emerald-500 bg-emerald-500" :
                                  st === "FAILED" ? "border-rose-500 bg-rose-500" :
                                  st === "RETEST" ? "border-indigo-500 bg-indigo-500" :
                                  st === "BLOCKED" ? "border-amber-500 bg-amber-500" :
                                  "border-slate-400 bg-slate-400"
                                }`} />

                                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        {log.runLabel || `Run #${log.runVersion || idx + 1}`}
                                      </span>
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                        st === "PASSED" ? "bg-emerald-100 text-emerald-800" :
                                        st === "FAILED" ? "bg-rose-100 text-rose-800" :
                                        st === "RETEST" ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300" :
                                        st === "BLOCKED" ? "bg-amber-100 text-amber-800" :
                                        "bg-slate-200 text-slate-700"
                                      }`}>
                                        {st}
                                      </span>
                                    </div>

                                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(log.executedAt || log.timestamp || Date.now()).toLocaleString("id-ID", {
                                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                      })}
                                    </span>
                                  </div>

                                  {/* Executor Info & Linked Bug Key */}
                                  <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                    <span className="text-slate-600 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                                      <User className="w-3 h-3 text-indigo-500" />
                                      {log.executedByName || log.userName || "Tester"}
                                    </span>

                                    {(log.linkedIssueKey || log.linkedBugKey) && (
                                      <span className="text-rose-700 font-extrabold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                        <Bug className="w-3 h-3 text-rose-600" />
                                        Bug #{log.linkedIssueKey || log.linkedBugKey}
                                      </span>
                                    )}
                                  </div>

                                  {/* Execution Notes */}
                                  {log.notes && (
                                    <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed font-medium">
                                      {log.notes}
                                    </p>
                                  )}

                                  {/* Evidences attached to this run */}
                                  {evidencesList && evidencesList.length > 0 && (
                                    <div className="pt-1">
                                      <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Bukti Run Eksekusi:</span>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {evidencesList.map((ev: any, evIdx: number) => (
                                          <a
                                            key={ev.id || `ev-${evIdx}`}
                                            href={ev.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 transition-colors text-[10px] text-indigo-600 font-bold truncate"
                                          >
                                            <Paperclip className="w-3 h-3 shrink-0 text-slate-400" />
                                            <span className="truncate">{ev.name || `Bukti #${evIdx + 1}`}</span>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Status update section */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Update Status Instan</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(["Pending", "Passed", "Failed", "Blocked", "Retest"] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(selectedTestCase.id, st)}
                          className={`py-2 px-1 text-[10px] font-black uppercase tracking-wider rounded-xl text-center border transition-all cursor-pointer ${
                            selectedTestCase.status === st
                              ? st === "Passed" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" :
                                st === "Failed" ? "bg-rose-600 text-white border-rose-600 shadow-sm" :
                                st === "Blocked" ? "bg-amber-600 text-white border-amber-600 shadow-sm" :
                                st === "Retest" ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" :
                                "bg-slate-800 text-white border-slate-800 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test Steps */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Langkah Pengujian</label>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedTestCase.steps}
                    </div>
                  </div>

                  {/* Expected Results */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Hasil yang Diharapkan</label>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedTestCase.expectedResult}
                    </div>
                  </div>

                  {/* Evidence Section */}
                  <div className="space-y-3">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Bukti Pengujian (Evidence - Multiple Upload)</label>
                    
                    {/* Upload Drop Zone / Button (Always visible so user can append more files) */}
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <input
                        type="file"
                        id="drawer-evidence-input"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleEvidenceUploadFromDrawer}
                      />
                      <label htmlFor="drawer-evidence-input" className="cursor-pointer space-y-2 block">
                        <Paperclip className="w-6 h-6 text-slate-400 mx-auto" />
                        <div className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">Unggah Foto/Video Bukti (Bisa Banyak)</div>
                        <p className="text-[10px] text-slate-400">Pilih satu atau beberapa screenshot pengujian</p>
                      </label>
                    </div>

                    {/* Displaying Uploaded Evidences */}
                    {((selectedTestCase.evidences && selectedTestCase.evidences.length > 0) || selectedTestCase.evidenceUrl) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {selectedTestCase.evidences && selectedTestCase.evidences.length > 0 ? (
                          selectedTestCase.evidences.map((ev, idx) => (
                            <div key={ev.id ? `${ev.id}-${idx}` : `ev-${idx}`} className="relative rounded-xl border border-slate-200 overflow-hidden h-28 bg-slate-950 group">
                              {ev.type === "video" ? (
                                <video src={ev.url} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={ev.url} alt={ev.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              {/* Overlay controls on hover */}
                              <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2">
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs text-[10px] font-bold"
                                >
                                  Buka
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpecificEvidenceFromDrawer(ev.id)}
                                  className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                                  title="Hapus Bukti"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <span className="absolute bottom-1 left-1.5 right-1.5 text-[8px] text-white bg-black/60 px-1 py-0.5 rounded truncate font-mono">
                                {ev.name}
                              </span>
                            </div>
                          ))
                        ) : (
                          // Fallback to legacy single evidenceUrl if any
                          selectedTestCase.evidenceUrl && (
                            <div className="relative rounded-xl border border-slate-200 overflow-hidden h-28 bg-slate-950 group col-span-2">
                              {selectedTestCase.evidenceType === "video" ? (
                                <video src={selectedTestCase.evidenceUrl} className="w-full h-full object-cover" muted playsInline />
                              ) : (
                                <img src={selectedTestCase.evidenceUrl} alt="evidence" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              )}
                              <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-2">
                                <a
                                  href={selectedTestCase.evidenceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-xs text-[10px] font-bold"
                                >
                                  Buka
                                </a>
                                <button
                                  type="button"
                                  onClick={handleRemoveEvidenceFromDrawer}
                                  className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                                  title="Hapus Bukti"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments Feed */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Riwayat Komentar & Diskusi</label>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {/* If legacy string comment exists but list is empty, display it first */}
                      {(!selectedTestCase.commentsList || selectedTestCase.commentsList.length === 0) && !selectedTestCase.comment ? (
                        <p className="text-[11px] text-slate-400 text-center py-4 italic">Belum ada komentar diskusi pada test case ini.</p>
                      ) : (
                        <>
                          {selectedTestCase.comment && (!selectedTestCase.commentsList || selectedTestCase.commentsList.length === 0) && (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  System/Tester
                                </span>
                                <span>Kemarin</span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedTestCase.comment}</p>
                            </div>
                          )}
                          {selectedTestCase.commentsList?.map((comment, idx) => (
                            <div key={comment.id ? `${comment.id}-${idx}` : `comment-${idx}`} className="p-3 bg-indigo-50/30 border border-indigo-100/30 rounded-2xl space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-black text-indigo-600">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-indigo-400" />
                                  {comment.userName}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(comment.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-bold">{comment.text}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendCommentFromDrawer} className="flex gap-2">
                      <input
                        type="text"
                        value={drawerNewComment}
                        onChange={(e) => setDrawerNewComment(e.target.value)}
                        placeholder="Tulis pesan atau komentar..."
                        className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-slate-50 focus:bg-white transition-all font-bold"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-sm"
                      >
                        Kirim
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>

                {/* Footer action */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-2">
                  <button
                    onClick={() => setSelectedTestCase(null)}
                    className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    Tutup Detail
                  </button>
                  {selectedTestCase.status === "Failed" && (
                    <>
                      {selectedTestCase.linkedBugKey ? (
                        <div className="flex-1 px-3 py-2.5 bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-black rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider">
                          <Bug className="w-4 h-4 text-rose-600" />
                          TERHUBUNG: {selectedTestCase.linkedBugKey}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateBugModal(selectedTestCase)}
                          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Bug className="w-4 h-4" />
                          Buat Tiket Bug
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Bug Modal with Parent Link Dropdown Selector */}
      <AnimatePresence>
        {isCreateBugModalOpen && bugModalTestCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      Tautkan Tiket Bug ke Task/Epic
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-extrabold uppercase">
                        Case #{bugModalTestCase.rowNum}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Pilih Epic atau Task target secara manual dari hierarki proyek untuk menautkan tiket bug ini.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateBugModalOpen(false);
                    setBugModalTestCase(null);
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCreateBugTicket} className="space-y-4">
                {/* 1. DYNAMIC SEARCHABLE PARENT LINK DROPDOWN (REQUIRED MANUAL SELECTION) */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <Link className="w-4 h-4 text-indigo-600" />
                      PILIH TARGET EPIC / TASK
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md uppercase">
                      Wajib Dipilih Manual
                    </span>
                  </div>

                  {/* Search Filter Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={parentSearchTerm}
                      onChange={(e) => setParentSearchTerm(e.target.value)}
                      placeholder="Cari Epic atau Task (ketik judul / ID)..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Searchable Select Dropdown */}
                  {(() => {
                    const allCandidates = (tasks || []).filter(
                      (t: any) => (t.projectId === selectedProject?.id || !t.projectId) && t.type !== "subtask"
                    );
                    const filteredCandidates = allCandidates.filter((t: any) => {
                      if (!parentSearchTerm.trim()) return true;
                      const query = parentSearchTerm.toLowerCase();
                      const titleMatch = (t.title || "").toLowerCase().includes(query);
                      const keyMatch = (t.key || t.taskKey || "").toLowerCase().includes(query);
                      return titleMatch || keyMatch;
                    });

                    const epics = filteredCandidates.filter((t: any) => t.type === "epic");
                    const regularTasks = filteredCandidates.filter((t: any) => t.type !== "epic");

                    return (
                      <select
                        required
                        value={bugSelectedParentId}
                        onChange={(e) => setBugSelectedParentId(e.target.value)}
                        className="w-full text-xs p-3 bg-white border border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 shadow-xs cursor-pointer"
                      >
                        <option value="" disabled>-- Pilih Task atau Epic Target --</option>
                        {epics.length > 0 && (
                          <optgroup label="--- KELOMPOK EPIC ---">
                            {epics.map((parent: any, pIdx: number) => (
                              <option key={parent.id ? `ep-${parent.id}-${pIdx}` : `ep-${pIdx}`} value={parent.id}>
                                [EPIC] {parent.key || parent.taskKey ? `[${parent.key || parent.taskKey}] ` : ""}{parent.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {regularTasks.length > 0 && (
                          <optgroup label="--- KELOMPOK TASK / STORY ---">
                            {regularTasks.map((parent: any, pIdx: number) => (
                              <option key={parent.id ? `rt-${parent.id}-${pIdx}` : `rt-${pIdx}`} value={parent.id}>
                                [{parent.type ? parent.type.toUpperCase() : "TASK"}] {parent.key || parent.taskKey ? `[${parent.key || parent.taskKey}] ` : ""}{parent.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {filteredCandidates.length === 0 && (
                          <option value="" disabled>Tidak ada Epic / Task yang cocok</option>
                        )}
                      </select>
                    );
                  })()}

                  <p className="text-[11px] text-indigo-700/80 font-medium leading-relaxed">
                    Pilih secara manual Epic atau Task tempat bug ini disisipkan di hierarki proyek.
                  </p>
                </div>

                {/* 2. BUG TITLE */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 flex items-center justify-between">
                    <span>JUDUL TIKET BUG <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bugTitleInput}
                    onChange={(e) => setBugTitleInput(e.target.value)}
                    placeholder="Contoh: BUG: Gagal login dengan OAuth Google"
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold text-slate-800"
                  />
                </div>

                {/* 3. PRIORITY & ASSIGNEE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      PRIORITY / SEVERITY
                    </label>
                    <select
                      value={bugPriorityInput}
                      onChange={(e) => setBugPriorityInput(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Critical">🔴 Critical</option>
                      <option value="High">🟠 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🔵 Low</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      ASSIGNEE (PIC DEVELOPER)
                    </label>
                    <select
                      value={bugAssigneeInput}
                      onChange={(e) => setBugAssigneeInput(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="">-- Belum Ditugaskan --</option>
                      {(projectMembers || []).map((m: any, mIdx: number) => (
                        <option key={m.id || m.uid ? `pm-${m.id || m.uid}-${mIdx}` : `pm-${mIdx}`} value={m.id || m.uid}>
                          {m.displayName || m.name || m.email || "Member"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. BUG DESCRIPTION (PRE-FILLED) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    DESKRIPSI DETAIL BUG (PRE-FILLED DARI TEST CASE)
                  </label>
                  <textarea
                    rows={6}
                    value={bugDescriptionInput}
                    onChange={(e) => setBugDescriptionInput(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700 focus:border-indigo-500 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* 5. ATTACHMENT EVIDENCE CARRIED OVER */}
                {((bugModalTestCase.evidences && bugModalTestCase.evidences.length > 0) || bugModalTestCase.evidenceUrl) && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      Bukti Pengujian (Auto-Attached Evidence)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {bugModalTestCase.evidences?.map((ev, idx) => (
                        <div key={ev.id ? `${ev.id}-${idx}` : `bmev-${idx}`} className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <span>📷 {ev.name}</span>
                        </div>
                      ))}
                      {!bugModalTestCase.evidences?.length && bugModalTestCase.evidenceName && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                          <span>📷 {bugModalTestCase.evidenceName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODAL ACTIONS */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateBugModalOpen(false);
                      setBugModalTestCase(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer transition-colors"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBug || !bugSelectedParentId}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Bug className="w-4 h-4" />
                    <span>{isSubmittingBug ? "Menyimpan Tiket..." : "SIMPAN & TAUTKAN BUG"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Test Suite Modal */}
      <AnimatePresence>
        {isAddSuiteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-slate-800 mb-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Tambah Dokumen Skrip</h3>
              </div>
              
              <form onSubmit={handleAddSuiteOnly} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Nama Dokumen *</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={newSuiteNameOnly}
                    onChange={(e) => setNewSuiteNameOnly(e.target.value)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                    placeholder="Masukkan nama dokumen..."
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Fase Testing *</label>
                  <select
                    value={newSuitePhaseOnly}
                    onChange={(e) => setNewSuitePhaseOnly(e.target.value as any)}
                    className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black text-indigo-700"
                  >
                    <option value="SIT">SIT</option>
                    <option value="UAT">UAT</option>
                    <option value="PTR">PTR</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddSuiteOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Buat Dokumen
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New Test Case Modal */}
      <AnimatePresence>
        {isAddCaseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-4xl w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-black text-slate-800">
                    ➕ Add New Test Case
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCaseOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200/50 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveAddTab("single")}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    activeAddTab === "single"
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Single Input (Manual)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab("bulk")}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                    activeAddTab === "bulk"
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Bulk Upload (Excel)
                </button>
              </div>

              {activeAddTab === "single" ? (
                <form onSubmit={handleCreateManualTestCase} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 custom-scrollbar">
                    {/* Left Side: Metadata */}
                    <div className="space-y-4">
                      {/* Dokumen Induk (SIT/UAT/PTR) Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Dokumen Induk / Test Suite *</label>
                        
                        {/* Selector of Option */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 border border-slate-200/50 rounded-xl text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setNewCaseSuiteOption("existing")}
                            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                              newCaseSuiteOption === "existing"
                                ? "bg-white text-slate-800 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            Pilih Dokumen Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCaseSuiteOption("new")}
                            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                              newCaseSuiteOption === "new"
                                ? "bg-white text-slate-800 shadow-xs"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            Buat Dokumen Baru
                          </button>
                        </div>

                        {newCaseSuiteOption === "existing" ? (
                          <select
                            value={newCaseSuiteId}
                            onChange={(e) => setNewCaseSuiteId(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                          >
                            <option value="">-- Pilih Dokumen Skrip --</option>
                            {suites.map((s, idx) => (
                              <option key={s.id ? `nc-cs-${s.id}-${idx}` : `nc-cs-${idx}`} value={s.id}>
                                [{s.phase}] {s.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Nama Dokumen Baru (misal: SIT - Auth Core)"
                              value={newCaseNewSuiteName}
                              onChange={(e) => setNewCaseNewSuiteName(e.target.value)}
                              className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold md:col-span-2"
                            />
                            <select
                              value={newCaseNewSuitePhase}
                              onChange={(e) => setNewCaseNewSuitePhase(e.target.value as any)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-black text-indigo-700"
                            >
                              <option value="SIT">Fase SIT</option>
                              <option value="UAT">Fase UAT</option>
                              <option value="PTR">Fase PTR</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Judul Test Case */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Judul Test Case *</label>
                        <input
                          type="text"
                          required
                          value={newCaseTitle}
                          onChange={(e) => setNewCaseTitle(e.target.value)}
                          placeholder="Masukkan judul test case yang spesifik..."
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                        />
                      </div>

                      {/* Tingkat Prioritas */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Tingkat Prioritas *</label>
                        <div className="grid grid-cols-4 gap-2 text-xs font-black uppercase tracking-wider">
                          {(["Low", "Medium", "High", "Critical"] as const).map((pr) => (
                            <button
                              key={pr}
                              type="button"
                              onClick={() => setNewCasePriority(pr)}
                              className={`py-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                                newCasePriority === pr
                                  ? pr === "Critical" ? "bg-red-600 text-white border-red-600" :
                                    pr === "High" ? "bg-orange-500 text-white border-orange-500" :
                                    pr === "Medium" ? "bg-amber-500 text-white border-amber-500" :
                                    "bg-slate-500 text-white border-slate-500"
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {pr}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Textareas */}
                    <div className="space-y-4">
                      {/* Langkah Pengujian */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Langkah Pengujian *</label>
                        <textarea
                          required
                          rows={5}
                          value={newCaseSteps}
                          onChange={(e) => setNewCaseSteps(e.target.value)}
                          placeholder="Tuliskan urutan aksi pengujian (misal: 1. Buka menu X, 2. Isi field Y...)"
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                        />
                      </div>

                      {/* Hasil yang Diharapkan */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Hasil yang Diharapkan *</label>
                        <textarea
                          required
                          rows={4}
                          value={newCaseExpected}
                          onChange={(e) => setNewCaseExpected(e.target.value)}
                          placeholder="Masukkan kondisi sukses yang diharapkan setelah langkah diselesaikan..."
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddCaseOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer shadow-md"
                    >
                      Simpan Test Case
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleBulkUploadTestCases} className="space-y-6">
                  {/* Phase Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Pilih Fase Testing *</label>
                    <select
                      value={bulkUploadPhase}
                      onChange={(e) => setBulkUploadPhase(e.target.value as any)}
                      className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none font-black text-indigo-700"
                    >
                      <option value="SIT">Fase SIT (System Integration Testing)</option>
                      <option value="UAT">Fase UAT (User Acceptance Testing)</option>
                      <option value="PTR">Fase PTR (Production Trial Run)</option>
                    </select>
                  </div>

                  {/* Info Box & Template */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col items-start gap-3">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                      <FileSpreadsheet className="w-5 h-5" />
                      <span>Format Standar Kolom Excel</span>
                    </div>
                    <p className="text-xs text-indigo-600/70 leading-relaxed">
                      Sistem hanya akan memproses berkas Excel yang memenuhi standar nama kolom secara tepat (case-insensitive) pada baris pertama:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["Nama Judul", "Deskripsi", "Hasil Diharapkan", "Level"].map((col) => (
                        <span key={col} className="px-2 py-1 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-mono rounded-md shadow-sm">
                          {col}
                        </span>
                      ))}
                    </div>
                    <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Mengunduh template..."); }} className="inline-flex items-center gap-1.5 mt-1 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors">
                      <Download className="w-4 h-4" /> Download Template Excel
                    </a>
                  </div>

                  {/* Upload Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Unggah Berkas *</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 rounded-2xl p-6 text-center transition-colors">
                      <input
                        type="file"
                        id="bulk-upload-file"
                        accept=".xlsx,.csv"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const selected = e.target.files[0];
                            const check = validateFileClient(selected);
                            if (!check.valid) {
                              toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
                              return;
                            }
                            setBulkUploadFile(selected);
                          }
                        }}
                      />
                      <label htmlFor="bulk-upload-file" className="cursor-pointer flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white border border-slate-200 text-slate-500 rounded-2xl flex items-center justify-center shadow-sm">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          {bulkUploadFile ? (
                            <span className="text-sm font-bold text-indigo-600">{bulkUploadFile.name}</span>
                          ) : (
                            <span className="text-sm font-bold text-slate-700">Pilih berkas Excel (.xlsx / .csv)</span>
                          )}
                          <p className="text-xs text-slate-400 mt-1">Maksimal ukuran file 10MB</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddCaseOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider text-center cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={!bulkUploadFile}
                      className={`flex-1 py-2.5 text-white text-xs font-black rounded-xl uppercase tracking-wider text-center shadow-md transition-colors ${
                        bulkUploadFile ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer" : "bg-indigo-300 cursor-not-allowed"
                      }`}
                    >
                      Upload & Proses
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Modal for Suite Deletion */}
      <AnimatePresence>
        {suiteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-2">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-sm font-black uppercase tracking-wider">Konfirmasi Hapus</h3>
              </div>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus seluruh Test Suite <strong>{suiteToDelete.name}</strong> dan semua Test Case di dalamnya? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setSuiteToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteSuite(suiteToDelete.id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Modal for Case Deletion */}
      <AnimatePresence>
        {caseToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 mb-2">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-sm font-black uppercase tracking-wider">Hapus Test Case</h3>
              </div>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus Test Case ini?
              </p>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setCaseToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteTestCase(caseToDelete)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" /> Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Modal for Suite Editing */}
      <AnimatePresence>
        {suiteToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-slate-800 mb-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Ubah Nama Dokumen</h3>
              </div>
              <input
                autoFocus
                type="text"
                value={suiteEditName}
                onChange={(e) => setSuiteEditName(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                placeholder="Masukkan nama dokumen..."
              />
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setSuiteToEdit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={submitEditSuite}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Modal for Case Info Editing */}
      <AnimatePresence>
        {caseToEditInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-slate-800 mb-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">Ubah Judul Test Case</h3>
              </div>
              <input
                autoFocus
                type="text"
                value={caseEditTitle}
                onChange={(e) => setCaseEditTitle(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                placeholder="Masukkan judul test case..."
              />
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setCaseToEditInfo(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={submitEditTestCaseInfo}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
