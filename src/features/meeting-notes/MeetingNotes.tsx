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
  Eye,
  Download,
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
import { apiRequest } from "../../lib/api";

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
  const [newMeetingFile, setNewMeetingFile] = useState<File | null>(null);
  const [shouldRemoveMeetingFile, setShouldRemoveMeetingFile] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<"manual" | "ai">("manual");

  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleDownloadMeeting = async (meetingId: string, fName: string) => {
    toast.info("Mengunduh berkas lampiran...");
    try {
      const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}/download`, {
        headers: { 'x-user-id': currentUser?.id || currentUser?.uid || "guest" }
      });
      if (data.status === "success" && data.data && data.data.fileData) {
        const { fileData, fileName } = data.data;
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName || fName || "document";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Berhasil mengunduh berkas.");
      } else {
        toast.error("Berkas lampiran tidak ditemukan.");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal mengunduh berkas.");
    }
  };

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
      let fileData = null;
      let fileName = shouldRemoveMeetingFile ? "" : (editingMeeting ? (editingMeeting.fileName || "") : "");
      let fileTypeStr = shouldRemoveMeetingFile ? "" : (editingMeeting ? (editingMeeting.fileType || "") : "");

      if (newMeetingFile) {
        if (newMeetingFile.size > 5 * 1024 * 1024) {
          toast.error("Ukuran berkas melebihi batas maksimal 5 MB.");
          setLoading(false);
          return;
        }
        fileData = await fileToBase64(newMeetingFile);
        fileName = newMeetingFile.name;
        fileTypeStr = newMeetingFile.type || 'application/octet-stream';
      }

      if (editingMeeting) {
        const payload: Partial<Meeting> = {
          title: trimmedTitle,
          description: newDescription.trim(),
          meetingLink: newMeetingLink.trim(),
        };
        if (newMeetingFile) {
          payload.fileData = fileData;
          payload.fileName = fileName;
          payload.fileType = fileTypeStr;
        } else if (shouldRemoveMeetingFile) {
          payload.fileData = null;
          payload.fileName = "";
          payload.fileType = "";
        }

        await updateMeeting(projectId, editingMeeting.id!, payload, currentUser.uid);
        toast.success("Meeting successfully updated.");
      } else {
        const payload: Partial<Meeting> = {
          projectId,
          title: trimmedTitle,
          description: newDescription.trim(),
          meetingLink: newMeetingLink.trim(),
          authorId: currentUser.uid,
        };
        if (newMeetingFile) {
          payload.fileData = fileData;
          payload.fileName = fileName;
          payload.fileType = fileTypeStr;
        }
        await createMeeting(projectId, trimmedTitle, currentUser.uid, payload, currentUser.uid);
        toast.success("New meeting successfully added.");
      }
      setNewTitle("");
      setNewDescription("");
      setNewMeetingLink("");
      setNewMeetingFile(null);
      setShouldRemoveMeetingFile(false);
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
    setNewMeetingFile(null);
    setShouldRemoveMeetingFile(false);
    setIsModalOpen(true);
  };

  const startEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setNewTitle(meeting.title || "");
    setNewDescription(meeting.description || "");
    setNewMeetingLink(meeting.meetingLink || "");
    setNewMeetingFile(null);
    setShouldRemoveMeetingFile(false);
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
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden">
        
        {activeMeetingId === null ? (
          /* DATATABLE VIEW */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            
             {/* Table Header / Action Bar */}
            <div className="p-6 md:p-7 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Meeting Notes</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Manage project meetings, agenda, datetime, and discussion points.
                  </p>
                </div>
              </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <input
                    type="text"
                    placeholder="Search meetings by title..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50/60 border border-slate-200/80 rounded-lg text-xs placeholder:text-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-slate-700 font-semibold shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {canAdd && (
                  <button
                    onClick={startAddMeeting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add Meeting
                  </button>
                )}
              </div>
            </div>

            {/* DataTable Container */}
            <div className="flex-1 overflow-x-auto overflow-y-auto m-6 bg-white rounded-lg border border-slate-200/60 shadow-xs">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 w-14 text-center">No</th>
                    <th className="py-3.5 px-4 min-w-[180px] max-w-[260px]">Meeting Title</th>
                    <th className="py-3.5 px-4 w-44">Datetime Meeting</th>
                    <th className="py-3.5 px-4 w-40">Meeting Link</th>
                    <th className="py-3.5 px-4 w-40">Document File</th>
                    <th className="py-3.5 px-4 w-36">Author</th>
                    <th className="py-3.5 px-4 min-w-[180px] max-w-[260px]">Description</th>
                    <th className="py-3.5 px-4 w-28 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {paginatedMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400">
                        <div className="w-14 h-14 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                          <MessageSquare className="w-6 h-6 text-indigo-500" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">No meetings found</p>
                        <p className="text-xs text-slate-400 mt-1">Create a new meeting or adjust your search keyword.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMeetings.map((meeting, index) => {
                      const srNo = (currentPage - 1) * itemsPerPage + index + 1;
                      const author = getAuthorDisplay(meeting.authorId);
                      return (
                        <tr 
                          key={meeting.id} 
                          onClick={() => {
                            setActiveMeetingId(meeting.id!);
                            setMobileViewMode("detail");
                          }}
                          className="hover:bg-slate-50/60 transition-colors duration-200 group cursor-pointer"
                        >
                          <td className="py-4 px-5 text-center text-slate-400 font-bold">
                            {String(srNo).padStart(2, "0")}
                          </td>
                          <td className="py-4 px-5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            <div className="line-clamp-1">{meeting.title}</div>
                          </td>
                          <td className="py-4 px-5 text-slate-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{formatDate(meeting.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            {meeting.meetingLink ? (
                              <a
                                href={meeting.meetingLink.startsWith("http") ? meeting.meetingLink : `https://${meeting.meetingLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 rounded-md font-bold truncate max-w-[150px] transition-all text-[11px] border border-indigo-100/50"
                                title={meeting.meetingLink}
                              >
                                <Video className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Join Room</span>
                              </a>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">No link</span>
                            )}
                          </td>
                          <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                            {meeting.fileName ? (
                              <button
                                onClick={() => handleDownloadMeeting(meeting.id!, meeting.fileName!)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer group/file"
                                title="Klik untuk mengunduh berkas"
                              >
                                <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600 group-hover/file:scale-110 transition-transform" />
                                <span className="truncate max-w-[140px]">{meeting.fileName}</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 italic text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-slate-700 font-semibold">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {author.initial}
                              </div>
                              <span className="truncate">{author.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5 text-slate-500 font-normal">
                            <div className="line-clamp-1 max-w-xs">
                              {meeting.description || <span className="text-slate-400 text-[11px] italic">No description</span>}
                            </div>
                          </td>
                          <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setActiveMeetingId(meeting.id!);
                                  setMobileViewMode("detail");
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                title="View meeting details and discussion points"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {hasPermission(userRole, "meetingNotes", "delete", meeting.authorId === (currentUser?.uid || ""), permissions) && (
                                <button
                                  onClick={() => setMeetingToDelete(meeting.id!)}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                  title="Delete meeting"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
                Showing {filteredMeetings.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMeetings.length)} of {filteredMeetings.length} entries
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                  >
                    Previous
                  </button>
                  <span className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold shadow-sm shadow-indigo-150">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* DETAIL VIEW */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {activeMeeting ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                
                {/* Detail Header */}
                <div className="p-6 md:p-8 border-b border-slate-200 bg-[#fbfcfd]/50 shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setActiveMeetingId(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to Meeting List
                    </button>

                    <div className="flex items-center gap-2">
                      {activeMeeting.meetingLink && (
                        <a
                          href={activeMeeting.meetingLink.startsWith("http") ? activeMeeting.meetingLink : `https://${activeMeeting.meetingLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Meeting <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      )}
                      {hasPermission(userRole, "meetingNotes", "update", activeMeeting.authorId === (currentUser?.uid || ""), permissions) && (
                        <button
                          onClick={() => startEdit(activeMeeting)}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> Edit
                        </button>
                      )}
                      {hasPermission(userRole, "meetingNotes", "delete", activeMeeting.authorId === (currentUser?.uid || ""), permissions) && (
                        <button
                          onClick={() => setMeetingToDelete(activeMeeting.id!)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-rose-100 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                      {activeMeeting.title}
                    </h2>
                  </div>

                  {activeMeeting.description && (
                    <div className="mt-4 p-4 border border-indigo-100/60 bg-indigo-50/20 rounded-lg border-l-4 border-l-indigo-600 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black text-indigo-700 tracking-wider uppercase block mb-1">
                          Meeting Description / Agenda
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mb-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(activeMeeting.createdAt)}</span>
                          <span>•</span>
                          <span>Created by <UserBadge authorId={activeMeeting.authorId} users={users} /></span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap">
                          {activeMeeting.description}
                        </p>
                      </div>
                      {activeMeeting.fileName && (
                        <button
                          onClick={() => handleDownloadMeeting(activeMeeting.id!, activeMeeting.fileName!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all border border-emerald-200 cursor-pointer shadow-2xs shrink-0 self-start sm:self-center"
                          title="Unduh Berkas Lampiran"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate max-w-[140px]">{activeMeeting.fileName}</span>
                          <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded font-black">Download</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Discussion Points Table */}
                <div className="p-4 md:p-8 bg-[#fafbfc]">
                  <DiscussionPointsTable
                    projectId={projectId}
                    meetingId={activeMeeting.id!}
                    userRole={userRole}
                    currentUser={currentUser}
                    permissions={permissions}
                    projectMembers={projectMembers}
                    masterData={masterData}
                  />
                </div>

              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* POPUP MODAL: Add / Edit Meeting */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white p-7 rounded-lg shadow-2xl w-full max-w-lg border border-slate-200 animate-in scale-in duration-200 text-left relative">
            
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
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6 pr-10">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {editingMeeting ? "Edit Meeting Note" : "Create New Meeting Note"}
                </h3>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5">
                  Meeting Title <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                  placeholder="e.g., Sprint 4 Planning & Architecture Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs cursor-pointer"
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Meeting Time
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all shadow-2xs cursor-pointer"
                    value={newMeetingTime}
                    onChange={(e) => setNewMeetingTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-slate-400" />
                  Meeting Link
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <input
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                    placeholder="https://zoom.us/j/... or Google Meet"
                    value={newMeetingLink}
                    onChange={(e) => setNewMeetingLink(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5">
                  Description / Agenda
                </label>
                <textarea
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-lg text-xs font-semibold text-slate-800 outline-none transition-all resize-none min-h-[90px] placeholder:text-slate-400 shadow-2xs"
                  placeholder="Outline key discussion topics..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              {/* Upload Document Section */}
              <div>
                <label className="block text-slate-700 font-bold text-xs tracking-wider uppercase mb-1.5 flex items-center justify-between">
                  <span>Upload Document (PDF, Word, Excel • Max 5MB)</span>
                  {newMeetingFile && (
                    <button
                      type="button"
                      onClick={() => setNewMeetingFile(null)}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  )}
                </label>
                
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-3 text-center bg-slate-50/50 transition-all relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Ukuran berkas maksimal 5 MB.");
                          return;
                        }
                        setNewMeetingFile(file);
                        setShouldRemoveMeetingFile(false);
                      }
                    }}
                  />
                  {newMeetingFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{newMeetingFile.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">({(newMeetingFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : editingMeeting?.fileName && !shouldRemoveMeetingFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">{editingMeeting.fileName}</span>
                        <span className="text-[10px] font-semibold text-slate-400">(Existing)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShouldRemoveMeetingFile(true);
                        }}
                        className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold transition-all"
                      >
                        Hapus Berkas
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-600">Klik atau seret berkas ke sini untuk upload</p>
                      <p className="text-[10px] text-slate-400">PDF, Word (.doc, .docx), Excel (.xls, .xlsx) hingga 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={loading || !newTitle.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-150 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Meeting</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Delete Meeting Confirmation (SweetAlert style) */}
      {meetingToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-150">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 text-left">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-2 text-center">
              Delete Meeting Note?
            </h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-6 text-center">
              Are you sure you want to delete this meeting? All discussion points and tasks associated with it will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMeetingToDelete(null)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMeeting}
                disabled={loading}
                className="flex-1 px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-lg shadow-rose-100 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
