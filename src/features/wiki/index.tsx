import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Book, 
  Plus, 
  Edit2, 
  Trash2, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Upload, 
  Link as LinkIcon, 
  Download, 
  X, 
  Calendar, 
  User,
  Filter,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Layers,
  Search,
  ExternalLink,
  BookOpen,
  Paperclip,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { validateFileClient } from '../../lib/fileSecurity';
import { UserProfile, MasterData } from '../../types';
import Markdown from 'react-markdown';
import { apiRequest } from '../../lib/api';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { WikiEmptyState } from './components/WikiEmptyState';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { hasPermission } from '../../lib/permissions';

interface DocumentModel {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: string;
  link: string;
  fileName: string;
  fileType: string;
  createdBy: string;
  downloadCount?: number;
  createdAt: any;
  updatedAt: any;
}

interface WikiViewProps {
  projectId: string;
  users: UserProfile[];
  currentUser: UserProfile | null;
  masterData?: MasterData[];
}

export const WikiView: React.FC<WikiViewProps> = ({
  projectId,
  users,
  currentUser,
  masterData = [],
}) => {
  // Core states for storing documents and loading feedback
  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [dragActive, setDragActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  /* 
    ===================================================================
    STATE PENANGANAN MODAL & ACTIVE VIEW
    ===================================================================
    1. activeDocId: ID dari dokumen yang sedang terpilih untuk dibaca di panel kanan
    2. showFormModal: Flag boolean untuk mengontrol munculnya pop-up form Create/Edit
    3. showDeleteConfirmModal: Flag boolean untuk mengontrol pop-up alert konfirmasi hapus
    4. selectedDocForDelete: Menyimpan objek dokumen yang akan dihapus
    5. activeTab: Mengontrol sub-tab visual detail teks vs live preview iframe
    6. mobileActiveView: Navigasi responsif pada mobile ('list' atau 'detail')
  */
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<DocumentModel | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'preview'>('detail');
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'detail'>('list');

  // Permission states (LanPro v1.3)
  const canCreate = useMemo(() => {
    return true;
  }, [currentUser]);

  const canUpdate = useMemo(() => {
    return true;
  }, [currentUser]);

  const canDelete = useMemo(() => {
    return true;
  }, [currentUser]);

  // Split-Pane & Preview Interactive States
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const commentsStorageKey = `lanpro_doc_comments_${projectId}`;
  const [docCommentsMap, setDocCommentsMap] = useState<Record<string, Array<{id: string, userId: string, userName: string, text: string, createdAt: string}>>>(() => {
    try {
      const saved = localStorage.getItem(commentsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error(err);
    }
    return {};
  });
  const [newDocCommentText, setNewDocCommentText] = useState("");
  const [isSendingDocComment, setIsSendingDocComment] = useState(false);

  const handleSendDocComment = () => {
    if (!activeDocId || !newDocCommentText.trim()) return;
    const userName = currentUser?.displayName || currentUser?.username || (currentUser as any)?.nama_lengkap || (currentUser as any)?.name || "Administrator";
    const newComment = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      docId: activeDocId,
      userId: currentUser?.uid || currentUser?.id || 'anon',
      userName,
      text: newDocCommentText.trim(),
      createdAt: new Date().toISOString()
    };
    const updatedMap = {
      ...docCommentsMap,
      [activeDocId]: [...(docCommentsMap[activeDocId] || []), newComment]
    };
    setDocCommentsMap(updatedMap);
    try {
      localStorage.setItem(commentsStorageKey, JSON.stringify(updatedMap));
    } catch (e) {
      console.error(e);
    }
    setNewDocCommentText("");
    toast.success("Catatan / komentar berhasil dikirim!");
  };
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFileData, setPreviewFileData] = useState<string | null>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  // Form State (Untuk Modal Create/Edit)
  const [isNew, setIsNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('PRD');
  const [editLink, setEditLink] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [shouldRemoveFile, setShouldRemoveFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct upload handler for active document in Main View
  const handleDirectUpload = async (file: File) => {
    if (!activeDoc) return;
    setLoading(true);
    try {
      const fileData = await fileToBase64(file);
      const payload = {
        title: activeDoc.title,
        description: activeDoc.description || "",
        type: activeDoc.type,
        link: activeDoc.link || "",
        createdBy: activeDoc.createdBy,
        fileData: fileData,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream'
      };
      const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
      const data = await apiRequest(`/api/projects/${projectId}/documents/${activeDoc.id}`, {
        method: 'PUT',
        headers: { 
          'x-user-id': effectiveUserId
        },
        body: payload
      });
      if (data.status === 'success') {
        toast.success("Berkas spesifikasi berhasil diunggah!");
        await fetchDocuments();
      } else {
        toast.error(data.message || "Gagal mengunggah berkas");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengunggah berkas");
    } finally {
      setLoading(false);
    }
  };

  // Helper to convert base64/dataURL string into a safe Blob URL for iframe rendering
  const base64ToBlobUrl = (base64: string, defaultMime: string = 'application/pdf'): string => {
    try {
      let bytes = base64;
      let mimeType = defaultMime;
      
      if (base64.startsWith('data:')) {
        const parts = base64.split(',');
        bytes = parts[1] || '';
        const mimeMatch = parts[0].match(/:(.*?);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
      
      const byteCharacters = atob(bytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error("Gagal mengonversi base64 ke Blob URL:", err);
      return base64; // Fallback ke data-uri jika konversi gagal
    }
  };

  // Effect to handle Active Document preview data loading and notes selection
  useEffect(() => {
    if (!activeDocId) {
      setPreviewFileData(prev => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setNotesText("");
      setIsEditingNotes(false);
      setIsFullscreenPreview(false);
      return;
    }
    const activeDocObj = documents.find(d => d.id === activeDocId);
    if (activeDocObj) {
      setNotesText(activeDocObj.description || "");
      setIsEditingNotes(false);
      setIsFullscreenPreview(false);

      if (activeDocObj.fileName) {
        setPreviewLoading(true);
        const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
        apiRequest(`/api/projects/${projectId}/documents/${activeDocId}/download`, {
          headers: { 'x-user-id': effectiveUserId }
        })
          .then(data => {
            if (data.status === 'success' && data.data && data.data.fileData) {
              const blobUrl = base64ToBlobUrl(data.data.fileData, data.data.fileType || 'application/pdf');
              setPreviewFileData(prev => {
                if (prev && prev.startsWith('blob:')) {
                  URL.revokeObjectURL(prev);
                }
                return blobUrl;
              });
            } else {
              setPreviewFileData(prev => {
                if (prev && prev.startsWith('blob:')) {
                  URL.revokeObjectURL(prev);
                }
                return null;
              });
            }
          })
          .catch(err => {
            console.error("Gagal memuat pratinjau dokumen:", err);
            setPreviewFileData(prev => {
              if (prev && prev.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
              }
              return null;
            });
          })
          .finally(() => {
            setPreviewLoading(false);
          });
      } else {
        setPreviewFileData(prev => {
          if (prev && prev.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
      }
    }

    return () => {
      setPreviewFileData(prev => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    };
  }, [activeDocId, projectId, documents]);

  // Interactive Notes auto-save or click-to-save handler
  const handleSaveNotes = async () => {
    if (!activeDoc) return;
    setSavingNotes(true);
    try {
      const payload = {
        title: activeDoc.title,
        description: notesText,
        type: activeDoc.type,
        link: activeDoc.link || "",
        createdBy: activeDoc.createdBy
      };
      const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
      const data = await apiRequest(`/api/projects/${projectId}/documents/${activeDoc.id}`, {
        method: 'PUT',
        headers: { 
          'x-user-id': effectiveUserId
        },
        body: payload
      });
      if (data.status === 'success') {
        toast.success("Catatan berhasil disimpan!");
        await fetchDocuments();
        setIsEditingNotes(false);
      } else {
        toast.error(data.message || "Gagal menyimpan catatan");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan catatan");
    } finally {
      setSavingNotes(false);
    }
  };

  // Fetch documents from database
  const fetchDocuments = async () => {
    const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
    try {
      const data = await apiRequest(`/api/projects/${projectId}/documents`, {
        headers: { 'x-user-id': effectiveUserId }
      });
      if (data.status === 'success') {
        setDocuments(data.data);
      }
    } catch (e: any) {
      console.error("Gagal memuat dokumen:", e);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Reset selection states on project switch
    setActiveDocId(null);
    setShowFormModal(false);
    setShowDeleteConfirmModal(false);
    setSelectedDocForDelete(null);
    setMobileActiveView('list');
  }, [projectId]);



  // Grid layout catalog defaults to showing all documents at once

  // Determine standard document categories
  const documentTypes = useMemo(() => {
    const types = masterData.filter(d => d.type === 'jenis_dokumen');
    if (types.length === 0) {
      return [
        { label: 'PRD', value: 'PRD' },
        { label: 'Panduan', value: 'Panduan' },
        { label: 'Laporan', value: 'Laporan' },
        { label: 'Spesifikasi', value: 'Spesifikasi' },
        { label: 'Lainnya', value: 'Lainnya' }
      ];
    }
    const map = new Map<string, { label: string; value: string }>();
    types.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(t => {
      if (!map.has(t.label)) {
        map.set(t.label, { label: t.label, value: t.label });
      }
    });
    return Array.from(map.values());
  }, [masterData]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>(['Semua']);
    documentTypes.forEach(t => set.add(t.value));
    return Array.from(set);
  }, [documentTypes]);

  // Filter documents based on search keyword & selected category
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                          (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = selectedCategory === 'Semua' || d.type === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [documents, search, selectedCategory]);

  const totalItems = filteredDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocs = filteredDocs.slice(indexOfFirstItem, indexOfLastItem);

  // Active viewed document computed object
  const activeDoc = useMemo(() => {
    return documents.find(d => d.id === activeDocId) || null;
  }, [documents, activeDocId]);

  // Trigger modal for Creating new documentation
  const handleCreateNew = () => {
    setIsNew(true);
    setEditId(null);
    setEditTitle('');
    setEditDescription('');
    setEditType(documentTypes.length > 0 ? documentTypes[0].value : 'PRD');
    setEditLink('');
    setEditFile(null);
    setShouldRemoveFile(false);
    setShowFormModal(true);
  };

  // Trigger modal for Editing existing documentation (Pre-filled)
  const handleEditClick = (doc: DocumentModel, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNew(false);
    setEditId(doc.id);
    setEditTitle(doc.title);
    setEditDescription(doc.description || '');
    setEditType(doc.type || 'PRD');
    setEditLink(doc.link || '');
    setEditFile(null);
    setShouldRemoveFile(false);
    setShowFormModal(true);
  };

  // Trigger Confirmation Dialog for Deleting documentation
  const handleDeleteClick = (doc: DocumentModel, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocForDelete(doc);
    setShowDeleteConfirmModal(true);
  };

  // Helper to convert uploaded files to Base64 format
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle Form Submission (Save or Update)
  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Judul dokumen wajib diisi");
      return;
    }
    setLoading(true);
    try {
      let fileData = null;
      let fileName = shouldRemoveFile ? "" : (editId ? (documents.find(d => d.id === editId)?.fileName || "") : "");
      let fileTypeStr = shouldRemoveFile ? "" : (editId ? (documents.find(d => d.id === editId)?.fileType || "") : "");

      if (editFile) {
        fileData = await fileToBase64(editFile);
        fileName = editFile.name;
        fileTypeStr = editFile.type || 'application/octet-stream';
      }

      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
        link: editLink.trim(),
        createdBy: currentUser?.id || currentUser?.uid || (users.length > 0 ? users[0].id : "3")
      };

      if (editFile) {
        payload.fileData = fileData;
        payload.fileName = fileName;
        payload.fileType = fileTypeStr;
      } else if (shouldRemoveFile) {
        payload.fileData = null;
        payload.fileName = "";
        payload.fileType = "";
      }

      const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
      if (isNew) {
        const data = await apiRequest(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          headers: { 
            'x-user-id': effectiveUserId
          },
          body: payload
        });
        if (data.status === 'success') {
          toast.success("Dokumen baru berhasil dibuat!");
          setShowFormModal(false);
          setActiveDocId(null);
          setCurrentPage(1);
          await fetchDocuments();
        } else {
          toast.error(data.message || "Gagal menyimpan dokumen");
        }
      } else if (editId) {
        const data = await apiRequest(`/api/projects/${projectId}/documents/${editId}`, {
          method: 'PUT',
          headers: { 
            'x-user-id': effectiveUserId
          },
          body: payload
        });
        if (data.status === 'success') {
          toast.success("Dokumen berhasil diperbarui!");
          setShowFormModal(false);
          setActiveDocId(null);
          setCurrentPage(1);
          await fetchDocuments();
        } else {
          toast.error(data.message || "Gagal mengupdate dokumen");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan sistem saat menyimpan");
    } finally {
      setLoading(false);
    }
  };

  // Handle Confirmed Delete action
  const handleConfirmDelete = async () => {
    if (!selectedDocForDelete) return;
    setLoading(true);
    const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
    try {
      const data = await apiRequest(`/api/projects/${projectId}/documents/${selectedDocForDelete.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': effectiveUserId }
      });
      if (data.status === 'success') {
        toast.success("Dokumen berhasil dihapus!");
        
        // If the deleted doc was the selected active one, select another
        if (activeDocId === selectedDocForDelete.id) {
          const remaining = documents.filter(d => d.id !== selectedDocForDelete.id);
          setActiveDocId(remaining.length > 0 ? remaining[0].id : null);
          setMobileActiveView('list');
        }
        
        setShowDeleteConfirmModal(false);
        setSelectedDocForDelete(null);
        await fetchDocuments();
      } else {
        toast.error(data.message || "Gagal menghapus dokumen");
        setShowDeleteConfirmModal(false);
        setSelectedDocForDelete(null);
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan saat menghapus");
      setShowDeleteConfirmModal(false);
      setSelectedDocForDelete(null);
    } finally {
      setLoading(false);
    }
  };

  // Download logic for attached files
  const handleDownload = async (docId: string, fName: string) => {
    toast.info("Mendownload berkas lampiran...");
    const effectiveUserId = currentUser?.id || currentUser?.uid || "guest";
    try {
      const data = await apiRequest(`/api/projects/${projectId}/documents/${docId}/download`, {
        headers: { 'x-user-id': effectiveUserId }
      });
      if (data.status === 'success' && data.data && data.data.fileData) {
        const link = document.createElement("a");
        link.href = data.data.fileData;
        link.download = fName || "Document";
        link.click();
        fetchDocuments(); // Update download statistics
      } else {
        toast.error("File tidak ditemukan di server");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal mengunduh file");
    }
  };

  // Helper UI methods
  const getUserName = (id?: string) => {
    if (!id || id === "guest" || id === "admin" || id === currentUser?.id || id === currentUser?.uid) {
      return currentUser?.displayName || currentUser?.username || "Administrator";
    }
    const u = users.find(u => u.id === id || u.uid === id);
    return u?.displayName || u?.username || currentUser?.displayName || "Administrator";
  };

  const getUserInitials = (id: string) => {
    const name = getUserName(id);
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
  };

  const getEmbedUrl = (url?: string): string => {
    if (!url) return "";
    let trimmed = url.trim();
    if (trimmed.includes("docs.google.com/document")) {
      if (trimmed.includes("/edit")) {
        return trimmed.split("/edit")[0] + "/preview";
      }
      return trimmed;
    }
    if (trimmed.includes("docs.google.com/spreadsheets")) {
      if (trimmed.includes("/edit")) {
        return trimmed.split("/edit")[0] + "/preview?widget=true&headers=false";
      }
      return trimmed;
    }
    if (trimmed.includes("docs.google.com/presentation")) {
      if (trimmed.includes("/edit")) {
        return trimmed.split("/edit")[0] + "/embed?start=false&loop=false&delayms=3000";
      }
      return trimmed;
    }
    return trimmed;
  };

  // Drag and drop events for file uploading
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setEditFile(e.dataTransfer.files[0]);
      setShouldRemoveFile(false);
      toast.success(`File terpilih: ${e.dataTransfer.files[0].name}`);
    }
  };

  // Color classes map for document categories
  const getCategoryStyles = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PRD':
        return {
          bg: 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100/50',
          badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wider uppercase whitespace-nowrap inline-block',
          accent: 'border-indigo-500'
        };
      case 'PANDUAN':
        return {
          bg: 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100/50',
          badge: 'bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wider uppercase whitespace-nowrap inline-block',
          accent: 'border-blue-500'
        };
      case 'LAPORAN':
        return {
          bg: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50',
          badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wider uppercase whitespace-nowrap inline-block',
          accent: 'border-emerald-500'
        };
      case 'SPESIFIKASI':
        return {
          bg: 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100/50',
          badge: 'bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wider uppercase whitespace-nowrap inline-block',
          accent: 'border-violet-500'
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100/50',
          badge: 'bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg tracking-wider uppercase whitespace-nowrap inline-block',
          accent: 'border-slate-500'
        };
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PRD':
        return <Layers className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />;
      case 'PANDUAN':
        return <BookOpen className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />;
      case 'LAPORAN':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform duration-300" />;
      case 'SPESIFIKASI':
        return <FileCheck className="w-3.5 h-3.5 text-violet-600 group-hover:scale-110 transition-transform duration-300" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:scale-110 transition-transform duration-300" />;
    }
  };

  const getCategoryGlow = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'PRD':
        return 'from-indigo-400/80 via-indigo-500/80 to-indigo-400/80';
      case 'PANDUAN':
        return 'from-blue-400/80 via-blue-500/80 to-blue-400/80';
      case 'LAPORAN':
        return 'from-emerald-400/80 via-emerald-500/80 to-emerald-400/80';
      case 'SPESIFIKASI':
        return 'from-violet-400/80 via-violet-500/80 to-violet-400/80';
      default:
        return 'from-slate-400/80 via-slate-500/80 to-slate-400/80';
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {!activeDocId ? (
        <div className="w-full flex-1 flex flex-col p-3 md:p-6 min-h-0 overflow-hidden bg-[#f4f7f9] text-left font-sans">
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden">
          
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Header / Action Bar */}
            <div className="p-6 md:p-7 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-2xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Documentation</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Manage project documentation, PRDs, specs, and engineering guidelines.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200/80 rounded-lg text-xs placeholder:text-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-700 font-semibold shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {canCreate && (
                  <button
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add Document
                  </button>
                )}
              </div>
            </div>

            {/* Datatable Container */}
            <div className="flex-1 overflow-x-auto overflow-y-auto m-6 bg-white rounded-lg border border-slate-200/60 shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-5 w-16 text-center">No</th>
                    <th className="py-4 px-5">Document Title</th>
                    <th className="py-4 px-5 w-40">Category</th>
                    <th className="py-4 px-5 w-48">Document File</th>
                    <th className="py-4 px-5 w-48">Author</th>
                    <th className="py-4 px-5 w-36">Last Updated</th>
                    <th className="py-4 px-5 w-32 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {currentDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400">
                        <div className="w-14 h-14 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                          <FileText className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">No documents found</p>
                        <p className="text-xs text-slate-400 mt-1">Create a new document or adjust your search keyword.</p>
                      </td>
                    </tr>
                  ) : (
                    currentDocs.map((doc, index) => {
                      const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                      const creatorName = getUserName(doc.createdBy);
                      const style = getCategoryStyles(doc.type);
                      const lastEdited = doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-";

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => {
                            setActiveDocId(doc.id);
                            setMobileActiveView('detail');
                          }}
                          className="hover:bg-slate-50/60 transition-colors duration-200 group cursor-pointer"
                        >
                          <td className="py-4 px-5 text-center text-slate-400 font-bold">
                            {String(srNo).padStart(2, "0")}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            <div className="line-clamp-1">{doc.title}</div>
                            {doc.description && (
                              <div className="text-slate-400 font-normal text-[11px] line-clamp-1 mt-0.5">
                                {doc.description}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <span className={style.badge}>
                              {doc.type}
                            </span>
                          </td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            {doc.fileName ? (
                              <button
                                onClick={() => handleDownload(doc.id, doc.fileName)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer group/file"
                                title="Klik untuk mengunduh berkas"
                              >
                                <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600 group-hover/file:scale-110 transition-transform" />
                                <span className="truncate max-w-[140px]">{doc.fileName}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 italic text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-slate-700 font-semibold">
                            {creatorName}
                          </td>
                          <td className="py-4 px-5 text-slate-500 font-medium">
                            {lastEdited}
                          </td>
                          <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setActiveDocId(doc.id);
                                  setMobileActiveView('detail');
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                title="View document details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(doc, e)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete document"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Pagination */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 font-semibold">
                Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold px-2 text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
      ) : (
        <div className="w-full flex-1 flex flex-col p-3 md:p-6 min-h-0 overflow-hidden bg-[#f4f7f9] text-left font-sans">
      <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        
        {/* MAIN VIEWPORT: ACTIVE DOCUMENT VIEW */}
        <div className="flex-1 bg-[#f8fafc] flex flex-col h-full overflow-hidden transition-all">
          {activeDoc ? (
            <div className="flex-1 flex flex-col h-full min-h-0">
              
              {/* Document view header with utility toolbar */}
              <div className="p-4 md:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-white shadow-sm relative overflow-hidden">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <button
                    onClick={() => setActiveDocId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Kembali ke Daftar Dokumen"
                  >
                    <ChevronLeft className="w-4 h-4" /> Daftar
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 select-none">
                      <span className={getCategoryStyles(activeDoc.type).badge}>
                        {activeDoc.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <User className="w-3 h-3" /> {getUserName(activeDoc.createdBy)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 
                        {new Date(activeDoc.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h2 className="text-sm md:text-base font-black text-slate-900 tracking-tight leading-snug mt-1 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate">{activeDoc.title}</span>
                    </h2>
                  </div>
                </div>

                {/* Standardized top utility toolbar */}
                <div className="flex items-center gap-2 shrink-0 z-10 select-none bg-slate-50 md:bg-transparent p-1.5 md:p-0 rounded-xl">
                  {/* Download button if document has a file */}
                  {activeDoc.fileName && (
                    <button
                      onClick={() => handleDownload(activeDoc.id, activeDoc.fileName)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] border border-emerald-100 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      title="Unduh Lampiran Berkas"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Unduh</span>
                    </button>
                  )}

                  {/* Fullscreen Toggle */}
                  {(activeDoc.fileName || activeDoc.link) && (
                    <button
                      onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1.5 font-black text-[10px] border rounded-lg transition-all cursor-pointer whitespace-nowrap",
                        isFullscreenPreview 
                          ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                      title={isFullscreenPreview ? "Keluar Layar Penuh" : "Pratinjau Layar Penuh"}
                    >
                      {isFullscreenPreview ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isFullscreenPreview ? "Normal" : "Layar Penuh"}</span>
                    </button>
                  )}

                  {/* Edit & Delete Action Row (Hidden if user has only read-only permission) */}
                  {canUpdate && (
                    <button
                      onClick={(e) => handleEditClick(activeDoc, e)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer border border-slate-200 bg-white"
                      title="Ubah Judul & Kategori"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => handleDeleteClick(activeDoc, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border border-slate-200 bg-white"
                      title="Hapus Dokumentasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Split-Pane Dual Workspace Layout */}
              <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden p-3 gap-3">
                
                {/* LEFT PANE / MAIN VIEW (DOCUMENT VIEWER) */}
                <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl flex flex-col min-h-0 overflow-hidden relative shadow-sm">
                  {/* Title Bar Left Pane */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0 select-none">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      Pratinjau Dokumen Utama
                    </span>
                    {activeDoc.fileName && (
                      <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Disematkan: {activeDoc.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    )}
                  </div>

                  {/* Left Pane Workspace View State */}
                  <div className="flex-1 min-h-0 relative bg-slate-50/50 flex flex-col">
                    {previewLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                        <p className="text-xs font-bold text-slate-500">Memuat pratinjau dokumen...</p>
                      </div>
                    ) : previewFileData ? (
                      /* Embedded Document Viewer with Bulletproof Safe View Actions */
                      <div className="flex-1 flex flex-col relative bg-slate-50 min-h-0 overflow-hidden">
                        {/* Safe View Toolbar Info Bar */}
                        <div className="bg-amber-50 border-b border-amber-200/60 p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs z-10 shrink-0">
                          <div className="flex items-start gap-2.5">
                            <span className="p-1 bg-amber-100 text-amber-800 rounded-lg mt-0.5 shrink-0">
                              <Info className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <p className="font-extrabold text-amber-950 leading-tight">Pratinjau PDF Terbatas di Iframe</p>
                              <p className="text-[10px] text-amber-800/90 font-bold mt-0.5 leading-normal">
                                Keamanan Chrome memblokir PDF blob di dalam iframe bersandbox. Klik tombol di samping untuk membuka dokumen dengan lancar.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <a
                              href={previewFileData}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-[10px] uppercase tracking-wide rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Buka di Tab Baru
                            </a>

                            <button
                              onClick={() => handleDownload(activeDoc.id, activeDoc.fileName)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 font-black text-[10px] uppercase tracking-wide border border-slate-200 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                            >
                              <Download className="w-3 h-3 text-indigo-600" />
                              Unduh PDF
                            </button>
                          </div>
                        </div>

                        {/* PDF Frame */}
                        <div className="flex-1 relative min-h-0 bg-white">
                          <iframe
                            src={previewFileData}
                            className="w-full h-full border-none absolute inset-0 bg-white"
                            title={activeDoc.title}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    ) : activeDoc.link ? (
                      /* Embed Google Doc Preview */
                      <iframe
                        src={getEmbedUrl(activeDoc.link)}
                        className="w-full h-full border-none absolute inset-0 bg-white"
                        title={activeDoc.title}
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    ) : (
                      /* Empty State: Drag-Drop File Uploader */
                      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/40">
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => {
                            if (canUpdate) directFileInputRef.current?.click();
                          }}
                          className={cn(
                            "border-2 border-dashed rounded-3xl p-6 max-w-sm w-full flex flex-col items-center justify-center gap-3 text-center group transition-all bg-white shadow-sm",
                            canUpdate 
                              ? "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/5 hover:shadow-md" 
                              : "cursor-not-allowed opacity-70 border-slate-200"
                          )}
                        >
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 tracking-tight group-hover:text-indigo-950 transition-colors">
                              Belum Ada Lampiran Berkas
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1 max-w-xs mx-auto">
                              {canUpdate 
                                ? "Seret & lepaskan file PDF spesifikasi teknis di sini, atau klik untuk memilih file dari komputer Anda." 
                                : "Pengguna dengan akses edit dapat mengunggah dokumen PDF spesifikasi di sini."}
                            </p>
                          </div>
                          
                          {canUpdate && (
                            <input 
                              type="file" 
                              ref={directFileInputRef} 
                              className="hidden" 
                              accept=".pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const selected = e.target.files[0];
                                  const check = validateFileClient(selected);
                                  if (!check.valid) {
                                    toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
                                    return;
                                  }
                                  handleDirectUpload(selected);
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT PANE / SIDE WIDGET (CATATAN & KOMENTAR CHAT BUBBLE) */}
                <div className={cn(
                  "w-full md:w-[350px] lg:w-[400px] shrink-0 bg-white border border-slate-200/80 rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-sm transition-all duration-300",
                  isFullscreenPreview ? "hidden md:hidden" : "flex"
                )}>
                  {/* Side Pane Header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between shrink-0 select-none">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      Catatan & Komentar Diskusi
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                      {(activeDocId ? (docCommentsMap[activeDocId] || []) : []).length} Catatan
                    </span>
                  </div>

                  {/* Comments Chat Bubbles Area */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-slate-50/30">
                    {(!activeDocId || (docCommentsMap[activeDocId] || []).length === 0) ? (
                      <div className="text-center py-12 px-4 my-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-500 shadow-xs">
                          <MessageSquare className="w-6 h-6" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">Belum Ada Catatan / Komentar</h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-1 leading-normal">
                          Siapa pun dapat memberikan catatan teknis, instruksi rilis, atau umpan balik untuk dokumen ini.
                        </p>
                      </div>
                    ) : (
                      (docCommentsMap[activeDocId] || []).map((comment) => {
                        const isMine = currentUser && (comment.userId === currentUser.uid || comment.userId === currentUser.id || comment.userName === currentUser.displayName);
                        return (
                          <div key={comment.id} className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "p-3.5 rounded-2xl max-w-[85%] md:max-w-2xl shadow-xs",
                              isMine ? "bg-indigo-600 text-white border-0" : "bg-white text-slate-700 border border-gray-200"
                            )}>
                              <div className={cn(
                                "flex items-center justify-between mb-1.5 gap-3",
                                isMine ? "flex-row-reverse" : "flex-row"
                              )}>
                                <div className={cn("flex items-center gap-2", isMine ? "flex-row-reverse" : "flex-row")}>
                                  <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center uppercase shrink-0 shadow-xs">
                                    {(comment.userName[0] || "U")}
                                  </div>
                                  <span className={cn(
                                    "text-xs font-bold tracking-tight",
                                    isMine ? "text-white" : "text-slate-800"
                                  )}>
                                    {comment.userName}
                                  </span>
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  isMine ? "text-white/80" : "text-gray-400"
                                )}>
                                  {new Date(comment.createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </span>
                              </div>
                              <p className={cn(
                                "text-xs leading-relaxed whitespace-pre-wrap break-words font-medium",
                                isMine ? "text-white" : "text-slate-700"
                              )}>
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Bar for Comments */}
                  <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3.5 py-1.5 border border-slate-200/60 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                      <input
                        type="text"
                        placeholder="Tulis catatan atau komentar..."
                        value={newDocCommentText}
                        onChange={(e) => setNewDocCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSendingDocComment && newDocCommentText.trim()) {
                            handleSendDocComment();
                          }
                        }}
                        className="w-full bg-transparent border-0 focus:ring-0 outline-none text-xs text-slate-800 placeholder:text-slate-400 py-1 font-medium"
                      />
                      <button
                        onClick={handleSendDocComment}
                        disabled={!newDocCommentText.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer rounded-full transition-all shrink-0 shadow-xs flex items-center justify-center"
                        title="Kirim Catatan"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Immersive Workspace Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10 hover:bg-slate-50/20 transition-all duration-300 select-none">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50/70 border border-indigo-100/60 flex items-center justify-center mb-6 shadow-sm shadow-indigo-100/30">
                <BookOpen className="w-9 h-9 text-indigo-500 animate-pulse" />
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Pilih atau Buat Dokumentasi
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-2 max-w-sm leading-relaxed mx-auto">
                Pilih salah satu dokumen di panel kiri atau klik tombol tambah di sidebar untuk mengunggah spesifikasi atau membuat catatan proyek baru.
              </p>
              {canCreate && (
                <button
                  onClick={handleCreateNew}
                  className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> TAMBAH DOKUMEN BARU
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

      {/* OVERLAY PORT (MODALS) */}
      <AnimatePresence>
        
        {/* ==============================================================
            A. FORM MODAL (POP-UP FORM UNTUK CREATE & EDIT)
            ============================================================== */}
        {showFormModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col relative overflow-hidden my-auto max-h-[90vh]"
            >
              {/* Modal header decor */}
              <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-200 flex justify-between items-center select-none">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/15">
                    {isNew ? <Plus className="w-4.5 h-4.5" /> : <Edit2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-black text-slate-950 tracking-tight">
                      {isNew ? 'Tambah Dokumen Baru' : 'Ubah Data Dokumentasi'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">FORMULIR DOKUMENTASI PROYEK</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form entries body */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-5">
                
                {/* Title Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    Judul Dokumen <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Contoh: PRD Fitur Pembayaran, SOP Server Production, dll"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 px-3 py-2.5 rounded-xl text-xs font-black text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Markdown Text Description Input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center select-none">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                      Rangkuman / Catatan Dokumentasi
                    </label>
                    <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                      Mendukung Markdown 📝
                    </span>
                  </div>
                  <textarea 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Tuliskan spesifikasi detail, instruksi instalasi, atau memo kerja di sini..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 min-h-[120px] resize-y font-sans"
                  />
                </div>

                {/* Dropdowns & Links Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Type drop-down selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                      Jenis Kategori
                    </label>
                    <div className="relative">
                      <select 
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 pl-3 pr-8 py-2.5 rounded-xl text-xs font-black text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 appearance-none cursor-pointer transition-all"
                      >
                        {documentTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  {/* External URL Link */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                      Tautan Google Docs / Slides (Opsional)
                    </label>
                    <input 
                      type="url" 
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      placeholder="https://docs.google.com/document/..."
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 font-mono"
                    />
                  </div>
                </div>

                {/* File Uploading Drag-Drop Sandbox */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    Lampiran Berkas (PDF / DOCX / XLSX)
                  </label>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer text-center group transition-all",
                      dragActive 
                        ? "border-indigo-500 bg-indigo-50/50" 
                        : "border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/10"
                    )}
                  >
                    <Upload className={cn("w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors", dragActive && "text-indigo-600")} />

                    {editFile ? (
                      <div>
                        <p className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {editFile.name}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                          Klik untuk mengganti berkas lampiran
                        </p>
                      </div>
                    ) : (isNew === false && editId && documents.find(d => d.id === editId)?.fileName && !shouldRemoveFile) ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg justify-center w-max mx-auto">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <p className="text-[11px] font-bold text-slate-700 max-w-[150px] truncate">
                            {documents.find(d => d.id === editId)?.fileName}
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            Klik area untuk mengunggah berkas baru
                          </p>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShouldRemoveFile(true);
                              toast.info("Lampiran lama akan terhapus setelah disimpan");
                            }}
                            className="text-[8px] font-black text-rose-600 bg-rose-50 border border-rose-100 p-0.5 px-1.5 rounded hover:bg-rose-100 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-700 group-hover:text-indigo-900 transition-colors">
                          Pilih berkas dari komputer Anda
                        </h4>
                        <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                          Seret & lepaskan berkas di sini (Maks 10MB)
                        </p>
                      </div>
                    )}

                    {shouldRemoveFile && !editFile && (
                      <div className="p-0.5 px-2 bg-rose-50 text-rose-700 border border-rose-100 rounded text-[8px] font-bold">
                        Lampiran lama akan terhapus
                      </div>
                    )}

                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const selected = e.target.files[0];
                          const check = validateFileClient(selected);
                          if (!check.valid) {
                            toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
                            return;
                          }
                          setEditFile(selected);
                          setShouldRemoveFile(false);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 select-none">
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? "Menyimpan..." : "Simpan Dokumen"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ==============================================================
            B. CONFIRMATION POP-UP ALERT (FOR DELETE VERIFICATION)
            ============================================================== */}
        {showDeleteConfirmModal && !!selectedDocForDelete && (
          <ConfirmationModal
            isOpen={showDeleteConfirmModal && !!selectedDocForDelete}
            onClose={() => {
              setShowDeleteConfirmModal(false);
              setSelectedDocForDelete(null);
            }}
            onConfirm={handleConfirmDelete}
            title="Hapus Dokumentasi?"
            message={
              selectedDocForDelete
                ? `Apakah Anda yakin ingin menghapus dokumen "${selectedDocForDelete.title}"? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`
                : ""
            }
            confirmText="Ya, Hapus"
            cancelText="Batal"
            variant="danger"
            isLoading={loading}
          />
        )}

      </AnimatePresence>
    </div>
  );
};
