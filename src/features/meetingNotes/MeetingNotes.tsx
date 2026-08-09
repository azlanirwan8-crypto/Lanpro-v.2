import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ChevronLeft,
  Edit2,
  User,
  MessageSquare,
  Calendar,
  ExternalLink,
  Search,
  FileText,
  Video,
  Clock,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getUsers,
} from "../../services/meetingService";
import {
  type Meeting,
  type UserProfile,
  type AppRole,
  type UserPermissions,
} from "../../types";
import { DiscussionPointsTable } from "./DiscussionPointsTable";
import { UserBadge } from "./UserBadge";
import { AiMeetingCompanion } from "./AiMeetingCompanion";
import { Sparkles, Brain } from "lucide-react";
import { hasPermission } from "../../lib/permissions";

interface MeetingNotesProps {
  projectId: string;
  userRole: AppRole;
  currentUser: UserProfile | null;
  permissions?: Partial<UserPermissions>;
  projectMembers?: UserProfile[];
  masterData?: any[];
}

export const MeetingNotes: React.FC<MeetingNotesProps> = ({
  projectId,
  userRole,
  currentUser,
  permissions,
  projectMembers = [],
  masterData = [],
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMeetingLink, setNewMeetingLink] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [newMeetingTime, setNewMeetingTime] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"manual" | "ai">("manual");

  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 8; // adjusted for side-by-side list density

  const currentUserProfile =
    users.find((u) => u.uid === currentUser?.uid) || currentUser;

  const canAdd = hasPermission(
    userRole,
    "meetingNotes",
    "create",
    false,
    permissions,
  );

  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const paginatedMeetings = filteredMeetings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );



  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, [projectId]);

  useEffect(() => {
    setWorkspaceTab("manual");
  }, [activeMeetingId]);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers(currentUser?.uid);
      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error(error.message || "Failed to load users");
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const fetchedMeetings = await getMeetings(projectId, currentUser?.uid);
      setMeetings(fetchedMeetings);
    } catch (error: any) {
      console.error("Failed to fetch meetings:", error);
      toast.error(error.message || "Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast.error("Meeting title cannot be empty.");
      return;
    }
    if (!currentUser) {
      toast.error("Please login first.");
      return;
    }

    const isEdit = !!editingMeeting;
    const isOwner = isEdit
      ? editingMeeting!.authorId === currentUser.uid
      : false;
    const permissionAction = isEdit ? "update" : "create";

    if (
      !hasPermission(
        userRole,
        "meetingNotes",
        permissionAction,
        isOwner,
        permissions,
      )
    ) {
      toast.error(
        `You do not have permission to ${isEdit ? "update" : "add"} the meeting.`,
      );
      return;
    }

    if (!projectId) {
      toast.error("Project ID not found.");
      return;
    }
    setLoading(true);
    try {
      if (editingMeeting) {
        await updateMeeting(projectId, editingMeeting.id!, {
          title: trimmedTitle,
          description: newDescription.trim(),
          meetingLink: newMeetingLink.trim(),
        }, currentUser.uid);
        setMeetings((prev) =>
          prev.map((m) =>
            m.id === editingMeeting.id
              ? {
                  ...m,
                  title: trimmedTitle,
                  description: newDescription.trim(),
                  meetingLink: newMeetingLink.trim(),
                }
              : m
          )
        );
        toast.success("Meeting successfully updated.");
      } else {
        const payload: Partial<Meeting> = {
          projectId,
          title: trimmedTitle,
          description: newDescription.trim(),
          meetingLink: newMeetingLink.trim(),
          authorId: currentUser.uid,
        };
        const responseData = await createMeeting(projectId, trimmedTitle, currentUser.uid, payload, currentUser.uid);
        toast.success("New meeting successfully added.");
      }
      setNewTitle("");
      setNewDescription("");
      setNewMeetingLink("");
      setIsModalOpen(false);
      setEditingMeeting(null);
      await fetchMeetings();
    } catch (error) {
      console.error("Failed to save meeting:", error);
      toast.error("Failed to save meeting: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startAddMeeting = () => {
    setEditingMeeting(null);
    setNewTitle("");
    setNewDescription("");
    setNewMeetingLink("");
    setIsModalOpen(true);
  };

  const startEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setNewTitle(meeting.title || "");
    setNewDescription(meeting.description || "");
    setNewMeetingLink(meeting.meetingLink || "");
    setIsModalOpen(true);
  };

  const handleDeleteMeeting = async () => {
    if (!meetingToDelete) return;
    const meeting = meetings.find((m) => m.id === meetingToDelete);
    if (!meeting) return;

    setLoading(true);
    try {
      await deleteMeeting(projectId, meetingToDelete, currentUser?.uid);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingToDelete));
      if (activeMeetingId === meetingToDelete) {
        setActiveMeetingId(null);
      }
      toast.success("Meeting successfully deleted.");
      fetchMeetings();
      setMeetingToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete meeting.");
    } finally {
      setLoading(false);
    }
  };

  const getAuthorDisplay = (authorId: string) => {
    const user = users.find((u) => u.uid === authorId);
    if (!user) {
      if (authorId === "admin") return { name: "Admin Manager", initial: "AM" };
      return { name: authorId || "Unknown", initial: "U" };
    }
    const name = user?.displayName || user?.username || "User";
    const initial = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    return { name, initial };
  };

  const formatDate = (date: any) => {
    if (!date) return "-";
    try {
      if (date.toDate && typeof date.toDate === "function") {
        return date.toDate().toLocaleDateString("en-US");
      }
      return new Date(date).toLocaleDateString("en-US");
    } catch (e) {
      return "-";
    }
  };

  const [mobileViewMode, setMobileViewMode] = useState<"list" | "detail">("list");

  const toggleMeeting = (meetingId: string) => {
    setActiveMeetingId(meetingId);
    setMobileViewMode("detail");
  };

  const activeMeeting = meetings.find((m) => m.id === activeMeetingId);

  return (
    <div className="w-full flex-1 flex flex-col p-3 md:p-6 min-h-0 overflow-hidden bg-[#f4f7f9] text-left">
      <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        
        {/* LEFT SIDEBAR: List of Meetings */}
        <div className={`w-full md:w-[350px] lg:w-[380px] shrink-0 border-r border-slate-200/60 flex flex-col bg-slate-50/40 h-full min-h-0 ${mobileViewMode === "detail" ? "hidden md:flex" : "flex"}`}>
          
          {/* Sidebar Header */}
          <div className="p-5 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 block shadow-sm/50">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Meeting Notes</h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    {filteredMeetings.length} Meetings
                  </p>
                </div>
              </div>
              
              {canAdd && (
                <button
                  onClick={startAddMeeting}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
                  title="Schedule New Meeting"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search input with clean focus styles */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari meeting..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200/80 rounded-xl text-xs placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-500 transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-700 font-semibold"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* List of meeting cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbfcfd]">
            {paginatedMeetings.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3 border border-slate-200/30">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-705">Tidak ada meeting</h4>
                <p className="text-[10.5px] text-slate-400 mt-1 leading-normal">Coba sesuaikan kata kunci pencarian Anda atau buat rapat baru.</p>
              </div>
            ) : (
              paginatedMeetings.map((meeting) => {
                const isActive = activeMeetingId === meeting.id;
                const authorData = getAuthorDisplay(meeting.authorId);

                return (
                  <div
                    key={meeting.id}
                    onClick={() => meeting.id && toggleMeeting(meeting.id)}
                    className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isActive
                        ? "bg-white border-indigo-500 shadow-md shadow-indigo-105/30 ring-2 ring-indigo-500/5"
                        : "bg-white border-slate-200/50 hover:border-slate-300 hover:bg-white shadow-sm/30"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <h4 className={`text-xs font-semibold tracking-tight line-clamp-2 leading-snug flex-1 ${isActive ? "text-indigo-950" : "text-slate-800"}`}>
                        {meeting.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100/60 pt-2.5 mt-0.5">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Calendar className="w-3 h-3 text-slate-300" />
                        {formatDate(meeting.createdAt)}
                      </div>

                      <div className="scale-90 origin-right">
                        <UserBadge authorId={meeting.authorId} users={users} showName={false} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200/60 bg-white/70 flex items-center justify-between shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px] font-extrabold disabled:opacity-40 transition-colors uppercase outline-none cursor-pointer"
              >
                Prev
              </button>
              <span className="text-[10px] text-slate-400 font-extrabold tracking-wider">
                PAGE {currentPage} OF {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px] font-extrabold disabled:opacity-40 transition-colors uppercase outline-none cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* RIGHT WORKSPACE: Detailed Notes Area */}
        <div className={`flex-1 flex flex-col h-full min-h-0 bg-white overflow-hidden ${mobileViewMode === "list" ? "hidden md:flex" : "flex"}`}>
          {activeMeeting ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              
              {/* Meeting Workspace Header */}
              <div className="p-6 md:p-8 border-b border-slate-200/60 shrink-0 bg-[#fbfcfd]/30">
                
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileViewMode("list")}
                  className="md:hidden flex items-center gap-1 text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all uppercase tracking-wider mb-4 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-55 px-3 py-1.5 rounded-xl block w-max cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Daftar Meeting
                </button>

                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                  
                  {/* Meta Details Left */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100/60 rounded-lg text-[10px] text-indigo-700 font-black uppercase tracking-wider block w-max shadow-sm/30">
                        Meeting Workspace
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold bg-slate-100/60 border border-slate-200/30 px-2.5 py-1 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(activeMeeting.createdAt)}
                      </div>
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-tight break-words">
                      {activeMeeting.title}
                    </h2>
                  </div>

                  {/* Actions & Zoom Link Right */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {activeMeeting.meetingLink && (
                      <a
                        href={activeMeeting.meetingLink.startsWith("http") ? activeMeeting.meetingLink : `https://${activeMeeting.meetingLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer"
                      >
                        <Video className="w-4 h-4" /> Gabung Meeting Room
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </a>
                    )}

                    <div className="flex gap-2">
                      {hasPermission(userRole, "meetingNotes", "update", activeMeeting.authorId === (currentUser?.uid || ""), permissions) && (
                        <button
                          onClick={() => startEdit(activeMeeting)}
                          className="p-2.5 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer"
                          title="Edit Meeting"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission(userRole, "meetingNotes", "delete", activeMeeting.authorId === (currentUser?.uid || ""), permissions) && (
                        <button
                          onClick={() => setMeetingToDelete(activeMeeting.id!)}
                          className="p-2.5 text-rose-600 border border-rose-100 bg-rose-50/30 hover:bg-rose-50 rounded-xl transition-all shadow-sm cursor-pointer"
                          title="Delete Meeting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Workspace Tabs Toggle */}
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => setWorkspaceTab("manual")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      workspaceTab === "manual" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Poin Diskusi (Manual)
                  </button>
                  <button
                    onClick={() => setWorkspaceTab("ai")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      workspaceTab === "ai" ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Asisten Notulen AI
                  </button>
                </div>

                {/* Meeting Overview Deskripsi */}
                {activeMeeting.description && (
                  <div className="mt-6 p-4 border border-indigo-100/50 bg-indigo-50/10 rounded-2xl border-l-4 border-l-indigo-500">
                    <span className="text-[10px] font-extrabold text-indigo-600 tracking-wider uppercase block mb-1">
                      Deskripsi / Agenda Meeting
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">
                      {activeMeeting.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Collaborative workspace: DiscussionPointsTable / AI */}
              <div className="p-4 md:p-8 bg-[#fafbfc]">
                {workspaceTab === "manual" ? (
                  <DiscussionPointsTable
                    projectId={projectId}
                    meetingId={activeMeeting.id!}
                    userRole={userRole}
                    currentUser={currentUser}
                    permissions={permissions}
                    projectMembers={projectMembers}
                    masterData={masterData}
                  />
                ) : (
                  <AiMeetingCompanion
                    projectId={projectId}
                    meeting={activeMeeting}
                    currentUser={currentUser}
                    projectMembers={projectMembers}
                    onPointsImported={() => setWorkspaceTab("manual")}
                  />
                )}
              </div>

            </div>
          ) : (
            /* Immersive Workspace Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10 hover:bg-slate-50/20 transition-all duration-300">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50/70 border border-indigo-100/60 flex items-center justify-center mb-6 shadow-sm shadow-indigo-100/30">
                <FileText className="w-9 h-9 text-indigo-500 animate-pulse" />
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Pilih atau Buat Catatan Meeting
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-2 max-w-sm leading-relaxed mx-auto">
                Pilih salah satu agenda meeting di panel kiri atau buat pertemuan baru untuk melacak poin diskusi, keputusan, fitur, dan penanggung jawab projek.
              </p>
              {canAdd && (
                <button
                  onClick={startAddMeeting}
                  className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> BUAT MEETING BARU
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* POPUP MODAL: Add / Edit Meeting */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white p-7 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 animate-in scale-in duration-200 text-left relative">
            
            {/* Top-Right X Close Button */}
            <button
              onClick={() => {
                setIsModalOpen(false);
                setEditingMeeting(null);
                setNewTitle("");
                setNewDescription("");
                setNewMeetingLink("");
                setNewMeetingDate("");
                setNewMeetingTime("");
                setSelectedAttendees([]);
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header with Soft Icon Badge */}
            <div className="flex items-center gap-3.5 mb-6 pr-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {editingMeeting ? "Edit Catatan Meeting" : "Buat Catatan Meeting Baru"}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Lengkapi informasi berikut untuk mendaftarkan rapat kolaborasi team.
                </p>
              </div>
            </div>
            
            <div className="space-y-4.5 mb-6">
              {/* Judul Rapat */}
              <div>
                <label className="block text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  Judul Rapat <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                  placeholder="Contoh: Sprint Planning Ke-4"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              {/* 2-Column Grid: Tanggal & Waktu Meeting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanggal Meeting */}
                <div>
                  <label className="block text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Meeting
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs cursor-pointer"
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                  />
                </div>

                {/* Waktu Meeting */}
                <div>
                  <label className="block text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Waktu Meeting
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs cursor-pointer"
                    value={newMeetingTime}
                    onChange={(e) => setNewMeetingTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Link Ruang Meeting dengan Prefix Icon Video */}
              <div>
                <label className="block text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-slate-400" />
                  Link Ruang Meeting (Opsional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                    placeholder="Zoom / GMeet (https://zoom.us/...)"
                    value={newMeetingLink}
                    onChange={(e) => setNewMeetingLink(e.target.value)}
                  />
                </div>
              </div>

              {/* Deskripsi / Agenda */}
              <div>
                <label className="block text-slate-700 font-semibold text-xs tracking-wider uppercase mb-1.5">
                  Deskripsi / Agenda Acara (Opsional)
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all resize-none min-h-[90px] placeholder:text-slate-400 shadow-2xs"
                  placeholder="Tuliskan poin-poin utama yang akan dibahas..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingMeeting(null);
                  setNewTitle("");
                  setNewDescription("");
                  setNewMeetingLink("");
                  setNewMeetingDate("");
                  setNewMeetingTime("");
                  setSelectedAttendees([]);
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={loading || !newTitle.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Meeting</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Delete Meeting Confirmation */}
      {meetingToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200/60 animate-in zoom-in-95 duration-200 text-left">
            <h3 className="text-base font-black text-slate-900 mb-2">
              Hapus Catatan Meeting?
            </h3>
            <p className="text-xs font-semibold text-slate-450 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus catatan meeting ini? Semua poin diskusi dan tugas yang ada di dalamnya akan ikut dihapus secara permanen.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMeetingToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                onClick={handleDeleteMeeting}
                disabled={loading}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
