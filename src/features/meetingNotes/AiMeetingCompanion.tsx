import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import {
  Sparkles,
  Brain,
  ListChecks,
  Clock,
  UserCheck,
  Cpu,
  Lightbulb,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Database,
  Users,
  Info,
  Calendar,
  FileText,
  UploadCloud,
  X,
  XCircle,
  Search,
  Filter,
  Pencil,
  Save
} from "lucide-react";
import { toast } from "sonner";
import { validateFileClient } from "../../lib/fileSecurity";
import { apiRequest } from "../../lib/api";
import { createDiscussionPoint } from "../../services/meetingService";
import { type Meeting, type UserProfile, type DiscussionPoint } from "../../types";
import ReactMarkdown from 'react-markdown';

interface AiMeetingCompanionProps {
  projectId: string;
  meeting: Meeting;
  currentUser: UserProfile | null;
  projectMembers?: UserProfile[];
  onPointsImported?: () => void;
}

interface TopicChronology {
  topik: string;
  pembahasan: string;
}

interface ActionItem {
  concern: string;
  fitur?: string;
  system?: string;
  surrounding?: string;
  keterangan?: string;
  tindakanLanjut: string;
  PIC?: string;
  targetDate?: string;
}

interface NextPlanItem {
  tahapan: string;
  deskripsi: string;
  estimasi_waktu?: string;
}

interface ToBeScenario {
  kondisi_sekarang: string;
  target_ke_depan: string;
  langkah_transisi: string[];
}

interface KronologiDanKesimpulanItem {
  topik_bahasan: string;
  latar_belakang_argumen: string;
  keputusan_akhir: string;
}

interface TindakLanjutDanConcernItem {
  pembicara: string;
  kekhawatiran_spesifik: string;
  solusi_dan_arahan: string;
}

interface NextPlanRoadmapItem {
  action_item: string;
  pic: string;
  estimasi_waktu: string;
}

interface TargetToBeArchitecture {
  proses_bisnis_as_is: string;
  proses_bisnis_to_be: string;
  langkah_transisi: string[];
}

interface AiSummaryStructure {
  ringkasan_eksekutif?: string;
  kronologi_dan_kesimpulan?: KronologiDanKesimpulanItem[];
  tindak_lanjut_dan_concern?: TindakLanjutDanConcernItem[];
  next_plan_roadmap?: NextPlanRoadmapItem[];
  target_to_be_architecture?: TargetToBeArchitecture;

  // Legacy fallback fields so older meetings don't crash
  notulen_rapat: TopicChronology[];
  kesimpulan: string[];
  saran: string[];
  meeting_metadata: {
    topik_utama: string;
    tanggal_waktu?: string;
    peserta_aktif: string[];
  };
  poin_diskusi_tambahan: ActionItem[];
  next_plan?: NextPlanItem[];
  to_be_scenario?: ToBeScenario;
}

const mapToActiveMeetingData = (data: any) => {
  if (!data) return null;
  
  // If already in the new format
  if (data.tab_ringkasan) {
    return {
      tab_ringkasan: data.tab_ringkasan,
      tab_kronologi_rapat: data.tab_kronologi_rapat || [],
      tab_kesimpulan: data.tab_kesimpulan || [],
      tab_saran_dan_ide: data.tab_saran_dan_ide || [],
      tab_tindak_lanjut: data.tab_tindak_lanjut || [],
      tab_next_plan: data.tab_next_plan || [],
      tab_target_to_be: data.tab_target_to_be || { proses_bisnis_as_is: "", proses_bisnis_to_be: "", langkah_transisi: [] },
      tab_metadata: data.tab_metadata || { host_rapat: "Host", tanggal_rapat: "", durasi_detik: 0, platform_digunakan: "Zoom", peserta_rapat: [] }
    };
  }

  // Else, synthesize from older format keys
  const topik_utama = data.meeting_metadata?.topik_utama || "Koordinasi Proyek";
  const ringkasan = data.ringkasan_eksekutif || "Tidak ada ringkasan.";
  
  const tab_ringkasan = {
    topik_utama,
    executive_summary_multimodal: ringkasan
  };

  const tab_kronologi_rapat = (data.kronologi_dan_kesimpulan || data.notulen_rapat || []).map((item: any) => ({
    timestamp: item.topik_bahasan?.match(/\[(\d+:\d+)\]/)?.[1] || "00:00",
    aktivitas_visual: item.topik_bahasan?.replace(/\[\d+:\d+\]\s*(Visual:\s*)?/, "") || item.topik || "Presentasi",
    isi_percakapan_inti: item.latar_belakang_argumen || item.pembahasan || ""
  }));

  const tab_kesimpulan = data.kesimpulan || [];

  const tab_saran_dan_ide = (data.saran || []).map((item: string) => {
    const parts = item.split(":");
    return {
      diusulkan_oleh: parts[0]?.trim() || "Pembicara",
      deskripsi_ide: parts.slice(1).join(":")?.trim() || item
    };
  });

  const tab_tindak_lanjut = (data.tindak_lanjut_dan_concern || data.poin_diskusi_tambahan || []).map((item: any) => ({
    concern_masalah: item.kekhawatiran_spesifik || item.concern || "",
    solusi_disepakati: item.solusi_dan_arahan || item.tindakanLanjut || ""
  }));

  const tab_next_plan = (data.next_plan_roadmap || data.next_plan || []).map((item: any) => ({
    action_item: item.action_item || item.tahapan || "",
    pic: item.pic || "TBD",
    due_date: item.estimasi_waktu || "TBD"
  }));

  const tab_target_to_be = {
    proses_bisnis_as_is: data.target_to_be_architecture?.proses_bisnis_as_is || data.to_be_scenario?.kondisi_sekarang || "",
    proses_bisnis_to_be: data.target_to_be_architecture?.proses_bisnis_to_be || data.to_be_scenario?.target_ke_depan || "",
    langkah_transisi: data.target_to_be_architecture?.langkah_transisi || data.to_be_scenario?.langkah_transisi || []
  };

  const tab_metadata = {
    host_rapat: "Host",
    tanggal_rapat: data.meeting_metadata?.tanggal_waktu || "",
    durasi_detik: 0,
    platform_digunakan: "Zoom",
    peserta_rapat: data.meeting_metadata?.peserta_aktif || []
  };

  return {
    tab_ringkasan,
    tab_kronologi_rapat,
    tab_kesimpulan,
    tab_saran_dan_ide,
    tab_tindak_lanjut,
    tab_next_plan,
    tab_target_to_be,
    tab_metadata
  };
};

export const AiMeetingCompanion: React.FC<AiMeetingCompanionProps> = ({
  projectId,
  meeting,
  currentUser,
  projectMembers = [],
  onPointsImported,
}) => {
  const [transcript, setTranscript] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "chronology" | "conclusions" | "suggestions" | "actionItems" | "nextPlan" | "toBeScenario" | "metadata" | "summary">("transcript");
  const [aiData, setAiData] = useState<AiSummaryStructure | null>(null);
  const [activeMeetingData, setActiveMeetingData] = useState<any>(null);
  const [convertingTaskIds, setConvertingTaskIds] = useState<number[]>([]);

  // States for Continuous Learning QA Feedback Loop
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // States for transcript searching & filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOnlyMatches, setFilterOnlyMatches] = useState(false);

  // States for Editing and Re-analysing Transcript
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscriptText, setEditedTranscriptText] = useState("");

  // Helper to escape regex special characters
  const escapeRegExp = (str: string) => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Function to highlight search term inside a piece of text
  const renderHighlightedTranscript = (text: string) => {
    if (!searchTerm.trim()) {
      return text;
    }

    try {
      const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
      const parts = text.split(regex);

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-amber-200 text-slate-900 font-extrabold px-0.5 rounded shadow-xs">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  // Process the transcript into lines or paragraphs to support filtering
  const getProcessedTranscript = () => {
    if (!transcript) return [];
    const lines = transcript.split(/\r?\n/);
    if (!searchTerm.trim()) {
      return lines;
    }
    if (filterOnlyMatches) {
      return lines.filter(line => 
        line.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return lines;
  };

  // Calculate occurrences of the search term in the entire transcript
  const getMatchCount = () => {
    if (!transcript || !searchTerm.trim()) return 0;
    try {
      const regex = new RegExp(escapeRegExp(searchTerm), "gi");
      const matches = transcript.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error("Catatan evaluasi tidak boleh kosong.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const response = await axios.post("/api/v1/qa/ai-feedback", {
        project_id: projectId,
        evaluation_notes: feedbackText,
      });
      if (response.data.status === "success") {
        toast.success("Masukan kualitas notulen berhasil disimpan! AI akan mempelajari evaluasi ini untuk rapat berikutnya.");
        setFeedbackText("");
        setShowFeedbackModal(false);
      } else {
        toast.error(response.data.message || "Gagal menyimpan masukan.");
      }
    } catch (err: any) {
      console.error("[FEEDBACK SUBMIT ERROR]", err);
      toast.error("Gagal mengirim masukan: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    if (aiData) {
      setActiveMeetingData(mapToActiveMeetingData(aiData));
    } else {
      setActiveMeetingData(null);
    }
  }, [aiData]);

  const [importingIds, setImportingIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<"IDLE" | "IS_UPLOADING" | "IS_PROCESSING" | "UPLOAD_SUCCESS" | "PROCESSING_AI" | "TRANSCRIBING" | "EXTRACTING_AUDIO" | "TRANSCRIBING_STT" | "ANALYZING_LLM" | "COMPLETED" | "FAILED">("IDLE");
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<"Zoom" | "Teams" | "GMeet">("Zoom");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${new Date().getTime()}.webm`, { type: 'audio/webm' });
        
        // Treat as a file upload
        await processUploadedFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Merekam...");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengakses mikrofon.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Removed premature toast.dismiss() to avoid clearing potential loading state
      toast.success("Rekaman selesai, memulai pemrosesan...");
    }
  };

  const runAnalysisApi = async (transcriptText: string, link: string) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}/meetings/${meeting.id}/analyze-transcript`, {
        method: "POST",
        body: { transcript: transcriptText, meetingLink: link }
      });

      if (response.status === "success") {
        setAiData(response.data);
        toast.success("Transkrip berhasil dianalisis oleh Asisten AI!");
        setActiveTab("summary");
      } else {
        toast.error(response.message || "Gagal menganalisis transkrip.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Terjadi kesalahan saat menghubungi server AI.");
    } finally {
      setLoading(false);
    }
  };

  const extractAudioFromVideo = async (file: File): Promise<File> => {
    setUploadState("EXTRACTING_AUDIO");
    const ffmpeg = new FFmpeg();
    try {
        await ffmpeg.load();
        await ffmpeg.writeFile(file.name, await fetchFile(file));
        
        // Extract audio to mp3
        const outputFileName = 'extracted_audio.mp3';
        // -vn: no video, -acodec libmp3lame: mp3 codec, -ar 16000: 16khz (sufficient for voice), -ac 1: mono (sufficient for voice)
        // -map a: ensures we only take the audio stream, fails if none
        const exitCode = await ffmpeg.exec(['-i', file.name, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-map', 'a', outputFileName]);
        
        if (exitCode !== 0) {
            throw new Error("FFmpeg failed to extract audio.");
        }
        
        const data = await ffmpeg.readFile(outputFileName);
        const audioBlob = new Blob([data], { type: 'audio/mp3' });
        
        return new File([audioBlob], outputFileName, { type: 'audio/mp3' });
    } catch (error) {
        console.error("Audio extraction failed:", error);
        throw new Error("Gagal mengekstrak audio. Pastikan file video memiliki track audio atau format tidak rusak.");
    }
  };

  const processUploadedFile = async (file: File) => {
    // 🛡️ Strict File Security Guard
    const validation = validateFileClient(file, 120 * 1024 * 1024);
    if (!validation.valid) {
      toast.error(validation.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 120MB).");
      return;
    }

    let fileToUpload = file;
    
    // Check if it's a video file and needs extraction
    if (file.type.startsWith('video/')) {
        fileToUpload = await extractAudioFromVideo(file);
    }

    setUploadState("IS_UPLOADING");
    setUploadPercentage(0);
    setUploadedBytes(0);
    setTotalBytes(fileToUpload.size);
    setUploading(true);
    
    try {
      const chunkSize = 1024 * 1024 * 2; // 2MB chunk size to ensure we bypass reverse proxy limits
      const totalChunks = Math.ceil(fileToUpload.size / chunkSize);
      let lastResponse = null;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, fileToUpload.size);
        const chunkBlob = fileToUpload.slice(start, end);
        
        // Wrap the chunk blob back into a File object with original name
        const chunkFile = new File([chunkBlob], fileToUpload.name, { type: fileToUpload.type });

        const formData = new FormData();
        formData.append('recording', chunkFile);
        formData.append('meeting_id', meeting.id || "");
        formData.append('file_name', file.name);
        formData.append('platform', selectedPlatform);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        formData.append('fileSize', file.size.toString());

        const token = localStorage.getItem("lanpro_jwt_token");
        lastResponse = await axios.post(`/api/v1/meetings/${meeting.id}/upload-recording`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              // Calculate the overall progress of the entire file
              const chunkProgress = progressEvent.loaded / progressEvent.total;
              const overallUploadedBytes = start + (chunkProgress * (end - start));
              const percentage = Math.round((overallUploadedBytes * 100) / file.size);
              
              setUploadPercentage(percentage);
              setUploadedBytes(Math.round(overallUploadedBytes));
              
              if (percentage >= 100) {
                setUploadState("IS_PROCESSING");
              }
            }
          }
        });
      }

      if (lastResponse && (lastResponse.status === 200 || lastResponse.status === 201 || (lastResponse.data && lastResponse.data.status === "success"))) {
        setUploadState("PROCESSING_AI");
        toast.success("File rekaman rapat berhasil diunggah!");
        toast.loading("Mengekstrak audio & menganalisis rapat dengan AI (STT & LLM)...", { id: "ai-analyze-toast" });
        setTimeout(() => {
          toast.dismiss("ai-analyze-toast");
        }, 3000);
      } else {
        setUploadState("IDLE");
        toast.error(lastResponse?.data?.message || "Gagal memproses rekaman.");
      }
    } catch (err: any) {
      setUploadState("IDLE");
      console.error("Error uploading file:", err);
      toast.error("Gagal mengunggah: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const handleCancelProcessing = async () => {
    try {
      const token = localStorage.getItem("lanpro_jwt_token");
      await axios.post(`/api/v1/meetings/${meeting.id}/cancel`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setUploadState("IDLE");
      setUploadPercentage(0);
      setUploading(false);
      toast.success("Pemrosesan rapat berhasil dibatalkan dan di-reset.");
    } catch (err: any) {
      console.error("Cancel processing error:", err);
      toast.error("Gagal membatalkan pemrosesan.");
    }
  };

  // Load existing transcript and aiSummary from meeting object
  useEffect(() => {
    if (meeting.transcript) {
      setTranscript(meeting.transcript);
    } else {
      setTranscript("");
    }

    if (meeting.aiSummary) {
      try {
        const parsed = typeof meeting.aiSummary === "string" 
          ? JSON.parse(meeting.aiSummary) 
          : meeting.aiSummary;
        setAiData(parsed);
        setActiveTab("chronology");
      } catch (e) {
        console.error("Failed to parse meeting aiSummary", e);
        setAiData(null);
        setActiveTab("transcript");
      }
    } else {
      setAiData(null);
      setActiveTab("transcript");
    }
  }, [meeting]);

  // Real-time updates via Socket.io and short-polling fallback (Event-Driven Synchronization)
  useEffect(() => {
    // 1. Establish Socket.io connection safely
    let socket: any;
    try {
      socket = io();
      
      // Safe handlers to prevent unhandled rejections
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe meeting socket error caught internally:", err);
      });
      socket.on("connect_error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe meeting socket connect_error caught internally:", err);
      });
      
      socket.onerror = (err: any) => {
        console.warn("[SOCKET ERROR] Native-like meeting socket onerror caught internally:", err);
      };
      socket.onclose = () => {

      };

      if (socket.io) {
        socket.io.on("error", (err: any) => {
          console.warn("[SOCKET IO ERROR] Meeting engine.io error suppressed:", err);
        });
      }
      if (socket.io && socket.io.engine) {
        socket.io.engine.on("error", (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Meeting engine error suppressed:", err);
        });
        socket.io.engine.onerror = (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Meeting engine onerror suppressed:", err);
        };
        socket.io.engine.onclose = () => {

        };
      }
    } catch (err) {
      console.error("[SOCKET FATAL] Failed to initialize meeting socket safely:", err);
    }
    
    
    if (socket) {
      socket.on("meeting_ai_status", (data: any) => {
        if (data.meetingId === meeting.id) {
          if (data.status) {
            setUploadState(data.status);
          }
          if (data.progress_percentage !== undefined) {
            setUploadPercentage(data.progress_percentage);
          }
        }
      });

      socket.on("meeting_ai_completed", (data: any) => {
        if (data.meetingId === meeting.id) {
          setTranscript(data.transcript || "");
          if (data.aiSummary) {
            const parsedSummary = typeof data.aiSummary === "string"
              ? JSON.parse(data.aiSummary)
              : data.aiSummary;
            setAiData(parsedSummary);
          }
          setUploadPercentage(100);
          setUploadState("IDLE");
          setUploading(false);
          toast.success("Notulen Rapat otomatis berhasil disinkronisasi dalam waktu riil!");
          setActiveTab("summary");
        }
      });

      socket.on("meeting_ai_failed", (data: any) => {
        if (data.meetingId === meeting.id) {
          console.error("[SOCKET] AI Processing failed:", data.error);
          toast.error(`Gagal menganalisis rapat: ${data.error}`);
          setUploadPercentage(0);
          setUploadState("IDLE");
          setUploading(false);
        }
      });
    }

    // 2. Short-polling fallback to guarantee UI sync even with network glitches (polling every 3 seconds)
    let pollInterval: NodeJS.Timeout | null = null;
    
    const isProcessingState = uploadState !== "IDLE" && uploadState !== "IS_UPLOADING";

    if (isProcessingState) {
      pollInterval = setInterval(async () => {
        try {
          const token = localStorage.getItem("lanpro_jwt_token");
          const response = await axios.get(`/api/v1/meetings/${meeting.id}/status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (response.data) {
            const mData = response.data;
            const status = mData.upload_status || mData.status;
            
            if (status) {
              setUploadState(status);
            }
            if (mData.progress_percentage !== undefined) {
              setUploadPercentage(mData.progress_percentage);
            }

            if (status === "COMPLETED" && (mData.aiSummary || mData.analysis_result)) {
              const targetSummary = mData.aiSummary || mData.analysis_result;
              const parsedSummary = typeof targetSummary === "string"
                ? JSON.parse(targetSummary)
                : targetSummary;
              
              setTranscript(mData.transcript || "");
              setAiData(parsedSummary);
              setUploadPercentage(100);
              setUploadState("IDLE");
              setUploading(false);
              toast.success("Notulen Rapat otomatis berhasil dimuat!");
              setActiveTab("summary");
              if (pollInterval) clearInterval(pollInterval);
            } else if (status === "FAILED") {
              toast.error("Gagal memproses analisis otomatis di server.");
              setUploadPercentage(0);
              setUploadState("IDLE");
              setUploading(false);
              if (pollInterval) clearInterval(pollInterval);
            } else if (status === "IDLE") {
              setUploadPercentage(0);
              setUploadState("IDLE");
              setUploading(false);
              if (pollInterval) clearInterval(pollInterval);
            }
          }
        } catch (pollErr) {
          console.warn("Polling error:", pollErr);
        }
      }, 3000); // Polling every 3 seconds
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [meeting.id, uploadState]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      toast.error("Silakan masukkan teks transkrip rapat terlebih dahulu.");
      return;
    }
    runAnalysisApi(transcript, meetingLink);
  };

  
  const handleConvertToTask = async (item: any, index: number) => {
    if (!currentUser || !projectId) {
      toast.error("Harap login & pilih project terlebih dahulu.");
      return;
    }
    
    setConvertingTaskIds(prev => [...prev, index]);
    
    try {
      const payload = {
        title: `[Action Item] ${item.concern_masalah?.substring(0, 50)}...`,
        description: `**Concern:**\n${item.concern_masalah}\n\n**Solusi Disepakati:**\n${item.solusi_disepakati}`,
        status: "To Do",
        priority: "High",
        type: "task",
        assigneeId: null,
        reporterId: currentUser.uid || currentUser.id || 'guest',
      };
      
      const data = await apiRequest(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: payload
      });
      
      if (data.status === "success") {
        toast.success("Berhasil membuat Task Issue baru di Backlog!");
        // No refresh callback needed if websocket is active
        // if (onRefreshTasks) {
        //   onRefreshTasks();
        // }
      } else {
        toast.error(data.message || "Gagal membuat task.");
      }
    } catch (err: any) {
      console.error("Failed to convert to task", err);
      toast.error(err.message || "Gagal membuat task.");
    } finally {
      setConvertingTaskIds(prev => prev.filter(i => i !== index));
    }
  };

  const handleImportAllActionItems = async () => {
    const itemsToImport = activeMeetingData?.tab_tindak_lanjut || [];
    if (itemsToImport.length === 0) {
      toast.error("Tidak ada butir tindak lanjut untuk diimpor.");
      return;
    }

    if (!currentUser) {
      toast.error("Harap login terlebih dahulu.");
      return;
    }

    setImportingIds(itemsToImport.map((_: any, idx: number) => idx));
    let successCount = 0;

    for (let i = 0; i < itemsToImport.length; i++) {
      const item = itemsToImport[i];
      try {
        const payload: Omit<DiscussionPoint, "id" | "meetingId" | "createdAt"> = {
          authorId: currentUser.uid,
          concern: item.concern_masalah || item.concern || "",
          fitur: item.fitur || "AI Auto",
          system: item.system || "System",
          surrounding: item.surrounding || "-",
          keterangan: item.keterangan || "Diimpor otomatis dari analisis transkrip rapat oleh AI Companion.",
          tindakanLanjut: item.solusi_disepakati || item.tindakanLanjut || "",
          status: "pending",
          assignTo: undefined,
          targetDate: undefined,
        };

        await createDiscussionPoint(projectId, meeting.id!, payload, currentUser.uid);
        successCount++;
      } catch (err) {
        console.error("Failed to import item index " + i, err);
      }
    }

    setImportingIds([]);
    toast.success(`Berhasil mengimpor ${successCount} butir tindak lanjut ke Poin Diskusi resmi.`);
    if (onPointsImported) {
      onPointsImported();
    }
  };

  const handleImportSingle = async (item: any, index: number) => {
    if (!currentUser) {
      toast.error("Harap login terlebih dahulu.");
      return;
    }

    setImportingIds(prev => [...prev, index]);
    try {
      const payload: Omit<DiscussionPoint, "id" | "meetingId" | "createdAt"> = {
        authorId: currentUser.uid,
        concern: item.concern_masalah || item.concern || "",
        fitur: item.fitur || "AI Auto",
        system: item.system || "System",
        surrounding: item.surrounding || "-",
        keterangan: item.keterangan || "Diimpor otomatis dari analisis transkrip rapat oleh AI Companion.",
        tindakanLanjut: item.solusi_disepakati || item.tindakanLanjut || "",
        status: "pending",
        assignTo: undefined,
        targetDate: undefined,
      };

      await createDiscussionPoint(projectId, meeting.id!, payload, currentUser.uid);
      toast.success("Butir tindak lanjut berhasil diimpor.");
      if (onPointsImported) {
        onPointsImported();
      }
    } catch (err: any) {
      toast.error("Gagal mengimpor: " + err.message);
    } finally {
      setImportingIds(prev => prev.filter(id => id !== index));
    }
  };

  return (
    <div className="w-full flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
      {/* Companion Header Banner */}
      <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 shadow-inner">
            <Cpu className="w-5 h-5 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black tracking-tight text-white">Asisten Notulen Rapat Otomatis</h4>
              <span className="px-2 py-0.5 bg-indigo-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">PRO</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Analisis transkrip suara hasil Speech-to-Text rapat menjadi ringkasan & action items terstruktur.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 hover:text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Brain className="w-3.5 h-3.5" /> Beri Masukan Kualitas Notulen
          </button>
          {aiData && (
            <button
              onClick={() => setActiveTab("transcript")}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Analisis Transkrip Baru
            </button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      {aiData && (
        <div className="border-b border-slate-200/80 bg-slate-50/70 p-1 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "summary"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-500" /> Ringkasan
          </button>
          <button
            onClick={() => setActiveTab("chronology")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "chronology"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-500" /> Kronologi Rapat
          </button>
          <button
            onClick={() => setActiveTab("conclusions")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "conclusions"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Kesimpulan
          </button>
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "suggestions"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Saran & Ide
          </button>
          <button
            onClick={() => setActiveTab("actionItems")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "actionItems"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 text-indigo-600" /> Tindak Lanjut
            {activeMeetingData?.tab_tindak_lanjut?.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded-full font-black min-w-[16px] text-center inline-block animate-pulse">
                {activeMeetingData.tab_tindak_lanjut.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("nextPlan")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "nextPlan"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-pink-500" /> Next Plan
          </button>
          <button
            onClick={() => setActiveTab("toBeScenario")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "toBeScenario"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" /> Target To-Be
          </button>
          <button
            onClick={() => setActiveTab("metadata")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "metadata"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-teal-500" /> Metadata
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "transcript"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" /> Lihat Transkrip
          </button>
        </div>
      )}

      {/* Main workspace container */}
      <div className="p-6 min-h-[300px] bg-slate-50/20 text-left">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <h5 className="text-sm font-black text-slate-800">Menyusun Catatan Rapat...</h5>
            <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
              Sekretaris AI sedang menganalisis alur argumen, mendeteksi topik bahasan, mengekstrak poin kesimpulan, saran, serta butir tindak lanjut rapat Anda. Harap tunggu sebentar.
            </p>
          </div>
        ) : (
          <>
            {/* TAB: Summary */}
            {activeTab === "summary" && activeMeetingData?.tab_ringkasan && (
              <div className="space-y-6">
                {/* Header Info & Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-widest bg-indigo-100/70 px-2.5 py-1 rounded-md">Agenda Rapat Utama</span>
                      <h3 className="text-sm font-black text-slate-800 mt-2 flex items-center gap-2">
                        <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                        {activeMeetingData.tab_ringkasan.topik_utama}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Segmen Diskusi</span>
                      <p className="text-base font-black text-indigo-950 mt-1">{(activeMeetingData.tab_kronologi_rapat || []).length} Topik</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Action Items</span>
                      <p className="text-base font-black text-emerald-700 mt-1">{(activeMeetingData.tab_tindak_lanjut || []).length} Butir</p>
                    </div>
                  </div>
                </div>

                {/* PMO Enterprise Notulen Rapat Document */}
                <div className="bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
                  
                  {/* Premium Markdown styling with .prose */}
                  <div className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed text-left">
                    <ReactMarkdown>
                      {activeMeetingData.tab_ringkasan.executive_summary_multimodal?.includes("##") 
                        ? activeMeetingData.tab_ringkasan.executive_summary_multimodal
                        : `## NOTULEN RAPAT: ${activeMeetingData.tab_ringkasan.topik_utama || "Koordinasi Proyek"}
**Tanggal:** ${activeMeetingData.tab_metadata?.tanggal_rapat || "Tidak ditentukan"}
**Topik:** ${activeMeetingData.tab_ringkasan.topik_utama || "Koordinasi Proyek"}

---

### **Daftar Hadir (Pemangku Kepentingan):**
${(activeMeetingData.tab_metadata?.peserta_rapat || []).map((name: string) => `- **${name}**`).join('\n') || '- Belum didefinisikan.'}

---

### **Ringkasan Eksekutif & Detail Teknis:**
${activeMeetingData.tab_ringkasan.executive_summary_multimodal}

---

### **Rencana Tindak Lanjut (Action Items):**
${(activeMeetingData.tab_tindak_lanjut || []).map((item: any) => `- **Concern**: ${item.concern_masalah} -> *Solusi:* ${item.solusi_disepakati}`).join('\n') || '- Belum disepakati.'}
`}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Input / View Transcript */}
            {activeTab === "transcript" && (
              <div className="space-y-8">
                {activeMeetingData && (
                  <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Hasil Speech-to-Text Mentah (Raw Transcript)
                        </h4>
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg">
                          {transcript ? `${transcript.split(/\s+/).length} Kata` : "0 Kata"}
                        </span>
                      </div>
                      
                      {transcript && !isEditingTranscript && (
                        <button
                          onClick={() => {
                            setEditedTranscriptText(transcript);
                            setIsEditingTranscript(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-slate-200/60 hover:border-indigo-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit & Analisis Ulang
                        </button>
                      )}
                    </div>

                    {isEditingTranscript ? (
                      <div className="space-y-4 text-left animate-fade-in">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-bold text-amber-800 leading-relaxed flex items-start gap-2.5">
                          <Sparkles className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            Mode Edit Aktif: Anda dapat menambah, mengoreksi, atau menempelkan transkrip percakapan rapat yang lebih lengkap di bawah ini. Setelah selesai, klik tombol <span className="underline">"Simpan & Mulai Analisis Ulang"</span> untuk memproses kembali Notulen Rapat PMO Anda secara instan.
                          </div>
                        </div>

                        <textarea
                          value={editedTranscriptText}
                          onChange={(e) => setEditedTranscriptText(e.target.value)}
                          placeholder="Sunting atau lengkapi teks transkrip di sini..."
                          className="w-full min-h-[350px] p-4 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl text-xs font-semibold outline-none bg-white font-mono leading-relaxed shadow-inner"
                        />

                        <div className="flex items-center justify-end gap-3 pt-2">
                          <button
                            onClick={() => setIsEditingTranscript(false)}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200/60 transition-all cursor-pointer"
                          >
                            Batal
                          </button>
                          
                          <button
                            onClick={async () => {
                              if (!editedTranscriptText.trim()) {
                                toast.error("Transkrip tidak boleh kosong.");
                                return;
                              }
                              setIsEditingTranscript(false);
                              setTranscript(editedTranscriptText);
                              await runAnalysisApi(editedTranscriptText, meetingLink);
                            }}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-transform"
                          >
                            <Save className="w-4 h-4" />
                            Simpan & Mulai Analisis Ulang
                          </button>
                        </div>
                      </div>
                    ) : transcript ? (
                      <div className="space-y-4 text-left">
                        {/* Search and Filter Bar */}
                        <div className="bg-slate-50 p-4 border border-slate-200/60 rounded-xl space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search Input */}
                            <div className="relative flex-1">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                <Search className="w-4 h-4 text-slate-400" />
                              </span>
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cari kata kunci, topik, pembicara, atau keputusan..."
                                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-705 rounded-xl placeholder:text-slate-400 focus:outline-none transition-all font-semibold"
                              />
                              {searchTerm && (
                                <button
                                  onClick={() => setSearchTerm("")}
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Filter Toggle Switch/Button */}
                            <button
                              onClick={() => setFilterOnlyMatches(!filterOnlyMatches)}
                              className={`px-4 py-2.5 rounded-xl border text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                                filterOnlyMatches
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                  : "bg-white border-slate-200 text-slate-655 hover:text-slate-800 hover:bg-slate-50"
                              }`}
                            >
                              <Filter className="w-3.5 h-3.5" />
                              {filterOnlyMatches ? "Hanya Baris Cocok" : "Tampilkan Semua"}
                            </button>
                          </div>

                          {/* Quick Search Chips and Match Count */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Cari Cepat:</span>
                              {["Speaker", "API", "Rencana", "Database", "Error", "Sepakat", "Arsitektur"].map((chip) => (
                                <button
                                  key={chip}
                                  onClick={() => setSearchTerm(chip)}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${
                                    searchTerm === chip
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                      : "bg-white border-slate-150 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            {searchTerm.trim() && (
                              <div className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg animate-pulse">
                                Ditemukan {getMatchCount()} kecocokan
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transcript Display Container */}
                        <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl max-h-[380px] overflow-y-auto text-xs font-mono text-slate-700 leading-relaxed whitespace-pre-wrap select-text space-y-2">
                          {getProcessedTranscript().length > 0 ? (
                            getProcessedTranscript().map((line, idx) => (
                              <div key={idx} className="hover:bg-slate-100/40 py-1 px-1.5 rounded transition-colors">
                                {renderHighlightedTranscript(line)}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-slate-400 font-semibold italic">
                              Tidak ada baris transkrip yang cocok dengan pencarian "{searchTerm}".
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-semibold italic">Transkrip mentah tidak tersedia (Analisis multimodal diekstrak langsung dari rekaman video/audio).</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Section 1: Record Langsung */}
                  <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      1. Record Langsung (Mikrofon)
                    </div>
                    <p className="text-[11px] text-slate-400">Merekam suara rapat melalui mikrofon perangkat Anda (catatan: hanya suara yang ditangkap mikrofon).</p>
                    
                    <div className="flex flex-col items-center justify-center gap-3 w-full py-4">
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`px-8 py-4 ${isRecording ? 'bg-slate-800' : 'bg-red-600'} hover:opacity-90 text-white rounded-2xl text-sm font-black shadow-lg shadow-red-150 flex items-center gap-3 cursor-pointer transition-transform hover:scale-[1.02]`}
                      >
                        <Brain className="w-5 h-5" /> {isRecording ? "Hentikan Rekaman" : "Mulai Merekam"}
                      </button>
                      <span className="text-sm font-mono font-bold text-slate-500">{formatTime(recordingTime)}</span>
                    </div>
                  </div>

                  {/* Section 2: Upload / Paste */}
                  <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      2. Upload Rekaman Atau Transkrip
                    </div>

                    {/* Media Platform Selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Platform Rekaman Rapat
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                        {(["Zoom", "Teams", "GMeet"] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            disabled={uploadState !== "IDLE"}
                            onClick={() => setSelectedPlatform(p)}
                            className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                              selectedPlatform === p
                                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                                : "text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {uploadState !== "IDLE" ? (() => {
                      let title = "Mengolah Rapat...";
                      let subtext = "Sedang menjalankan asisten AI...";
                      let icon = <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
                      let pct = uploadPercentage;

                      switch (uploadState) {
                        case "IS_UPLOADING":
                          title = "Mengunggah File...";
                          subtext = `Mengunggah: ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(2)}MB / ${(totalBytes / (1024 * 1024)).toFixed(2)}MB)`;
                          icon = <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
                          break;
                        case "IS_PROCESSING":
                          title = "Menyimpan Berkas Rapat...";
                          subtext = "Menyimpan berkas rekaman secara permanen...";
                          icon = <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
                          break;
                        case "UPLOAD_SUCCESS":
                          title = "Unggah Selesai!";
                          subtext = "Selesai! Memulai analisis transkrip...";
                          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                          pct = Math.max(pct, 5);
                          break;
                        case "EXTRACTING_AUDIO":
                        case "PROCESSING_AI":
                          title = "Mengekstrak Suara (FFmpeg)...";
                          subtext = "Sedang mengekstrak berkas audio dari rekaman rapat...";
                          icon = <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
                          pct = 15;
                          break;
                        case "TRANSCRIBING_STT":
                        case "TRANSCRIBING":
                          title = "Mengonversi Suara ke Teks (Gemini)...";
                          subtext = "Mengubah suara rekaman audio menjadi teks mentah secara akurat...";
                          icon = <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />;
                          pct = 60;
                          break;
                        case "ANALYZING_LLM":
                          title = "Asisten AI menyusun Notulen Rapat...";
                          subtext = "Mengekstrak Kronologi, Keputusan, Rencana Tindak Lanjut, & Skenario To-Be...";
                          icon = <Loader2 className="w-4 h-4 text-pink-600 animate-spin" />;
                          pct = 90;
                          break;
                        case "COMPLETED":
                          title = "Pemrosesan Selesai!";
                          subtext = "Seluruh tahapan berhasil diselesaikan.";
                          icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                          pct = 100;
                          break;
                        case "FAILED":
                          title = "Pemrosesan Gagal";
                          subtext = "Terjadi kesalahan dalam memproses audio atau analisis AI.";
                          icon = <XCircle className="w-4 h-4 text-rose-500" />;
                          pct = 0;
                          break;
                        default:
                          break;
                      }

                      return (
                        <div className="border border-slate-100 bg-slate-50/55 rounded-2xl p-6 flex flex-col justify-center gap-4 w-full min-h-[160px] text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {icon}
                              <span className="text-xs font-bold text-slate-700">
                                {title}
                              </span>
                            </div>
                            <span className="text-xs font-black text-blue-600 transition-all duration-300">
                              {pct}%
                            </span>
                          </div>

                          {/* Progress bar with a contrast blue gradient */}
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner relative">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                              style={{ 
                                width: `${pct}%` 
                              }}
                            />
                          </div>

                          {/* Detail of bytes / stage */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <span>
                              {subtext}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelProcessing();
                              }}
                              className="text-rose-500 hover:text-rose-700 underline cursor-pointer"
                            >
                              Batal/Reset
                            </button>
                          </div>
                        </div>
                      );
                    })() : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-500 hover:text-indigo-600 h-full min-h-[160px]"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="video/*,audio/*"
                          className="hidden"
                        />
                        <UploadCloud className="w-8 h-8" />
                        <p className="text-xs font-bold text-center">
                          Unggah Rekaman ({selectedPlatform})
                        </p>
                        <p className="text-[10px] text-slate-400 text-center">Video / Audio (MP4, AVI, MKV, MOV, MP3, WAV, etc.)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Paste Transcript */}
                <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">ATAU TEMPEL LINK / TRANSKRIP</div>
                  
                  <input
                    type="text"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="Tempel link rapat (Zoom/Teams/GMeet)..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 bg-white placeholder:text-slate-300 font-semibold"
                  />
                  
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Tempel teks transkrip di sini..."
                    className="w-full min-h-[160px] p-4 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 bg-white placeholder:text-slate-300 font-mono leading-relaxed shadow-inner"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAnalyze}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-150 flex items-center gap-2 cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-200" /> MULAI ANALISIS AI
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Chronology */}
            {activeTab === "chronology" && activeMeetingData?.tab_kronologi_rapat && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider mb-2">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  Kronologi Jalannya Pembahasan & Tampilan Layar Multimodal
                </div>

                {activeMeetingData.tab_kronologi_rapat.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs bg-white border border-slate-200/40 rounded-2xl">Tidak ada kronologi terdeteksi.</div>
                ) : (
                  <div className="relative border-l-2 border-indigo-100 pl-6 space-y-8 ml-3">
                    {activeMeetingData.tab_kronologi_rapat.map((item: any, index: number) => (
                      <div key={index} className="relative group">
                        <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white group-hover:scale-125 transition-transform shadow-sm" />
                        
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest block mb-1">Topik {index + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[10px] font-black rounded">
                                  {item.timestamp}
                                </span>
                                <h4 className="text-sm font-black text-slate-800 tracking-tight leading-snug">Visual: {item.aktivitas_visual}</h4>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Isi Percakapan Inti & Hasil Diskusi</h5>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">{item.isi_percakapan_inti}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Conclusions */}
            {activeTab === "conclusions" && activeMeetingData?.tab_kesimpulan && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Keputusan & Hasil Akhir yang Disepakati (Final Decisions)
                </div>
                
                {activeMeetingData.tab_kesimpulan.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs bg-white border border-slate-200/40 rounded-2xl">Tidak ada kesimpulan keputusan resmi yang terdeteksi.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activeMeetingData.tab_kesimpulan.map((item: string, index: number) => (
                      <div key={index} className="bg-white p-4.5 rounded-2xl border border-emerald-100/60 flex items-start gap-3 shadow-sm hover:border-emerald-200 transition-colors">
                        <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-xs font-black mt-0.5 border border-emerald-100">
                          {index + 1}
                        </span>
                        <p className="text-xs text-slate-700 font-bold leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Suggestions */}
            {activeTab === "suggestions" && activeMeetingData?.tab_saran_dan_ide && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Ide, Masukan, dan Gagasan Inovasi Peserta
                </div>

                {activeMeetingData.tab_saran_dan_ide.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs bg-white border border-slate-200/40 rounded-2xl">Tidak ada usulan ide atau rekomendasi yang tercatat.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {activeMeetingData.tab_saran_dan_ide.map((item: any, index: number) => (
                      <div key={index} className="bg-white p-4.5 rounded-2xl border border-amber-100/60 flex flex-col gap-2 shadow-sm hover:border-amber-200 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-750 text-[9px] font-black uppercase rounded border border-amber-100">
                            Diusulkan Oleh: {item.diusulkan_oleh}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed pl-1">{item.deskripsi_ide}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Action Items */}
            {activeTab === "actionItems" && activeMeetingData?.tab_tindak_lanjut && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                    <ListChecks className="w-4 h-4 text-indigo-600" />
                    Butir Tindak Lanjut & Rencana Aksi (Action Items)
                  </div>
                  
                  {activeMeetingData.tab_tindak_lanjut.length > 0 && (
                    <button
                      onClick={handleImportAllActionItems}
                      disabled={importingIds.length > 0}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-55"
                    >
                      <Database className="w-3.5 h-3.5 text-indigo-200" /> Impor Semua ke Poin Diskusi
                    </button>
                  )}
                </div>

                {activeMeetingData.tab_tindak_lanjut.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs bg-white border border-slate-200/40 rounded-2xl">Tidak ada butir tindak lanjut / action items yang terdeteksi.</div>
                ) : (
                  <div className="space-y-4">
                    {activeMeetingData.tab_tindak_lanjut.map((item: any, index: number) => {
                      const isImporting = importingIds.includes(index);
                      const legacyMappedItem: ActionItem = {
                        concern: item.concern_masalah,
                        tindakanLanjut: item.solusi_disepakati,
                        PIC: "TBD",
                        targetDate: "TBD"
                      };
                      return (
                        <div key={index} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:border-indigo-200 transition-all">
                          <div className="flex-1 space-y-3 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded border border-rose-100">
                                Concern Rapat {index + 1}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Ketakutan, Kendala Teknis, atau Gap Sistem</h4>
                              <p className="text-xs font-bold text-slate-800 leading-snug">{item.concern_masalah}</p>
                            </div>

                            <div className="pl-3 border-l-2 border-emerald-400 bg-emerald-50/10 py-1.5 pr-2 rounded">
                              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Solusi & Arahan yang Disepakati</h4>
                              <p className="text-xs font-semibold text-slate-600 leading-normal">{item.solusi_disepakati}</p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                            <button
                              onClick={() => handleConvertToTask(item, index)}
                              disabled={convertingTaskIds.includes(index)}
                              title="Buat sebagai Task Issue di Backlog"
                              className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 disabled:opacity-50 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              {convertingTaskIds.includes(index) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>Buat Task Issue</>
                              )}
                            </button>
                            <button
                              onClick={() => handleImportSingle(item, index)}
                              disabled={isImporting}
                              className="px-3.5 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-700 hover:text-indigo-700 disabled:opacity-50 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengimpor...
                                </>
                              ) : (
                                <>
                                  Impor <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Next Plan */}
            {activeTab === "nextPlan" && activeMeetingData?.tab_next_plan && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider mb-2">
                  <ArrowRight className="w-4 h-4 text-pink-600" />
                  Rencana Lanjut & Roadmap Eksekusi (Next Plan)
                </div>

                {activeMeetingData.tab_next_plan.length === 0 ? (
                  <div className="text-center py-8 text-slate-450 text-xs bg-white border border-slate-200/40 rounded-2xl">
                    Tidak ada rencana lanjut khusus yang terdeteksi secara eksplisit dari rekaman.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-pink-100 pl-6 space-y-8 ml-3">
                    {activeMeetingData.tab_next_plan.map((item: any, index: number) => (
                      <div key={index} className="relative group">
                        <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-pink-500 border-4 border-white group-hover:scale-125 transition-transform shadow-sm" />
                        
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <span className="px-2 py-0.5 bg-pink-50 border border-pink-100 text-pink-700 text-[9px] font-black uppercase rounded">
                              Rencana Aksi {index + 1}
                            </span>
                            {item.due_date && (
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-full">
                                Target: {item.due_date}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">{item.action_item}</p>
                            {item.pic && (
                              <div className="text-[11px] text-slate-500 font-black flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5 text-pink-500" /> Penanggung Jawab (PIC): <span className="text-pink-600 font-extrabold">{item.pic}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: To-Be Scenario */}
            {activeTab === "toBeScenario" && activeMeetingData?.tab_target_to_be && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-600 animate-pulse" />
                  Rekomendasi Arsitektur & Target Proses (Target To-Be Architecture)
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* As-Is Card */}
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Kondisi Saat Ini (As-Is)
                      </div>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-wrap">
                        {activeMeetingData.tab_target_to_be.proses_bisnis_as_is || "Kondisi sistem/proses saat ini tidak dibahas."}
                      </p>
                    </div>

                    {/* To-Be Card */}
                    <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl shadow-sm space-y-3">
                      <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Target Masa Depan (To-Be)
                      </div>
                      <p className="text-xs text-indigo-950 font-extrabold leading-relaxed whitespace-pre-wrap">
                        {activeMeetingData.tab_target_to_be.proses_bisnis_to_be || "Target arsitektur/proses masa depan belum terdefinisi."}
                      </p>
                    </div>
                  </div>

                  {/* Transition Steps Card */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase tracking-widest">
                      Langkah-Langkah Transisi Migrasi (Transition Roadmap)
                    </div>

                    {!activeMeetingData.tab_target_to_be.langkah_transisi || activeMeetingData.tab_target_to_be.langkah_transisi.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold">Tidak ada langkah transisi spesifik yang dibahas.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {activeMeetingData.tab_target_to_be.langkah_transisi.map((step: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 text-xs">
                            <span className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center font-black shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="text-slate-600 font-semibold leading-relaxed mt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Metadata */}
            {activeTab === "metadata" && activeMeetingData?.tab_metadata && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Metadata & Deteksi Peserta Rapat
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Topic and platform detection */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-3">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Detil Rapat</h5>
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-600">
                        Host Rapat: <span className="text-slate-800 font-extrabold">{activeMeetingData.tab_metadata.host_rapat || "TBD"}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        Tanggal Rapat: <span className="text-slate-800 font-extrabold">{activeMeetingData.tab_metadata.tanggal_rapat || "TBD"}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-600">
                        Platform: <span className="text-slate-850 font-extrabold px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">{activeMeetingData.tab_metadata.platform_digunakan || "Zoom"}</span>
                      </div>
                      {activeMeetingData.tab_metadata.durasi_detik > 0 && (
                        <div className="text-xs font-bold text-slate-600">
                          Durasi: <span className="text-slate-850 font-extrabold">{Math.floor(activeMeetingData.tab_metadata.durasi_detik / 60)} menit</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Active Speakers / Participants */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-3">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Seluruh Peserta Rapat (Terdeteksi)</h5>
                    
                    {!activeMeetingData.tab_metadata.peserta_rapat || activeMeetingData.tab_metadata.peserta_rapat.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold">Tidak ada peserta yang terdeteksi.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {activeMeetingData.tab_metadata.peserta_rapat.map((speaker: string, index: number) => (
                          <span key={index} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black rounded-lg flex items-center gap-1.5 shadow-sm/50">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> {speaker}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info footer */}
      <div className="bg-slate-50 border-t border-slate-150 p-4 px-6 flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span>Data di atas dianalisis secara aman menggunakan <strong>Gemini AI</strong>. Anda dapat mengimpor Butir Tindak Lanjut di atas untuk menjadikannya Poin Diskusi resmi team.</span>
      </div>

      {/* Continuous Learning Loop Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 transform transition-all scale-100">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-white">Continuous Learning Loop</h4>
                  <p className="text-[10px] text-slate-300 font-medium">Latih AI agar belajar dari kesalahan & kritik Anda</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-300 hover:text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3 text-left">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-indigo-950">Bagaimana Cara Kerjanya?</h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Masukan kritik, koreksi, atau instruksi detail spesifik Anda pada kolom di bawah. 
                    Sebelum melakukan analisis rapat berikutnya, AI kami akan secara dinamis menyuntikkan evaluasi ini ke dalam instruksi utamanya untuk memastikan kesalahan yang sama tidak terulang dan kualitas notulensi terus disesuaikan dengan ekspektasi Anda.
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Catatan Evaluasi & Koreksi Anda:
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Contoh: AI kurang detail menangkap argumen teknis bagian API Hashing. Tolong jelaskan lebih rinci arsitektur keamanan datanya di rapat berikutnya."
                  className="w-full h-32 p-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 rounded-xl placeholder:text-slate-400 focus:outline-none transition-all resize-none"
                  disabled={submittingFeedback}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                disabled={submittingFeedback}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitFeedback}
                className="px-4 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                disabled={submittingFeedback || !feedbackText.trim()}
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Brain className="w-3.5 h-3.5" /> Simpan Evaluasi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
