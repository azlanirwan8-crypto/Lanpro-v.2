import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, ArrowLeft, Search, X, 
  Minus, Circle, Volume2, VolumeX, Loader2, Check, CheckCheck,
  Paperclip, Image, FileText, Users, Bot, Sparkles, Plus, 
  Download, FileUp, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { validateFileClient } from "../lib/fileSecurity";
import { apiRequest } from "../lib/api";
import { UserProfile } from "../types";
import { usePresence } from "../contexts/PresenceContext";

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  read: boolean | number;
}

interface LiveChatWidgetProps {
  socket: any;
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({ socket, currentUser, allUsers }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatUser, setActiveChatUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({});
  const { onlineUserIds } = usePresence();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(true);

  // Advanced features state
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Virtual Users Setup
  const groupVirtualUser: UserProfile = {
    id: "group",
    uid: "group",
    displayName: "Grup Chat Tim",
    username: "group_chat",
    role: "viewer" as any,
    email: "group@lanpro.com",
    status: "approved",
    passwordHash: "virtual"
  };

  const aiVirtualUser: UserProfile = {
    id: "lanpro-ai",
    uid: "lanpro-ai",
    displayName: "LanPro AI Assistant",
    username: "ai_bot",
    role: "manager" as any,
    email: "ai@lanpro.com",
    status: "approved",
    passwordHash: "virtual"
  };

  // Play a subtle notification sound
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      // Double beep for message
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1); // A5
      
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Sound preview blocked by browser audio policy", e);
    }
  };

  // Register user on socket and load unread counts
  useEffect(() => {
    if (!currentUser || !socket) return;

    // Register user to chat socket mappings
    socket.emit("user_connected", currentUser.id);

    // Fetch initial unread counts
    const fetchUnreadCounts = async () => {
      try {
        const response = await apiRequest(`/api/chat/unread-counts?userId=${currentUser.id}`);
        if (response.status === "success") {
          const counts: Record<string, number> = {};
          response.data.forEach((item: any) => {
            counts[item.senderId] = item.count;
          });
          setUnreadCounts(counts);
        }
      } catch (err) {
        console.warn("Gagal mengambil status pesan belum dibaca:", err);
      }
    };



    fetchUnreadCounts();

    // Listen for real-time socket events




    const handleReceiveMessage = (msg: ChatMessage) => {
      const isCurrentActiveChat = activeChatUser && (
        (msg.receiverId === "group" && activeChatUser.id === "group") ||
        (msg.receiverId !== "group" && msg.senderId === activeChatUser.id)
      );

      if (isCurrentActiveChat) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        if (msg.receiverId !== "group") {
          apiRequest("/api/chat/messages/read", {
            method: "PUT",
            body: { senderId: activeChatUser.id, receiverId: currentUser.id }
          });
        } else {
          localStorage.setItem(`last_read_group_${currentUser.id}`, new Date().toISOString());
        }
        playNotificationSound();
      } else {
        const senderKey = msg.receiverId === "group" ? "group" : msg.senderId;
        
        setUnreadCounts(prev => ({
          ...prev,
          [senderKey]: (prev[senderKey] || 0) + 1
        }));
        
        setLastMessages(prev => ({
          ...prev,
          [senderKey]: msg
        }));
        
        playNotificationSound();
        const displaySenderName = msg.receiverId === "group" 
          ? "Grup Chat Tim" 
          : (allUsers.find(u => u.id === msg.senderId)?.displayName || "Rekan Tim");
          
        toast.info(`Pesan baru di ${displaySenderName}`);
      }
    };

    
    
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      
      
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [currentUser, socket, activeChatUser, allUsers]);

  // Fetch chat history and mark messages as read when active chat user changes
  useEffect(() => {
    if (!currentUser || !activeChatUser) {
      setMessages([]);
      setMsgSearchQuery("");
      setIsMsgSearchOpen(false);
      return;
    }

    const fetchChatHistory = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await apiRequest(`/api/chat/messages?senderId=${currentUser.id}&receiverId=${activeChatUser.id}`);
        if (response.status === "success") {
          setMessages(response.data);
          
          // Mark as read
          if (unreadCounts[activeChatUser.id] > 0) {
            if (activeChatUser.id !== "group") {
              await apiRequest("/api/chat/messages/read", {
                method: "PUT",
                body: { senderId: activeChatUser.id, receiverId: currentUser.id }
              });
            } else {
              localStorage.setItem(`last_read_group_${currentUser.id}`, new Date().toISOString());
            }
            setUnreadCounts(prev => ({
              ...prev,
              [activeChatUser.id]: 0
            }));
          }
        }
      } catch (err) {
        console.error("Gagal memuat riwayat obrolan:", err);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchChatHistory();
  }, [activeChatUser, currentUser]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChatUser, isPartnerTyping]);

  // Fetch last message previews for the user list view
  useEffect(() => {
    if (!currentUser) return;

    const fetchLastMessages = async () => {
      try {
        const response = await apiRequest(`/api/chat/last-messages?userId=${currentUser.id}`);
        if (response.status === "success" && Array.isArray(response.data)) {
          const previews: Record<string, ChatMessage> = {};
          response.data.forEach((msg: any) => {
            previews[msg.partnerId] = msg;
          });
          setLastMessages(previews);

          // Calculate unread count for Group Chat based on localStorage last read
          const lastMsgGroup = previews["group"];
          if (lastMsgGroup) {
            const lastReadStr = localStorage.getItem(`last_read_group_${currentUser.id}`);
            if (lastReadStr) {
              const lastRead = new Date(lastReadStr);
              const msgTs = new Date(lastMsgGroup.timestamp);
              if (msgTs > lastRead && lastMsgGroup.senderId !== currentUser.id) {
                setUnreadCounts(prev => ({
                  ...prev,
                  group: 1
                }));
              }
            } else if (lastMsgGroup.senderId !== currentUser.id) {
              setUnreadCounts(prev => ({
                ...prev,
                group: 1
              }));
            }
          }
        }
      } catch (err) {
        console.warn("Gagal mengambil daftar pesan terakhir:", err);
      }
    };

    fetchLastMessages();
  }, [currentUser, isOpen]);

  if (!currentUser) return null;

  // Trigger Gemini/simulated typing response
  const triggerSimulation = (userMsgText: string, customPartner: UserProfile) => {
    setIsPartnerTyping(true);
    
    setTimeout(async () => {
      try {
        const response = await apiRequest("/api/chat/simulate-reply", {
          method: "POST",
          body: {
            senderId: customPartner.id,
            receiverId: currentUser.id,
            message: userMsgText,
            senderName: customPartner?.displayName || customPartner?.username,
            senderRole: customPartner.role
          }
        });
        
        if (response.status === "success") {
          const simulatedMsg = response.data;
          
          setMessages(prev => {
            if (prev.some(m => m.id === simulatedMsg.id)) return prev;
            return [...prev, simulatedMsg];
          });
          
          setLastMessages(prev => ({
            ...prev,
            [customPartner.id]: simulatedMsg
          }));
          
          if (socket) {
            socket.emit("send_message", simulatedMsg);
          }
          
          playNotificationSound();
        }
      } catch (err) {
        console.warn("Gagal mendapatkan balasan otomatis:", err);
      } finally {
        setIsPartnerTyping(false);
      }
    }, 1800);
  };

  // Handle message submission
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !activeChatUser || !currentUser) return;

    const msgText = inputMessage.trim();
    const timestamp = new Date().toISOString();
    const tempId = crypto.randomUUID();

    const newMessage: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: activeChatUser.id,
      message: msgText,
      timestamp,
      read: false
    };

    // Optimistic state update
    setMessages(prev => [...prev, newMessage]);
    setLastMessages(prev => ({
      ...prev,
      [activeChatUser.id]: newMessage
    }));
    setInputMessage("");

    try {
      // Send via socket in real time
      if (socket) {
        socket.emit("send_message", newMessage);
      }

      // Persist to database
      await apiRequest("/api/chat/messages", {
        method: "POST",
        body: {
          senderId: currentUser.id,
          receiverId: activeChatUser.id,
          message: msgText,
          timestamp
        }
      });

      // Simulation mode: auto response
      const isBot = activeChatUser.id === "lanpro-ai";
      if (isBot || (simulationEnabled && activeChatUser.id !== "group")) {
        triggerSimulation(msgText, activeChatUser);
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
      toast.error("Gagal mengirim pesan, silakan coba lagi.");
    }
  };

  // Handle local File Selection (converts to base64 inline)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatUser) return;

    const check = validateFileClient(file);
    if (!check.valid) {
      toast.error(check.error || "Gagal Mengunggah Dokumen: Format file tidak didukung atau ukuran melebihi batas maksimum (Max 10MB).");
      return;
    }

    setIsUploading(true);
    setIsAttachmentMenuOpen(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setIsUploading(false);
        return;
      }

      const isImage = file.type.startsWith("image/");
      const msgText = isImage 
        ? `[IMAGE: ${base64Data} | ${file.name}]` 
        : `[FILE: ${base64Data} | ${file.name}]`;

      const timestamp = new Date().toISOString();
      const tempId = crypto.randomUUID();

      const newMessage: ChatMessage = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: activeChatUser.id,
        message: msgText,
        timestamp,
        read: false
      };

      setMessages(prev => [...prev, newMessage]);
      setLastMessages(prev => ({
        ...prev,
        [activeChatUser.id]: newMessage
      }));

      try {
        if (socket) {
          socket.emit("send_message", newMessage);
        }

        await apiRequest("/api/chat/messages", {
          method: "POST",
          body: {
            senderId: currentUser.id,
            receiverId: activeChatUser.id,
            message: msgText,
            timestamp
          }
        });

        if (activeChatUser.id === "lanpro-ai") {
          triggerSimulation(`Mengirim dokumen: ${file.name}`, activeChatUser);
        }
      } catch (err) {
        console.error("Gagal mengirim lampiran:", err);
        toast.error("Gagal mengirim lampiran.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Send Preset Mockup Assets
  const sendPresetMockup = async (type: "image" | "file", name: string, dataUrl: string) => {
    if (!activeChatUser) return;
    setIsAttachmentMenuOpen(false);

    const msgText = type === "image" 
      ? `[IMAGE: ${dataUrl} | ${name}]` 
      : `[FILE: ${dataUrl} | ${name}]`;

    const timestamp = new Date().toISOString();
    const tempId = crypto.randomUUID();

    const newMessage: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      receiverId: activeChatUser.id,
      message: msgText,
      timestamp,
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
    setLastMessages(prev => ({
      ...prev,
      [activeChatUser.id]: newMessage
    }));

    try {
      if (socket) {
        socket.emit("send_message", newMessage);
      }

      await apiRequest("/api/chat/messages", {
        method: "POST",
        body: {
          senderId: currentUser.id,
          receiverId: activeChatUser.id,
          message: msgText,
          timestamp
        }
      });

      if (activeChatUser.id === "lanpro-ai") {
        triggerSimulation(`Mengirim mockup: ${name}`, activeChatUser);
      }
    } catch (err) {
      console.error("Gagal mengirim preset mockup:", err);
    }
  };

  // Filter users based on search query
  const filteredUsers = allUsers.filter(u => {
    if (u.id === currentUser.id) return false;
    const name = u?.displayName || u?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter virtual channels
  const filteredVirtuals = [groupVirtualUser, aiVirtualUser].filter(u => {
    const name = u?.displayName || u?.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);

  // Format timestamp
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  // Render attachment in message bubble
  const renderMessageContent = (msgText: string) => {
    if (msgText.startsWith("[IMAGE:")) {
      try {
        const cleanStr = msgText.slice(7, -1);
        const delimiterIdx = cleanStr.indexOf("|");
        const url = cleanStr.substring(0, delimiterIdx).trim();
        const name = cleanStr.substring(delimiterIdx + 1).trim() || "Gambar";
        return (
          <div className="flex flex-col gap-1.5 max-w-full">
            <img 
              src={url} 
              alt={name} 
              className="rounded-xl max-w-full h-auto border border-slate-200/50 shadow-sm max-h-40 object-cover cursor-zoom-in hover:brightness-95 transition-all" 
              onClick={() => {
                const w = window.open();
                if (w) {
                  w.document.write(`<img src="${url}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                }
              }}
              referrerPolicy="no-referrer"
            />
            <span className="text-[9px] opacity-75 flex items-center gap-1 font-mono tracking-tight">🖼️ {name}</span>
          </div>
        );
      } catch (e) {
        return <span className="italic text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gagal memuat gambar</span>;
      }
    }
    
    if (msgText.startsWith("[FILE:")) {
      try {
        const cleanStr = msgText.slice(6, -1);
        const delimiterIdx = cleanStr.indexOf("|");
        const url = cleanStr.substring(0, delimiterIdx).trim();
        const name = cleanStr.substring(delimiterIdx + 1).trim() || "File";
        return (
          <a 
            href={url} 
            download={name}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2 bg-slate-900/5 hover:bg-slate-900/10 text-slate-800 rounded-xl transition-all border border-slate-200/20 max-w-full"
          >
            <span className="p-2 bg-amber-500 text-white rounded-lg shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold truncate text-slate-800 leading-tight">{name}</p>
              <p className="text-[9px] text-slate-500 font-mono">Unduh berkas</p>
            </div>
            <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </a>
        );
      } catch (e) {
        return <span className="italic text-rose-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Gagal memuat berkas</span>;
      }
    }

    return msgText;
  };

  // Filter messages by active chat search query
  const filteredMessages = messages.filter(msg => {
    if (!isMsgSearchOpen || !msgSearchQuery) return true;
    return msg.message.toLowerCase().includes(msgSearchQuery.toLowerCase());
  });

  return (
    <div id="lanpro-live-chat-widget" className="fixed bottom-6 right-6 z-50 select-none">
      {/* 1. FLOATING TOGGLE BUTTON */}
      <motion.button
        id="chat-floating-toggle"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl border border-slate-800 hover:bg-orange-600 hover:border-orange-500 hover:text-white transition-all duration-300"
        title="Live Chat Obrolan LanPro"
      >
        <MessageSquare className="w-5 h-5" />
        {/* Red Badge Indicator */}
        <AnimatePresence>
          {totalUnread > 0 && (
            <motion.div
              id="chat-badge-count"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold px-1.5 border border-white shadow-md animate-pulse"
            >
              {totalUnread}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* 2. CHAT WINDOW POP-UP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chat-box-popup"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            ref={chatBoxRef}
            className="absolute bottom-16 right-0 w-80 h-[480px] bg-white rounded-xl border border-slate-200/80 shadow-2xl flex flex-col overflow-hidden z-50 bg-opacity-95 backdrop-blur-md"
          >
            {/* VIEW A: CONTACT LIST VIEW */}
            {!activeChatUser ? (
              <div id="chat-user-list-view" className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                    <span className="font-bold text-sm tracking-tight text-white">Obrolan LanPro</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={() => setSoundEnabled(!soundEnabled)} 
                      className="text-slate-400 hover:text-white transition-colors"
                      title={soundEnabled ? "Matikan Suara" : "Aktifkan Suara"}
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => setIsOpen(false)} 
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Cari saluran atau rekan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Users & Channels List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                  {/* Channels / Virtual Bots Section */}
                  {filteredVirtuals.length > 0 && (
                    <div className="bg-slate-50/40">
                      <p className="px-4 pt-2.5 pb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">Saluran & Asisten</p>
                      {filteredVirtuals.map((virtual) => {
                        const isGroup = virtual.id === "group";
                        const unread = unreadCounts[virtual.id] || 0;
                        const lastMsg = lastMessages[virtual.id];

                        return (
                          <div
                            key={virtual.id}
                            onClick={() => setActiveChatUser(virtual)}
                            className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            <div className="shrink-0">
                              {isGroup ? (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center border border-orange-400 shadow-sm">
                                  <Users className="w-4 h-4" />
                                </div>
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center border border-purple-500 shadow-sm relative">
                                  <Sparkles className="w-4 h-4 animate-pulse text-yellow-200" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                                  {virtual?.displayName}
                                </span>
                                {lastMsg && (
                                  <span className="text-[9px] text-slate-400">
                                    {formatTime(lastMsg.timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                                {lastMsg ? (
                                  lastMsg.message.startsWith("[IMAGE:") ? "🖼️ Mengirim gambar..." :
                                  lastMsg.message.startsWith("[FILE:") ? "📂 Mengirim lampiran..." : lastMsg.message
                                ) : (
                                  isGroup ? "Hubungkan seluruh rekan dalam proyek" : "Tanyakan apa saja kepada AI Assistant"
                                )}
                              </p>
                            </div>

                            {unread > 0 && (
                              <div className="shrink-0 min-w-[16px] h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold px-1.5 animate-bounce">
                                {unread}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Direct Message Section */}
                  <div className="bg-white">
                    <p className="px-4 pt-3 pb-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">Rekan Kerja (DM)</p>
                    {filteredUsers.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Tidak ada rekan kerja ditemukan.
                      </div>
                    ) : (
                      filteredUsers.map((targetUser) => {
                        const isOnline = onlineUserIds.includes(targetUser.id);
                        const userUnread = unreadCounts[targetUser.id] || 0;
                        const lastMsg = lastMessages[targetUser.id];
                        const initials = (targetUser?.displayName || targetUser?.username || "U").substring(0, 2).toUpperCase();

                        return (
                          <div
                            key={targetUser.id}
                            onClick={() => setActiveChatUser(targetUser)}
                            className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                          >
                            {/* Avatar with Dot indicator */}
                            <div className="relative shrink-0">
                              {targetUser.photoURL ? (
                                <img 
                                  src={targetUser.photoURL} 
                                  alt={targetUser?.displayName} 
                                  className="w-9 h-9 rounded-full object-cover border border-slate-100 shadow-sm"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                                  {initials}
                                </div>
                              )}
                              {/* Online / Offline Indicator Dot */}
                              <span 
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                                  isOnline ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                            </div>

                            {/* Detail Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                                  {targetUser?.displayName || targetUser?.username}
                                </span>
                                {lastMsg && (
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {formatTime(lastMsg.timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {lastMsg ? (
                                  lastMsg.message.startsWith("[IMAGE:") ? "🖼️ Gambar" :
                                  lastMsg.message.startsWith("[FILE:") ? "📂 Lampiran file" : lastMsg.message
                                ) : "Belum ada percakapan"}
                              </p>
                            </div>

                            {/* Unread Count Badge */}
                            {userUnread > 0 && (
                              <div className="shrink-0 min-w-[16px] h-4 bg-orange-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold px-1.5 shadow-sm">
                                {userUnread}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW B: ACTIVE CHAT VIEW */
              <div id="chat-active-room-view" className="flex flex-col h-full bg-white">
                {/* Header */}
                <div className="px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setActiveChatUser(null)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                      title="Kembali"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    {/* Active User info */}
                    <div className="relative shrink-0">
                      {activeChatUser.id === "group" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center border border-orange-400/30">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      ) : activeChatUser.id === "lanpro-ai" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center border border-purple-500/30">
                          <Bot className="w-3.5 h-3.5 text-yellow-200" />
                        </div>
                      ) : activeChatUser.photoURL ? (
                        <img 
                          src={activeChatUser.photoURL} 
                          alt={activeChatUser?.displayName} 
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold border border-slate-700">
                          {(activeChatUser?.displayName || activeChatUser?.username || "U").substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      
                      {activeChatUser.id !== "group" && activeChatUser.id !== "lanpro-ai" && (
                        <span 
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${
                            onlineUserIds.includes(activeChatUser.id) ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate leading-tight flex items-center gap-1">
                        {activeChatUser?.displayName}
                        {activeChatUser.id === "lanpro-ai" && <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 text-[8px] font-black rounded uppercase border border-purple-500/30">AI</span>}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {activeChatUser.id === "group" ? `${allUsers.length} Anggota Proyek` :
                         activeChatUser.id === "lanpro-ai" ? "Gemini 3.5 Assistant" :
                         onlineUserIds.includes(activeChatUser.id) ? "Sedang Aktif" : "Offline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active Room Message Search Toggle */}
                    <button
                      onClick={() => {
                        setIsMsgSearchOpen(!isMsgSearchOpen);
                        setMsgSearchQuery("");
                      }}
                      className={`p-1.5 rounded-lg transition-all ${isMsgSearchOpen ? "bg-slate-800 text-orange-500" : "text-slate-400 hover:text-white"}`}
                      title="Cari dalam chat ini"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setActiveChatUser(null)} 
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                      title="Sembunyikan"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Message Search Bar */}
                {isMsgSearchOpen && (
                  <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200/50 flex items-center gap-1.5 shrink-0">
                    <Search className="w-3 h-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter kata kunci percakapan..."
                      value={msgSearchQuery}
                      onChange={(e) => setMsgSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent border-none text-[11px] focus:outline-none focus:ring-0 text-slate-800 font-medium"
                      autoFocus
                    />
                    {msgSearchQuery && (
                      <button onClick={() => setMsgSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Message History Body */}
                <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 custom-scrollbar space-y-3.5">
                  {isLoadingMessages ? (
                    <div className="h-full flex flex-col items-center justify-center gap-1">
                      <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                      <span className="text-[10px] font-medium text-slate-400">Memuat pesan...</span>
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <MessageSquare className="w-8 h-8 text-slate-200 mb-1.5" />
                      <p className="text-xs text-slate-400 font-medium">
                        {msgSearchQuery ? "Tidak ada pesan cocok." : "Belum ada percakapan."}
                      </p>
                    </div>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isSelf = msg.senderId === currentUser.id;
                      
                      // For group chat, get actual sender profile
                      const senderProfile = msg.receiverId === "group" 
                        ? allUsers.find(u => u.id === msg.senderId)
                        : null;
                        
                      const senderDisplayName = senderProfile 
                        ? (senderProfile?.displayName || senderProfile.username) 
                        : (msg.senderId === "lanpro-ai" ? "LanPro AI Assistant" : "Rekan Kerja");

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                        >
                          {/* Sender name for Group Chat */}
                          {!isSelf && msg.receiverId === "group" && (
                            <span className="text-[9px] font-black text-slate-500 mb-0.5 ml-1 flex items-center gap-1 select-none">
                              {senderDisplayName}
                              <span className="px-1 bg-slate-200 text-slate-600 rounded-[3px] text-[7px] font-bold">
                                {senderProfile?.role || "anggota"}
                              </span>
                            </span>
                          )}

                          {/* Sender name for AI Assistant messages in direct chat */}
                          {!isSelf && msg.senderId === "lanpro-ai" && (
                            <span className="text-[9px] font-black text-purple-600 mb-0.5 ml-1 flex items-center gap-0.5 select-none font-sans">
                              <Sparkles className="w-2.5 h-2.5" /> {senderDisplayName}
                            </span>
                          )}

                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-xl text-xs break-all shadow-sm ${
                              isSelf
                                ? "bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-br-none"
                                : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                            }`}
                          >
                            {renderMessageContent(msg.message)}
                          </div>
                          
                          {/* Message meta */}
                          <div className="flex items-center gap-1 mt-1 px-1 text-[9px] text-slate-400 font-mono">
                            <span>{formatTime(msg.timestamp)}</span>
                            {isSelf && (
                              <span>
                                {msg.read ? (
                                  <CheckCheck className="w-3 h-3 text-sky-500" />
                                ) : (
                                  <Check className="w-3 h-3 text-slate-300" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {isPartnerTyping && (
                    <div className="flex flex-col items-start space-y-1">
                      <div className="bg-white border border-slate-100 text-slate-800 px-3 py-1.5 rounded-xl rounded-bl-none text-xs shadow-sm flex items-center gap-1.5 text-slate-500 font-medium">
                        <span className="text-[10px] text-slate-400">
                          {activeChatUser?.id === "lanpro-ai" ? "LanPro AI sedang mengetik" : `${activeChatUser?.displayName} sedang mengetik`}
                        </span>
                        <span className="flex gap-0.5 items-center justify-center pt-0.5 shrink-0">
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Simulation Mode Toggle Panel (Only for Direct Human Chat) */}
                {activeChatUser.id !== "group" && activeChatUser.id !== "lanpro-ai" && (
                  <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-100/60 flex items-center justify-between text-[9px] text-slate-400 shrink-0">
                    <span className="font-medium flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${simulationEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`} />
                      Simulasi Balasan Otomatis
                    </span>
                    <button
                      type="button"
                      onClick={() => setSimulationEnabled(!simulationEnabled)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider transition-colors ${
                        simulationEnabled ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {simulationEnabled ? "AKTIF" : "NONAKTIF"}
                    </button>
                  </div>
                )}

                {/* ATTACHMENT QUICK-SELECTION MENU */}
                <AnimatePresence>
                  {isAttachmentMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0 border-b border-slate-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Kirim Lampiran & Mockup</span>
                        <button onClick={() => setIsAttachmentMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Preset Image Mockup */}
                        <button
                          type="button"
                          onClick={() => sendPresetMockup("image", "UI-Redesign-Mockup.png", "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&w=600&q=85")}
                          className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-left hover:border-orange-500 hover:bg-orange-50/10 transition-all group"
                        >
                          <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-all shrink-0">
                            <Image className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-800 truncate">UI Mockup Redesign</p>
                            <p className="text-[8px] text-slate-400">PNG Mockup Asset</p>
                          </div>
                        </button>

                        {/* Preset File Mockup */}
                        <button
                          type="button"
                          onClick={() => sendPresetMockup("file", "SDLC-Database-Blueprint.pdf", "data:text/plain;base64,U0RMQyBEYXRhYmFzZSBBcmNoaXRlY3R1cmUgQmx1ZXByaW50OiAxLiBVc2VycyAyLiBUYXNrcyAzLiBTcHJpbnRzIDQuIEF1ZGl0TG9ncyA1LiBNZXNzYWdlcy4gR2VtaW5pIEFJIEFzc2lzdGFudCBjb25maWd1cmVkLg==")}
                          className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-left hover:border-orange-500 hover:bg-orange-50/10 transition-all group"
                        >
                          <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-800 truncate">Database Blueprint</p>
                            <p className="text-[8px] text-slate-400">PDF Schema Spec</p>
                          </div>
                        </button>
                      </div>

                      {/* Real Local File Upload Input trigger */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-wider uppercase flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-colors shadow-sm"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        Unggah File Komputer Anda
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*,application/pdf,text/*,application/json"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer Input Area */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2 border-t border-slate-100 bg-white flex items-center gap-1.5 shrink-0"
                >
                  {/* Attachment Clip Button */}
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={`p-2 rounded-xl transition-all border shrink-0 flex items-center justify-center ${
                      isAttachmentMenuOpen 
                        ? "bg-orange-50 border-orange-200 text-orange-600" 
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                    title="Sisipkan file, gambar, atau mockup"
                  >
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder={isUploading ? "Mengunggah file..." : "Ketik pesan..."}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isUploading}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-medium text-slate-800 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isUploading}
                    className="p-2 bg-slate-900 text-white hover:bg-orange-500 rounded-xl transition-all shadow-sm disabled:opacity-30 disabled:hover:bg-slate-900 flex items-center justify-center shrink-0"
                    title="Kirim Pesan"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
