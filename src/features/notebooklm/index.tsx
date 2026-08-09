import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, FileText, Plus, Trash2, CheckSquare, Square, 
  Send, Bot, User, Volume2, VolumeX, Play, Pause, 
  Bookmark, Download, Copy, RefreshCw, Layers, BookOpen, 
  Video, Check, FileCode, Search, HelpCircle, FileCheck,
  Upload, FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { validateFileClient } from '../../lib/fileSecurity';
import Markdown from 'react-markdown';
import { Project, AppRole } from '../../types';
import { hasPermission } from '../../lib/permissions';

interface Source {
  id: string;
  title: string;
  content: string;
  type: 'wiki' | 'meeting' | 'file' | 'custom';
  active: boolean;
  wordCount: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface StudioNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface NotebookLMProps {
  project: Project;
  userRole?: string;
  currentUser?: any;
}

export const NotebookLM: React.FC<NotebookLMProps> = ({ project, userRole = 'viewer', currentUser }) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loadingSources, setLoadingSources] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  
  // Custom Source Modal state & File Upload
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreate = hasPermission(userRole as AppRole, 'notebooklm', 'create', false, currentUser?.permissions);
  const canDelete = hasPermission(userRole as AppRole, 'notebooklm', 'delete', false, currentUser?.permissions);

  const handleFileUpload = (files: FileList | File[] | null) => {
    if (!canCreate) {
      toast.error('Anda tidak memiliki izin untuk menambah dokumen ke NotebookLM.');
      return;
    }
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles: File[] = [];
    for (const f of fileList) {
      const check = validateFileClient(f);
      if (!check.valid) {
        toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
      } else {
        validFiles.push(f);
      }
    }
    if (validFiles.length === 0) return;

    let loadedCount = 0;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const textResult = e.target?.result;
        let contentText = '';

        if (typeof textResult === 'string') {
          contentText = textResult.trim();
        }

        if (!contentText) {
          contentText = `[Dokumen Terunggah: ${file.name} - Ukuran ${(file.size / 1024).toFixed(1)} KB - Tipe: ${file.type || 'Dokumen'}]`;
        }

        const newSource: Source = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: file.name,
          content: contentText,
          type: 'file',
          active: true,
          wordCount: contentText.split(/\s+/).filter(Boolean).length
        };

        setSources(prev => [newSource, ...prev]);
        setSelectedSourceId(newSource.id);
        loadedCount++;

        if (loadedCount === fileList.length) {
          toast.success(`${fileList.length} dokumen berhasil diunggah dan terpasang ke NotebookLM!`);
          setShowAddModal(false);
        }
      };

      reader.onerror = () => {
        toast.error(`Gagal membaca dokumen "${file.name}"`);
      };

      // Read plain text / markdown / csv / json / code / documents
      reader.readAsText(file);
    });
  };

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-pro' | 'gemini-3.6-flash' | 'gemini-1.5-pro'>('gemini-2.5-pro');

  // Studio Notes State
  const [studioNotes, setStudioNotes] = useState<StudioNote[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'overview' | 'notes'>('chat');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Overview State
  const [overviewContent, setOverviewContent] = useState<string>('');
  const [overviewType, setOverviewType] = useState<'summary' | 'qa' | 'podcast' | 'briefing' | 'study_guide'>('summary');
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);

  // Audio TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioVoice, setAudioVoice] = useState<'Kore' | 'Puck' | 'Zephyr' | 'Fenrir'>('Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Load existing Project Wiki & Meeting Notes automatically into available sources
  useEffect(() => {
    loadProjectSources();
  }, [project.id]);

  const loadProjectSources = async () => {
    setLoadingSources(true);
    try {
      const token = localStorage.getItem('token') || '';
      const initialSources: Source[] = [];

      // 1. Fetch Wiki / Dokumentasi
      try {
        const wikiRes = await fetch(`/api/projects/${project.id}/wiki`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const docs = Array.isArray(wikiData) ? wikiData : (wikiData.data || []);
          docs.forEach((doc: any, index: number) => {
            const text = doc.content || doc.description || doc.body || '';
            initialSources.push({
              id: `wiki-${doc.id || index}`,
              title: `[Dokumentasi] ${doc.title || doc.name || 'Dokumen ' + (index + 1)}`,
              content: text,
              type: 'wiki',
              active: true,
              wordCount: text.split(/\s+/).filter(Boolean).length
            });
          });
        }
      } catch (err) {
        console.warn('Could not load wiki sources:', err);
      }

      // 2. Fetch Meeting Notes
      try {
        const meetingRes = await fetch(`/api/projects/${project.id}/meetings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meetingRes.ok) {
          const meetingData = await meetingRes.json();
          const meetings = Array.isArray(meetingData) ? meetingData : (meetingData.data || []);
          meetings.forEach((m: any, index: number) => {
            const text = m.transcript || m.aiSummary || m.notes || '';
            if (text.trim()) {
              initialSources.push({
                id: `meeting-${m.id || index}`,
                title: `[Rapat] ${m.title || m.topic || 'Notulen Rapat ' + (index + 1)}`,
                content: text,
                type: 'meeting',
                active: true,
                wordCount: text.split(/\s+/).filter(Boolean).length
              });
            }
          });
        }
      } catch (err) {
        console.warn('Could not load meeting sources:', err);
      }

      setSources(initialSources);
      if (initialSources.length > 0) {
        setSelectedSourceId(initialSources[0].id);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    } finally {
      setLoadingSources(false);
    }
  };

  const toggleSourceActive = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const toggleAllSources = (active: boolean) => {
    setSources(prev => prev.map(s => ({ ...s, active })));
  };

  const handleDeleteSource = (id: string) => {
    if (!canDelete) {
      toast.error('Anda tidak memiliki izin untuk menghapus sumber data NotebookLM.');
      return;
    }
    setSources(prev => prev.filter(s => s.id !== id));
    toast.success('Sumber data dihapus.');
  };

  const activeSources = sources.filter(s => s.active);
  const totalActiveWords = activeSources.reduce((acc, curr) => acc + curr.wordCount, 0);

  // Chat with NotebookLM API
  const handleSendMessage = async (promptOverride?: string) => {
    const textToSend = promptOverride || inputPrompt;
    if (!textToSend.trim()) return;

    if (activeSources.length === 0) {
      toast.warning('Pilih minimal 1 sumber data terpasang untuk memulai analisis NotebookLM.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMessage]);
    if (!promptOverride) setInputPrompt('');
    setIsGenerating(true);

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/notebooklm/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: project.id,
          sources: activeSources,
          prompt: textToSend,
          model: selectedModel,
          history: chatHistory.map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal memproses pertanyaan');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Tidak ada respon.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatHistory(prev => [...prev, botMessage]);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memanggil AI NotebookLM.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Overview
  const handleGenerateOverview = async (type: 'summary' | 'qa' | 'podcast' | 'briefing' | 'study_guide') => {
    if (activeSources.length === 0) {
      toast.warning('Centang minimal 1 sumber data untuk membuat overview.');
      return;
    }
    setOverviewType(type);
    setIsOverviewLoading(true);
    setActiveTab('overview');

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/notebooklm/generate-overview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sources: activeSources,
          type
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal membuat overview');
      }

      setOverviewContent(data.content || '');
      toast.success('Overview berhasil dibuat!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat overview.');
    } finally {
      setIsOverviewLoading(false);
    }
  };

  // Save AI Response to Studio Notes
  const handleSaveToNotes = (title: string, content: string) => {
    const newNote: StudioNote = {
      id: `note-${Date.now()}`,
      title: title || 'Catatan Baru NotebookLM',
      content,
      createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    setStudioNotes(prev => [newNote, ...prev]);
    toast.success('Disimpan ke Catatan Studio NotebookLM!');
  };

  // Generate Speech Audio via Gemini TTS API
  const handleGenerateTTS = async (text: string) => {
    if (!text.trim()) return;
    setIsAudioLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch('/api/notebooklm/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          voiceName: audioVoice
        })
      });

      const data = await response.json();
      if (!response.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal membuat audio TTS');
      }

      if (data.audioBase64) {
        const src = `data:audio/wav;base64,${data.audioBase64}`;
        setAudioUrl(src);
        setIsPlayingAudio(true);
        toast.success('Audio Overview berhasil dihasilkan!');
      }
    } catch (err: any) {
      console.warn('Falling back to browser speech synthesis:', err);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#_\-\`]/g, '').slice(0, 500));
        utterance.lang = 'id-ID';
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
        toast.success('Memutar audio dengan sintesis suara...');
      } else {
        toast.error('Gagal memproses audio.');
      }
    } finally {
      setIsAudioLoading(false);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  return (
    <div id="notebooklm-container" className="flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl transition-colors">
      {/* Header Bar */}
      <header id="notebooklm-header" className="flex items-center justify-between px-6 py-4 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-md shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-700 via-indigo-600 to-slate-800 dark:from-purple-300 dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                NotebookLM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-500/30">
                AI Grounded Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Proyek: <span className="text-purple-600 dark:text-purple-300">{project.name}</span>
            </p>
          </div>
        </div>

        {/* Model Selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Model AI:</span>
          <select
            value={selectedModel}
            onChange={(e: any) => setSelectedModel(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition-all"
          >
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Penalaran & Riset Komplit)</option>
            <option value="gemini-3.6-flash">Gemini 3.6 Flash (Super Cepat)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Konteks Panjang)</option>
          </select>
        </div>
      </header>

      {/* Main Grid: Left Sidebar Sources + Right Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Sources Panel */}
        <aside id="notebooklm-sources-sidebar" className="w-80 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Sumber Data ({sources.length})</span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-600/20 dark:hover:bg-purple-600/40 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200 dark:border-purple-500/30 transition-colors flex items-center gap-1 text-xs font-medium"
              title="Tambah Sumber Manual"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Active stats bar */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>{activeSources.length} tercentang ({totalActiveWords.toLocaleString()} kata)</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => toggleAllSources(true)} 
                className="hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors"
                title="Centang Semua"
              >
                Semua
              </button>
              <span>|</span>
              <button 
                onClick={() => toggleAllSources(false)} 
                className="hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors"
                title="Hapus Centang Semua"
              >
                Nircentang
              </button>
            </div>
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingSources ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-xs gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                <span>Memuat dokumen proyek...</span>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-100/50 dark:bg-slate-900/30">
                <FileCode className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Belum ada sumber data terpasang</p>
                <p className="text-[11px] text-slate-500 mt-1">Klik tombol "+ Tambah" di atas atau buat Notulen Rapat / Wiki di proyek ini.</p>
              </div>
            ) : (
              <AnimatePresence>
                {sources.map(source => {
                  const isSelected = selectedSourceId === source.id;
                  return (
                    <motion.div
                      key={source.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-500 dark:border-purple-500/70 shadow-md ring-1 ring-purple-500/30'
                          : source.active 
                            ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-purple-800/50 shadow-sm' 
                            : 'bg-slate-100/60 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/50 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSourceActive(source.id);
                          }}
                          className="mt-0.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors shrink-0"
                          title="Centang untuk Konteks AI"
                        >
                          {source.active ? (
                            <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {source.type === 'wiki' && <FileText className="w-3 h-3 text-blue-500 shrink-0" />}
                            {source.type === 'meeting' && <Video className="w-3 h-3 text-emerald-500 shrink-0" />}
                            {source.type === 'custom' && <BookOpen className="w-3 h-3 text-purple-500 shrink-0" />}
                            {source.type === 'file' && <FileCode className="w-3 h-3 text-amber-500 shrink-0" />}
                            
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-purple-900 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                              {source.title}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {source.content || 'Kosong'}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="flex items-center gap-1">
                              {source.wordCount} kata
                              {isSelected && <span className="text-purple-600 dark:text-purple-400 font-bold">• Aktif Dibaca</span>}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSource(source.id);
                              }}
                              className="hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                              title="Hapus Sumber"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </aside>

        {/* Right Work Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950/20">
          {/* Active Document Switching Banner Bar */}
          {sources.length > 0 && (
            <div className="p-3 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Pilih Dokumen Pratinjau ({sources.length}):</span>
                </span>
                
                {selectedSourceId && (
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/50">
                    <Sparkles className="w-3 h-3" />
                    Transisi Halus Aktif
                  </span>
                )}
              </div>

              {/* Document Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {sources.map(source => {
                  const isSelected = selectedSourceId === source.id;
                  return (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                          : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {source.type === 'wiki' && <FileText className="w-3 h-3" />}
                      {source.type === 'meeting' && <Video className="w-3 h-3" />}
                      {source.type === 'custom' && <BookOpen className="w-3 h-3" />}
                      {source.type === 'file' && <FileCode className="w-3 h-3" />}
                      <span className="truncate max-w-[160px]">{source.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Animated Document Reader Card on Switch */}
              <AnimatePresence mode="wait">
                {(() => {
                  const selectedDoc = sources.find(s => s.id === selectedSourceId);
                  if (!selectedDoc) return null;

                  return (
                    <motion.div
                      key={selectedDoc.id}
                      initial={{ opacity: 0, y: -8, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="mt-3 p-3.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-xl flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                            {selectedDoc.type}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {selectedDoc.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {selectedDoc.content || 'Dokumen kosong.'}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSendMessage(`Jelaskan secara mendalam isi dari dokumen ${selectedDoc.title}`)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg shrink-0 shadow-sm transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Analisis Dokumen Ini</span>
                      </button>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Chat Conversation Display */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatHistory.length === 0 ? (
                  <div className="max-w-2xl mx-auto my-auto text-center py-12 px-6 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-600/20 rounded-2xl border border-purple-200 dark:border-purple-500/30 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Selamat Datang di NotebookLM Studio</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto mb-6">
                      Pilih dokumen di sebelah kiri sebagai konteks sumber data, lalu ajukan pertanyaan atau gunakan preset cepat untuk menghasilkan analisis yang 100% berbasis fakta dokumen.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                      <button
                        onClick={() => handleSendMessage('Apa saja keputusan dan poin penting utama dari seluruh dokumen yang aktif?')}
                        className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-all hover:bg-purple-50/50 dark:hover:bg-slate-850 flex items-start gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <span>"Apa saja keputusan & poin penting utama dari sumber data ini?"</span>
                      </button>

                      <button
                        onClick={() => handleSendMessage('Buatkan daftar tindak lanjut (action items) dan penanggung jawab yang terdeteksi dalam sumber.')}
                        className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-all hover:bg-purple-50/50 dark:hover:bg-slate-850 flex items-start gap-2"
                      >
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>"Buatkan daftar tindak lanjut (action items) dari sumber data."</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  chatHistory.map(msg => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 border border-purple-400/30">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className={`max-w-3xl rounded-2xl p-4 border ${
                        msg.role === 'user' 
                          ? 'bg-purple-600 dark:bg-purple-900/40 border-purple-500 dark:border-purple-700/50 text-white dark:text-purple-100 rounded-tr-none' 
                          : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm dark:shadow-lg'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 dark:text-slate-400">
                          <span className="font-semibold">{msg.role === 'user' ? 'Anda' : 'NotebookLM AI Assistant'}</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <div className="prose prose-slate dark:prose-invert prose-xs max-w-none leading-relaxed">
                          <Markdown>{msg.text}</Markdown>
                        </div>

                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400">
                            <button
                              onClick={() => handleSaveToNotes('Jawaban NotebookLM', msg.text)}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/40 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-all flex items-center gap-1"
                            >
                              <Bookmark className="w-3 h-3" />
                              <span>Simpan ke Catatan</span>
                            </button>

                            <button
                              onClick={() => handleGenerateTTS(msg.text)}
                              disabled={isAudioLoading}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>Bacakan Audio</span>
                            </button>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                                toast.success('Teks tersalin ke clipboard.');
                              }}
                              className="px-2 py-1 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ml-auto"
                              title="Salin Teks"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </div>
                      )}
                    </motion.div>
                  ))
                )}

                {isGenerating && (
                  <div className="flex gap-4 items-center">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-600/30 rounded-xl flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-500/40 animate-pulse">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3 shadow-md">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                      <span>NotebookLM sedang menganalisis {activeSources.length} sumber data terpasang...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-white/90 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 max-w-4xl mx-auto"
                >
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder={
                      activeSources.length > 0 
                        ? `Tanyakan apapun tentang ${activeSources.length} sumber data terpasang...` 
                        : 'Centang sumber data di sebelah kiri terlebih dahulu...'
                    }
                    disabled={isGenerating || activeSources.length === 0}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-purple-500 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !inputPrompt.trim() || activeSources.length === 0}
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 shrink-0"
                  >
                    <span>Kirim</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Studio Overview & Audio Synthesis
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sintesis otomatis dari {activeSources.length} dokumen sumber data.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={audioVoice}
                    onChange={(e: any) => setAudioVoice(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="Kore">Voice: Kore (Wanita Warm)</option>
                    <option value="Puck">Voice: Puck (Pria Enerjik)</option>
                    <option value="Zephyr">Voice: Zephyr (Wanita Formal)</option>
                    <option value="Fenrir">Voice: Fenrir (Pria Deep)</option>
                  </select>

                  {isPlayingAudio ? (
                    <button
                      onClick={stopAudio}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Hentikan Audio</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateTTS(overviewContent || 'Pilih overview terlebih dahulu.')}
                      disabled={!overviewContent || isAudioLoading}
                      className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-pink-600/20 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isAudioLoading ? 'Memproses...' : 'Putar Audio Overview'}</span>
                    </button>
                  )}
                </div>
              </div>

              {isOverviewLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400 text-xs gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Gemini sedang membuat {overviewType}...</span>
                  <p className="text-[11px] text-slate-500">Membaca dan merangkum {activeSources.length} dokumen terpasang.</p>
                </div>
              ) : overviewContent ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl relative">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Hasil Overview ({overviewType.toUpperCase()})</span>
                    <button
                      onClick={() => handleSaveToNotes(`Overview ${overviewType.toUpperCase()}`, overviewContent)}
                      className="px-3 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-600/20 dark:hover:bg-purple-600/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Simpan ke Catatan Studio</span>
                    </button>
                  </div>

                  <div className="prose prose-slate dark:prose-invert prose-sm max-w-none leading-relaxed">
                    <Markdown>{overviewContent}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                  <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Pilih Format Studio Overview</h3>
                  <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
                    Pilih salah satu tombol di bawah ini untuk membuat sintesis otomatis berbasis {activeSources.length} dokumen.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                    <button
                      onClick={() => handleGenerateOverview('summary')}
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-900/40 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Ringkasan Eksekutif</span>
                    </button>

                    <button
                      onClick={() => handleGenerateOverview('qa')}
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>FAQ & Q&A</span>
                    </button>

                    <button
                      onClick={() => handleGenerateOverview('podcast')}
                      className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-pink-50 dark:hover:bg-pink-900/40 border border-slate-200 dark:border-slate-800 hover:border-pink-400 dark:hover:border-pink-500/50 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      <span>Audio Podcast Script</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Catatan Studio NotebookLM ({studioNotes.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kumpulan insight, rangkuman, dan temuan riset yang Anda simpan.
                  </p>
                </div>

                <button
                  onClick={() => {
                    const title = prompt('Judul Catatan Baru:');
                    const content = prompt('Isi Catatan:');
                    if (title && content) handleSaveToNotes(title, content);
                  }}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catatan Baru</span>
                </button>
              </div>

              {studioNotes.length === 0 ? (
                <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                  <Bookmark className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Catatan Saved</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Saat melakukan chat atau overview, klik tombol "Simpan ke Catatan" untuk menyimpan poin penting di sini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studioNotes.map(note => (
                    <div key={note.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm dark:shadow-lg">
                      <div>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                          <h4 className="text-xs font-bold text-purple-700 dark:text-purple-200">{note.title}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">{note.createdAt}</span>
                        </div>
                        <div className="prose prose-slate dark:prose-invert prose-xs line-clamp-6 leading-relaxed">
                          <Markdown>{note.content}</Markdown>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(note.content);
                            toast.success('Isi catatan tersalin!');
                          }}
                          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </button>

                        <button
                          onClick={() => {
                            setStudioNotes(prev => prev.filter(n => n.id !== note.id));
                            toast.success('Catatan dihapus.');
                          }}
                          className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors text-[11px] flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Custom Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Unggah Dokumen Sumber NotebookLM
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="*"
              className="hidden"
            />

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/50 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 hover:border-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-950/20'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Tarik & Lepaskan Berkas Dokumen ke Sini
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  atau <span className="text-purple-600 dark:text-purple-400 font-semibold underline">klik untuk memilih dari komputer</span>
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center pt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">PDF</span>
                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">DOCX / DOC</span>
                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">TXT / MD</span>
                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">CSV / JSON</span>
                <span className="px-2 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded">Dokumen Apapun</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Bisa memilih lebih dari 1 berkas sekaligus.
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NotebookLM;
