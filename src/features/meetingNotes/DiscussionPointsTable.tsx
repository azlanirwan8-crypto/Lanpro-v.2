import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  getDiscussionPoints,
  createDiscussionPoint,
  updateDiscussionPoint,
  deleteDiscussionPoint,
  getDiscussionPointComments,
  createDiscussionPointComment,
  getUsers,
} from "../../services/meetingService";
import {
  type DiscussionPoint,
  type DiscussionPointComment,
  type UserProfile,
  type AppRole,
  type UserPermissions,
  type MasterData,
} from "../../types";
import { StyledDropdown } from "../../components/ui/CommonComponents";
import { AiMeetingCompanion } from "./AiMeetingCompanion";
import { cn } from "../../lib/utils";
import {
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  Calendar,
  CornerDownRight,
  Clock,
  CheckCircle2,
  X,
  Send,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { hasPermission } from "../../lib/permissions";

interface DiscussionPointsTableProps {
  projectId: string;
  meetingId: string;
  userRole: AppRole;
  currentUser: UserProfile | null;
  permissions?: Partial<UserPermissions>;
  projectMembers?: UserProfile[];
  masterData?: MasterData[];
}

export const DiscussionPointsTable: React.FC<DiscussionPointsTableProps> = ({
  projectId,
  meetingId,
  userRole,
  currentUser,
  permissions,
  projectMembers = [],
  masterData = [],
}) => {
  const [points, setPoints] = useState<DiscussionPoint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DiscussionPoint>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showAiCompanion, setShowAiCompanion] = useState(false);

  // Inline Quick Add State (Live Table Row with separate uncombined fields)
  const [quickConcern, setQuickConcern] = useState("");
  const [quickCatatan, setQuickCatatan] = useState("");
  const [quickAssignTo, setQuickAssignTo] = useState("Unassigned");
  const [quickFitur, setQuickFitur] = useState("");
  const [quickTargetDate, setQuickTargetDate] = useState("");

  const [pointToDelete, setPointToDelete] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredPoints = points.filter(p => 
    (p.concern || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.keterangan || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.fitur || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.assignTo || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPoints.length / itemsPerPage) || 1;
  const paginatedPoints = filteredPoints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleToggleStatus = async (point: DiscussionPoint) => {
    if (!point.id) return;
    const nextStatus = point.status === "completed" ? "pending" : "completed";
    try {
      setPoints((prev) =>
        prev.map((p) => (p.id === point.id ? { ...p, status: nextStatus } : p))
      );
      await updateDiscussionPoint(
        projectId,
        meetingId,
        point.id,
        { status: nextStatus },
        currentUser?.uid
      );
      toast.success(`Status diubah menjadi ${nextStatus === "completed" ? "DONE" : "PENDING"}`);
    } catch (e: any) {
      toast.error("Gagal mengubah status: " + e.message);
      fetchPoints();
    }
  };

  useEffect(() => {
    fetchPoints();
    fetchUsers();
  }, [meetingId, projectId]);

  useEffect(() => {
    let socket: any;
    try {
      socket = io();
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR]", err);
      });
    } catch (err) {
      console.error("[SOCKET FATAL]", err);
    }

    if (socket) {
      socket.on("data_changed", (event: any) => {
         if (event.path?.includes("/discussionPoints") || event.path?.includes("/meetings")) {
            fetchPoints();
         }
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [meetingId, projectId]);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers(currentUser?.uid);
      setUsers(fetchedUsers);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
    }
  };

  const canAdd = hasPermission(
    userRole,
    "meetingNotes",
    "create",
    false,
    permissions,
  );

  // Handle Live Inline Quick Add
  const handleLiveQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }
    if (!canAdd) {
      toast.error("Anda tidak memiliki izin untuk menambah poin diskusi.");
      return;
    }
    if (!quickConcern.trim()) {
      toast.error("Concern / Topic wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        concern: quickConcern.trim(),
        keterangan: quickCatatan.trim(),
        assignTo: quickAssignTo === "Unassigned" ? "" : quickAssignTo,
        fitur: quickFitur || "",
        targetDate: quickTargetDate || "",
        status: "pending",
        authorId: currentUser.uid,
      };

      await createDiscussionPoint(projectId, meetingId, payload, currentUser.uid);
      toast.success("Poin diskusi berhasil ditambahkan!");
      setQuickConcern("");
      setQuickCatatan("");
      setQuickAssignTo("Unassigned");
      setQuickFitur("");
      setQuickTargetDate("");
      fetchPoints();
    } catch (error: any) {
      console.error("Error saving point:", error);
      toast.error("Gagal menambah poin: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (point: DiscussionPoint) => {
    const isOwner = point.authorId === (currentUser?.uid || "");
    if (!hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)) {
      toast.error("Anda tidak memiliki izin untuk mengedit poin ini.");
      return;
    }
    setEditingId(point.id!);
    setEditForm(point);
  };

  // Thread Comments Drawer State
  const [activeThreadPoint, setActiveThreadPoint] = useState<DiscussionPoint | null>(null);
  const [threadComments, setThreadComments] = useState<DiscussionPointComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentsMap, setCommentsMap] = useState<Record<string, DiscussionPointComment[]>>({});

  const fetchCommentsForPoint = async (pointId: string) => {
    try {
      const fetched = await getDiscussionPointComments(pointId, currentUser?.uid);
      setCommentsMap((prev) => ({ ...prev, [pointId]: fetched }));
      return fetched;
    } catch (e) {
      console.error("Failed to fetch comments:", e);
      return [];
    }
  };

  const handleOpenThreadDrawer = async (point: DiscussionPoint) => {
    setActiveThreadPoint(point);
    setNewCommentText("");
    if (point.id) {
      const comments = await fetchCommentsForPoint(point.id);
      setThreadComments(comments);
    }
  };

  const handleSendThreadComment = async () => {
    if (!activeThreadPoint?.id) return;
    if (!newCommentText.trim()) {
      toast.error("Tulis balasan atau komentar terlebih dahulu.");
      return;
    }

    setIsSendingComment(true);
    try {
      const userName = currentUser?.displayName || currentUser?.username || (currentUser as any)?.nama_lengkap || (currentUser as any)?.name || "Member";
      await createDiscussionPointComment(
        activeThreadPoint.id,
        {
          userId: currentUser?.uid || (currentUser as any)?.id,
          userName,
          commentText: newCommentText.trim(),
        },
        currentUser?.uid || (currentUser as any)?.id
      );

      toast.success("Balasan berhasil dikirim!");
      setNewCommentText("");
      const updated = await fetchCommentsForPoint(activeThreadPoint.id);
      setThreadComments(updated);
    } catch (e: any) {
      toast.error("Gagal mengirim balasan: " + e.message);
    } finally {
      setIsSendingComment(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const fetchedPoints = await getDiscussionPoints(projectId, meetingId, currentUser?.uid);
      setPoints(fetchedPoints);
      fetchedPoints.forEach((p: DiscussionPoint) => {
        if (p.id) fetchCommentsForPoint(p.id);
      });
    } catch (error: any) {
      console.error("Failed to fetch discussion points:", error);
    }
  };

  const handleDelete = async () => {
    if (!pointToDelete) return;
    setIsSaving(true);
    try {
      await deleteDiscussionPoint(projectId, meetingId, pointToDelete, currentUser?.uid);
      toast.success("Point successfully deleted.");
      fetchPoints();
      setPointToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete point.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const point = points.find((p) => p.id === editingId);
    if (!point) return;

    const isOwner = point.authorId === (currentUser?.uid || "");
    if (!hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)) {
      toast.error("Anda tidak memiliki izin untuk mengedit poin ini.");
      return;
    }

    if (!editForm.concern?.trim()) {
      toast.error("Concern / Topic cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      await updateDiscussionPoint(projectId, meetingId, editingId, editForm, currentUser?.uid);
      toast.success("Changes successfully saved.");
      setEditingId(null);
      setEditForm({});
      fetchPoints();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const userOptions = projectMembers.map(m => ({
    id: m?.uid || '',
    label: m?.displayName || m?.username || 'Unknown User'
  }));

  return (
    <div className="bg-white flex flex-col font-sans text-left">
      {/* Header Bar Clean Title */}
      <div className="px-6 py-5 border-b border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Poin Diskusi & Keputusan
            </h3>
            <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
              Discussion points & action items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari poin diskusi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 outline-none shadow-2xs"
            />
          </div>

          <button
            onClick={() => setShowAiCompanion(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-2xs cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" /> AI Meeting Assistant
          </button>
        </div>
      </div>

      {showAiCompanion && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> AI Meeting Assistant
              </h3>
              <button
                onClick={() => setShowAiCompanion(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <AiMeetingCompanion
              projectId={projectId}
              meeting={{ id: meetingId, title: "Meeting Discussion" } as any}
              currentUser={currentUser}
              projectMembers={projectMembers}
              onPointsImported={() => {
                setShowAiCompanion(false);
                fetchPoints();
                toast.success("AI discussion points imported successfully!");
              }}
            />
          </div>
        </div>
      )}

      {pointToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold">Hapus Poin</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus poin diskusi ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPointToDelete(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal Popup (When clicking edit icon on a row) */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/60 flex items-center justify-center border border-indigo-100 text-indigo-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">Edit Poin Diskusi</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Ubah detail, catatan, atau penanggung jawab</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditingId(null); setEditForm({}); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Concern / Topic *</label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white min-h-[80px]"
                  value={editForm.concern || ""}
                  onChange={(e) => setEditForm({ ...editForm, concern: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Catatan / Keterangan</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    value={editForm.keterangan || ""}
                    onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tindakan Lanjut</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    value={editForm.tindakanLanjut || ""}
                    onChange={(e) => setEditForm({ ...editForm, tindakanLanjut: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PIC (Assigned To)</label>
                  <StyledDropdown
                    value={editForm.assignTo || "Unassigned"}
                    onChange={(val) => setEditForm({ ...editForm, assignTo: val })}
                    options={[{ id: 'Unassigned', label: 'Unassigned' }, ...userOptions]}
                    members={projectMembers}
                    type="member"
                    masterData={masterData}
                    buttonClassName="w-full h-10 px-3 bg-white border border-slate-200 text-xs text-left text-slate-700 rounded-xl font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fitur</label>
                  <StyledDropdown
                    value={editForm.fitur || ""}
                    onChange={(val) => setEditForm({ ...editForm, fitur: val })}
                    options={masterData.filter(m => m.type?.toLowerCase() === 'fitur').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                    type="fitur"
                    masterData={masterData}
                    buttonClassName="w-full h-10 px-3 bg-white border border-slate-200 text-xs text-left text-slate-700 rounded-xl font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Date</label>
                  <input
                    type="date"
                    value={editForm.targetDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, targetDate: e.target.value })}
                    className="w-full h-10 px-3 bg-white border border-slate-200 text-xs text-slate-700 rounded-xl font-semibold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => { setEditingId(null); setEditForm({}); }}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STREAMLINED LIVE EDITABLE DATA TABLE */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
              <th className="py-3.5 px-4 w-12 text-center">No</th>
              <th className="py-3.5 px-4 min-w-[220px]">Concern</th>
              <th className="py-3.5 px-4 min-w-[200px]">Catatan / Keterangan</th>
              <th className="py-3.5 px-4 min-w-[150px]">Context / Tags</th>
              <th className="py-3.5 px-4 min-w-[140px]">PIC</th>
              <th className="py-3.5 px-4 min-w-[130px]">Target Date</th>
              <th className="py-3.5 px-4 w-24 text-center">Thread</th>
              <th className="py-3.5 px-4 w-28 text-center">Status</th>
              <th className="py-3.5 px-4 w-24 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedPoints.map((p, idx) => {
              const isOwner = p.authorId === (currentUser?.uid || "");
              const isCompleted = p.status === "completed";
              const assigneeName = projectMembers.find(m => (m.uid || m.id) === (p.assignTo || p.assignee_id))?.displayName || 
                                   projectMembers.find(m => (m.uid || m.id) === (p.assignTo || p.assignee_id))?.username || 
                                   p.assignTo || "Unassigned";

              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-4 px-4 text-center font-bold text-slate-400 text-xs align-top">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </td>

                  {/* Concern */}
                  <td className="py-4 px-4 align-top">
                    <div className={`font-bold text-slate-900 text-xs leading-snug ${isCompleted ? "line-through text-slate-400" : ""}`}>
                      {p.concern}
                    </div>
                    {(p.tindakanLanjut || p.next_action) && (
                      <div className="text-indigo-600 text-[11px] font-medium flex items-center gap-1 mt-1 pt-1 border-t border-slate-100">
                        <span className="font-bold uppercase text-[9px] text-indigo-400">Next:</span>
                        {p.tindakanLanjut || p.next_action}
                      </div>
                    )}
                  </td>

                  {/* Catatan / Keterangan */}
                  <td className="py-4 px-4 align-top">
                    <div className="text-slate-600 text-xs font-normal leading-relaxed">
                      {p.keterangan || p.comment || <span className="text-slate-300 italic">No notes</span>}
                    </div>
                  </td>

                  {/* Context / Tags */}
                  <td className="py-4 px-4 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {p.fitur && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100/80 rounded-md text-[10px] font-bold">
                          {p.fitur}
                        </span>
                      )}
                      {p.system && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100/80 rounded-md text-[10px] font-bold">
                          {p.system}
                        </span>
                      )}
                      {p.surrounding && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100/80 rounded-md text-[10px] font-bold">
                          {p.surrounding}
                        </span>
                      )}
                      {!p.fitur && !p.system && !p.surrounding && (
                        <span className="text-slate-300 text-[11px] italic">No tags</span>
                      )}
                    </div>
                  </td>

                  {/* PIC */}
                  <td className="py-4 px-4 align-top">
                    <div className="text-xs font-bold text-slate-800">
                      {assigneeName}
                    </div>
                  </td>

                  {/* Target Date */}
                  <td className="py-4 px-4 align-top">
                    {(p.targetDate || p.target_date) ? (
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.targetDate || p.target_date}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-xs italic">-</span>
                    )}
                  </td>

                  {/* Thread Icon Button */}
                  <td className="py-4 px-4 text-center align-top">
                    {(() => {
                      const commentsList = p.id ? (commentsMap[p.id] || []) : [];
                      const count = commentsList.length;

                      return (
                        <button
                          type="button"
                          onClick={() => handleOpenThreadDrawer(p)}
                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                            count > 0
                              ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200/60"
                          }`}
                          title="Buka Thread Komentar & Balasan"
                        >
                          <MessageSquare className={`w-3.5 h-3.5 ${count > 0 ? "text-indigo-600 fill-indigo-100" : "text-slate-400"}`} />
                          <span>{count}</span>
                        </button>
                      );
                    })()}
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4 text-center align-top">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className="cursor-pointer transition-all active:scale-95 inline-block"
                      title="Klik untuk ubah status PENDING / DONE"
                    >
                      {isCompleted ? (
                        <span className="flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs hover:bg-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          DONE
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300 shadow-2xs hover:bg-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDING
                        </span>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-center align-top">
                    <div className="flex items-center justify-center gap-1.5">
                      {hasPermission(userRole, "meetingNotes", "update", isOwner, permissions) && (
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {hasPermission(userRole, "meetingNotes", "delete", isOwner, permissions) && (
                        <button
                          onClick={() => setPointToDelete(p.id!)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* LIVE QUICK ADD INLINE ROW (Separate columns matching headers) */}
            {canAdd && (
              <tr className="bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors">
                <td className="py-3 px-4 text-center font-bold text-indigo-500 text-xs align-middle">
                  <Plus className="w-4 h-4 mx-auto animate-bounce text-indigo-600" />
                </td>

                {/* Concern */}
                <td className="py-3 px-4 align-middle">
                  <input
                    type="text"
                    placeholder="✨ Ketik concern..."
                    value={quickConcern}
                    onChange={(e) => setQuickConcern(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLiveQuickAdd(); }}
                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg text-xs font-semibold text-slate-800 outline-none shadow-2xs placeholder:text-slate-400"
                  />
                </td>

                {/* Catatan / Keterangan */}
                <td className="py-3 px-4 align-middle">
                  <input
                    type="text"
                    placeholder="Catatan / Keterangan..."
                    value={quickCatatan}
                    onChange={(e) => setQuickCatatan(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLiveQuickAdd(); }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-normal text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </td>

                {/* Context / Tags */}
                <td className="py-3 px-4 align-middle">
                  <StyledDropdown
                    value={quickFitur}
                    onChange={(val) => setQuickFitur(val)}
                    options={masterData.filter(m => m.type?.toLowerCase() === 'fitur').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                    type="fitur"
                    masterData={masterData}
                    buttonClassName="w-full h-8 px-2.5 bg-white border border-slate-200 text-xs text-left text-slate-700 rounded-lg font-semibold shadow-2xs"
                  />
                </td>

                {/* PIC */}
                <td className="py-3 px-4 align-middle">
                  <StyledDropdown
                    value={quickAssignTo}
                    onChange={(val) => setQuickAssignTo(val)}
                    options={[{ id: 'Unassigned', label: 'Assign PIC' }, ...userOptions]}
                    members={projectMembers}
                    type="member"
                    masterData={masterData}
                    buttonClassName="w-full h-8 px-2.5 bg-white border border-slate-200 text-xs text-left text-slate-700 rounded-lg font-semibold shadow-2xs"
                  />
                </td>

                {/* Target Date */}
                <td className="py-3 px-4 align-middle">
                  <input
                    type="date"
                    value={quickTargetDate}
                    onChange={(e) => setQuickTargetDate(e.target.value)}
                    className="w-full h-8 px-2 bg-white border border-slate-200 text-xs text-slate-700 rounded-lg font-semibold outline-none"
                  />
                </td>

                {/* Thread */}
                <td className="py-3 px-4 text-center align-middle text-slate-300 text-xs">
                  -
                </td>

                {/* Status */}
                <td className="py-3 px-4 text-center align-middle">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300">
                    PENDING
                  </span>
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => handleLiveQuickAdd()}
                    disabled={isSaving || !quickConcern.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                    title="Tambah Poin"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-3.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
        <div>
          Menampilkan {paginatedPoints.length} dari {filteredPoints.length} poin (Total: {points.length})
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="px-3 py-1 font-bold bg-white border border-slate-200 rounded-lg text-indigo-600 shadow-2xs">
            {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* THREAD DISCUSSIONS SLIDE-OVER SHEET */}
      {activeThreadPoint && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[9999] flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250 text-left">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">
                    Thread Discussions
                  </span>
                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {activeThreadPoint.concern}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveThreadPoint(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
                title="Tutup Thread"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-slate-50/30">
              {threadComments.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Belum Ada Balasan Komentar</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 leading-normal">
                    Jadilah yang pertama memberikan balasan atau instruksi tambahan untuk PIC topik ini!
                  </p>
                </div>
              ) : (
                threadComments.map((comment) => {
                  const authorName = comment.userName || comment.user_name || (comment as any).authorName || (comment as any).name || "Member";
                  const commentBody = comment.commentText || comment.comment_text || (comment as any).content || (comment as any).text || "";
                  const commentDate = comment.createdAt || comment.created_at || new Date();
                  const c = comment as any;
                  const commentUserId = c.userId || c.user_id || c.authorId || c.author_id;
                  const isMine = (commentUserId && currentUser && (commentUserId === currentUser.uid || commentUserId === currentUser.id)) ||
                                 (authorName && currentUser && (authorName === currentUser.displayName || authorName === currentUser.username));

                  return (
                    <div key={comment.id || Math.random()} className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "p-4 rounded-2xl max-w-[85%] md:max-w-2xl shadow-xs",
                        isMine ? "bg-indigo-600 text-white border-0" : "bg-white text-slate-700 border border-gray-200"
                      )}>
                        {/* Header Baris Atas */}
                        <div className={cn(
                          "flex items-center justify-between mb-2 gap-3",
                          isMine ? "flex-row-reverse" : "flex-row"
                        )}>
                          <div className={cn("flex items-center gap-2", isMine ? "flex-row-reverse" : "flex-row")}>
                            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 object-cover shadow-2xs">
                              {(authorName[0] || "U")}
                            </div>
                            <span className={cn(
                              "text-sm font-semibold tracking-tight",
                              isMine ? "text-white" : "text-slate-700"
                            )}>
                              {authorName}
                            </span>
                          </div>
                          <span className={cn(
                            "text-xs font-medium",
                            isMine ? "text-white/80" : "text-gray-400"
                          )}>
                            {new Date(commentDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Isi Teks */}
                        <p className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap break-words",
                          isMine ? "text-white" : "text-slate-700"
                        )}>
                          {commentBody}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
                <input
                  type="text"
                  placeholder="Tulis balasan atau instruksi untuk PIC..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSendingComment && newCommentText.trim()) {
                      handleSendThreadComment();
                    }
                  }}
                  className="w-full bg-transparent border-0 focus:ring-0 outline-none text-xs text-slate-800 placeholder:text-slate-400 py-1"
                />
                <button
                  onClick={handleSendThreadComment}
                  disabled={isSendingComment || !newCommentText.trim()}
                  className="p-2 text-indigo-600 hover:text-indigo-700 disabled:opacity-40 cursor-pointer rounded-full transition-colors shrink-0"
                  title="Kirim Balasan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionPointsTable;
