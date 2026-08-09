import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  getDiscussionPoints,
  createDiscussionPoint,
  updateDiscussionPoint,
  deleteDiscussionPoint,
  getDiscussionPointComments,
  createDiscussionPointComment,
  getMasterData,
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
} from "lucide-react";
import { toast } from "sonner";
import { hasPermission } from "../../lib/permissions";
import { UserBadge } from "./UserBadge";

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
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<Partial<DiscussionPoint>>({
    status: "pending",
  });

  // Quick Inline Creation Row States (Complete 100% Modal Fields)
  const [quickConcern, setQuickConcern] = useState("");
  const [quickKeterangan, setQuickKeterangan] = useState("");
  const [quickTindakanLanjut, setQuickTindakanLanjut] = useState("");
  const [quickAssignee, setQuickAssignee] = useState("");
  const [quickFitur, setQuickFitur] = useState("");
  const [quickSystem, setQuickSystem] = useState("");
  const [quickSurrounding, setQuickSurrounding] = useState("");
  const [quickTargetDate, setQuickTargetDate] = useState("");
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineConcernVal, setInlineConcernVal] = useState("");

  const [pointToDelete, setPointToDelete] = useState<string | null>(null);

  const handleQuickAdd = async () => {
    if (!currentUser) {
      toast.error("Silakan login untuk menambah poin diskusi.");
      return;
    }
    if (!quickConcern.trim()) {
      toast.error("Mohon isi Concern / Topic terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      await createDiscussionPoint(
        projectId,
        meetingId,
        {
          concern: quickConcern.trim(),
          keterangan: quickKeterangan.trim() || undefined,
          comment: quickKeterangan.trim() || undefined,
          tindakanLanjut: quickTindakanLanjut.trim() || undefined,
          next_action: quickTindakanLanjut.trim() || undefined,
          assignTo: quickAssignee || undefined,
          assignee_id: quickAssignee || undefined,
          fitur: quickFitur || undefined,
          feature_id: quickFitur || undefined,
          system: quickSystem || undefined,
          system_id: quickSystem || undefined,
          surrounding: quickSurrounding || undefined,
          surrounding_id: quickSurrounding || undefined,
          targetDate: quickTargetDate || undefined,
          target_date: quickTargetDate || undefined,
          status: "pending",
          authorId: currentUser.uid,
        },
        currentUser.uid
      );

      toast.success("Poin diskusi berhasil ditambahkan!");
      setQuickConcern("");
      setQuickKeterangan("");
      setQuickTindakanLanjut("");
      setQuickAssignee("");
      setQuickFitur("");
      setQuickSystem("");
      setQuickSurrounding("");
      setQuickTargetDate("");
      fetchPoints();
    } catch (error: any) {
      toast.error("Gagal menambah poin: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleInlineSaveConcern = async (pointId: string) => {
    if (!inlineConcernVal.trim()) return;
    try {
      setPoints((prev) =>
        prev.map((p) => (p.id === pointId ? { ...p, concern: inlineConcernVal.trim() } : p))
      );
      await updateDiscussionPoint(
        projectId,
        meetingId,
        pointId,
        { concern: inlineConcernVal.trim() },
        currentUser?.uid
      );
      toast.success("Topik berhasil diperbarui.");
      setInlineEditingId(null);
    } catch (e: any) {
      toast.error("Gagal memperbarui topik: " + e.message);
      fetchPoints();
    }
  };

  const handleInlineUpdateField = async (pointId: string, field: keyof DiscussionPoint, value: any) => {
    try {
      setPoints((prev) =>
        prev.map((p) => (p.id === pointId ? { ...p, [field]: value } : p))
      );
      await updateDiscussionPoint(
        projectId,
        meetingId,
        pointId,
        { [field]: value },
        currentUser?.uid
      );
      toast.success("Data berhasil diperbarui.");
    } catch (e: any) {
      toast.error("Gagal memperbarui data: " + e.message);
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
      
      // Safe handlers to prevent unhandled rejections
      socket.on("error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe discussion socket error caught internally:", err);
      });
      socket.on("connect_error", (err: any) => {
        console.warn("[SOCKET ERROR] Safe discussion socket connect_error caught internally:", err);
      });
      
      socket.onerror = (err: any) => {
        console.warn("[SOCKET ERROR] Native-like discussion socket onerror caught internally:", err);
      };
      socket.onclose = () => {
        console.log("[SOCKET] Native-like discussion socket onclose triggered.");
      };

      if (socket.io) {
        socket.io.on("error", (err: any) => {
          console.warn("[SOCKET IO ERROR] Discussion engine.io error suppressed:", err);
        });
      }
      if (socket.io && socket.io.engine) {
        socket.io.engine.on("error", (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Discussion engine error suppressed:", err);
        });
        socket.io.engine.onerror = (err: any) => {
          console.warn("[SOCKET ENGINE ERROR] Discussion engine onerror suppressed:", err);
        };
        socket.io.engine.onclose = () => {
          console.log("[SOCKET ENGINE] Discussion engine closed.");
        };
      }
    } catch (err) {
      console.error("[SOCKET FATAL] Failed to initialize discussion socket safely:", err);
    }

    if (socket) {
      socket.on("data_changed", (event) => {
         if (event.path.includes("/discussionPoints") || event.path.includes("/meetings")) {
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
      toast.error(error.message || "Failed to load users");
    }
  };

  const currentUserProfile =
    users.find((u) => u.uid === currentUser?.uid) || currentUser;

  const canAdd = hasPermission(
    userRole,
    "meetingNotes",
    "create",
    false,
    permissions,
  );

  const saveAdd = async () => {
    if (!currentUser) return;

    if (
      !hasPermission(userRole, "meetingNotes", "create", false, permissions)
    ) {
      toast.error("Anda tidak memiliki izin untuk menambah poin diskusi.");
      return;
    }

    if (!addForm.concern?.trim()) {
      toast.error("'Concern' field is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        ...addForm,
        authorId: currentUser.uid,
      };
      if (parentId) {
        payload.parentPointId = parentId;
      }

      await createDiscussionPoint(projectId, meetingId, payload, currentUser.uid);

      toast.success("Discussion point successfully added.");
      setIsAdding(false);
      setParentId(null);
      setAddForm({ status: "pending" });
      fetchPoints();
    } catch (error) {
      console.error("Error saving point:", error);
      toast.error("Failed to add point: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (point: DiscussionPoint) => {
    const isOwner = point.authorId === (currentUser?.uid || "");
    if (
      !hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)
    ) {
      toast.error("Anda tidak memiliki izin untuk mengedit poin ini.");
      return;
    }
    setEditingId(point.id!);
    setEditForm(point);
    setIsAdding(false);
    setParentId(null);
  };

  const startAdd = (id?: string | any) => {
    if (!currentUser) {
      toast.error("Please login to add points.");
      return;
    }

    if (
      !hasPermission(userRole, "meetingNotes", "create", false, permissions)
    ) {
      toast.error("Anda tidak memiliki izin untuk menambah poin diskusi.");
      return;
    }

    setIsAdding(true);
    setEditingId(null);
    setParentId(typeof id === "string" ? id : null);
    setAddForm({ status: "pending" });
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
      console.error("Failed to fetch comments for point:", e);
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
      const userName = currentUser?.displayName || currentUser?.username || "Member";
      await createDiscussionPointComment(
        activeThreadPoint.id,
        {
          userId: currentUser?.uid,
          userName,
          commentText: newCommentText.trim(),
        },
        currentUser?.uid
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
      toast.error(error.message || "Failed to load discussion points");
    }
  };

  const handleDelete = async () => {
    if (!pointToDelete) return;
    const point = points.find((p) => p.id === pointToDelete);
    if (!point) return;

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
    if (
      !hasPermission(userRole, "meetingNotes", "update", isOwner, permissions)
    ) {
      toast.error("Anda tidak memiliki izin untuk mengedit poin ini.");
      return;
    }

    if (!editForm.concern?.trim()) {
      toast.error("'Concern' column cannot be empty.");
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

  const renderStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <span className="flex items-center gap-1 w-max px-2 py-1 rounded uppercase text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 w-max px-2 py-1 rounded uppercase text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
        <Clock className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const fields = [
    { name: "concern", label: "Concern / Topic", type: "textarea", width: "min-w-[14rem] w-[20%]" },
    { name: "assignTo", label: "Assigned To", type: "user-select", width: "min-w-[9rem] w-[10%]" },
    { name: "fitur", label: "Feature", type: "select", width: "min-w-[7rem] w-[8%]" },
    { name: "system", label: "System", type: "select", width: "min-w-[7rem] w-[8%]" },
    { name: "surrounding", label: "Surrounding", type: "select", width: "min-w-[7rem] w-[8%]" },
    { name: "keterangan", label: "Comment", type: "textarea", width: "min-w-[12rem] w-[15%]" },
    { name: "tindakanLanjut", label: "Next Action", type: "textarea", width: "min-w-[12rem] w-[15%]" },
    { name: "targetDate", label: "Target", type: "date", width: "min-w-[8rem] w-[8%]" },
  ] as const;

  const isCurrentlyEditing = editingId !== null;
  const showFormModal = isAdding || isCurrentlyEditing;
  const activeFormState = isCurrentlyEditing ? editForm : addForm;
  
  const setActiveFormState = (updater: any) => {
    if (isCurrentlyEditing) {
      setEditForm(updater);
    } else {
      setAddForm(updater);
    }
  };

  const topLevelPoints = points.filter(p => !p.parentPointId);

  return (
    <div className="my-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col mt-4 font-sans text-left">
      <div className="px-6 py-5 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-indigo-650" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Poin Diskusi & Keputusan
            </h3>
            <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider">
              Track decisions, questions, and action items here
            </p>
          </div>
        </div>
      </div>

      {pointToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold">Delete Point</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Are you sure you want to delete this discussion point? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPointToDelete(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSaving}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Form Modal Popup for Add / Edit / Reply */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/60 flex items-center justify-center border border-indigo-100">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">
                    {isCurrentlyEditing ? "Edit Discussion Point" : (parentId ? "Reply to Discussion Point" : "Add New Discussion Point")}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium tracking-tight">
                    {isCurrentlyEditing ? "Modify the properties and details of this discussion item" : "Create a new decision point, question, or action item"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setParentId(null);
                  setAddForm({ status: "pending" });
                  setEditForm({});
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Form Scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {parentId && !isCurrentlyEditing && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl flex items-start gap-2 text-xs text-indigo-700 font-medium">
                   <CornerDownRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                   <div>
                     <span className="font-bold uppercase tracking-wider text-[9px] text-indigo-500 block mb-0.5">Replying To Parent Point</span>
                     {points.find(p => p.id === parentId)?.concern}
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left side larger fields */}
                <div className="md:col-span-7 space-y-5">
                  {/* Concern / Topic */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                      Concern / Topic <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 min-h-[100px] resize-y"
                      placeholder="What is the key topic, issue, concern or question being discussed?"
                      value={activeFormState.concern || ""}
                      onChange={(e) => setActiveFormState((prev: any) => ({ ...prev, concern: e.target.value }))}
                    />
                  </div>

                  {/* Comment */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Comment / Keterangan</label>
                    <textarea
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 min-h-[80px] resize-y"
                      placeholder="Add additional context, comments, notes, or details..."
                      value={activeFormState.keterangan || ""}
                      onChange={(e) => setActiveFormState((prev: any) => ({ ...prev, keterangan: e.target.value }))}
                    />
                  </div>

                  {/* Next Action */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Action / Tindakan Lanjut</label>
                    <textarea
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 min-h-[80px] resize-y"
                      placeholder="What are the agreed next actions or resolutions?"
                      value={activeFormState.tindakanLanjut || ""}
                      onChange={(e) => setActiveFormState((prev: any) => ({ ...prev, tindakanLanjut: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Right side settings/fields */}
                <div className="md:col-span-5 space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/60">
                  {/* Assigned To */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Assigned To</label>
                    <StyledDropdown
                      value={activeFormState.assignTo || "Unassigned"}
                      onChange={(val) => setActiveFormState((prev: any) => ({ ...prev, assignTo: val }))}
                      options={[{ id: 'Unassigned', label: 'Unassigned' }, ...userOptions]}
                      members={projectMembers}
                      type="member"
                      masterData={masterData}
                      buttonClassName="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-left text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  {/* Feature */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feature</label>
                    <StyledDropdown
                      value={activeFormState.fitur || ""}
                      onChange={(val) => setActiveFormState((prev: any) => ({ ...prev, fitur: val }))}
                      options={masterData.filter(m => m.type?.toLowerCase() === 'fitur').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                      type="fitur"
                      masterData={masterData}
                      buttonClassName="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-left text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  {/* System */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System</label>
                    <StyledDropdown
                      value={activeFormState.system || ""}
                      onChange={(val) => setActiveFormState((prev: any) => ({ ...prev, system: val }))}
                      options={masterData.filter(m => m.type?.toLowerCase() === 'system').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                      type="system"
                      masterData={masterData}
                      buttonClassName="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-left text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  {/* Surrounding */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Surrounding</label>
                    <StyledDropdown
                      value={activeFormState.surrounding || ""}
                      onChange={(val) => setActiveFormState((prev: any) => ({ ...prev, surrounding: val }))}
                      options={masterData.filter(m => m.type?.toLowerCase() === 'surrounding').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                      type="surrounding"
                      masterData={masterData}
                      buttonClassName="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-left text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>

                  {/* Target Date */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Date</label>
                    <input
                      type="date"
                      value={activeFormState.targetDate || ""}
                      onChange={(e) => setActiveFormState((prev: any) => ({ ...prev, targetDate: e.target.value }))}
                      className="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/15 transition-all font-semibold outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</label>
                    <StyledDropdown
                      value={activeFormState.status || "pending"}
                      onChange={(val) => setActiveFormState((prev: any) => ({ ...prev, status: val as "pending" | "completed" }))}
                      options={masterData.filter(m => m.type?.toLowerCase() === 'status').map(m => ({ id: m.label, label: m.label, color: m.color, icon: m.icon }))}
                      type="status"
                      masterData={masterData}
                      buttonClassName="w-full h-10 px-3 bg-white border border-slate-200/85 shadow-sm text-xs text-left text-slate-700 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setParentId(null);
                  setAddForm({ status: "pending" });
                  setEditForm({});
                }}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={isCurrentlyEditing ? saveEdit : saveAdd}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? "Saving..." : (isCurrentlyEditing ? "Save Changes" : "Save Point")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE EDITABLE DATA TABLE SECTION */}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-100/70 border-y border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-3 w-10 text-center">No</th>
              <th className="py-3 px-3 min-w-[170px]">Concern / Topic</th>
              <th className="py-3 px-3 min-w-[150px]">Catatan (Comment)</th>
              <th className="py-3 px-3 min-w-[150px]">Next Action</th>
              <th className="py-3 px-3 min-w-[130px]">Assignee (PIC)</th>
              <th className="py-3 px-3 min-w-[120px]">Fitur</th>
              <th className="py-3 px-3 min-w-[120px]">System</th>
              <th className="py-3 px-3 min-w-[120px]">Surrounding</th>
              <th className="py-3 px-3 w-20 text-center">Thread</th>
              <th className="py-3 px-3 w-24 text-center">Status</th>
              <th className="py-3 px-3 w-32">Target Date</th>
              <th className="py-3 px-3 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* INLINE QUICK CREATION ROW WITH 100% COMPLETE MODAL FIELDS */}
            {canAdd && (
              <tr className="bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
                <td className="py-3 px-3 text-center text-indigo-600 font-black text-xs">
                  <Plus className="w-4 h-4 mx-auto" />
                </td>
                {/* 1. Concern */}
                <td className="py-3 px-3">
                  <input
                    type="text"
                    placeholder="+ Topik / Concern..."
                    value={quickConcern}
                    onChange={(e) => setQuickConcern(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd();
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs font-semibold text-slate-800 outline-none shadow-2xs placeholder:text-slate-400"
                  />
                </td>
                {/* 2. Catatan / Keterangan */}
                <td className="py-3 px-3">
                  <input
                    type="text"
                    placeholder="Catatan / rincian..."
                    value={quickKeterangan}
                    onChange={(e) => setQuickKeterangan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd();
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 outline-none shadow-2xs placeholder:text-slate-400"
                  />
                </td>
                {/* 3. Next Action */}
                <td className="py-3 px-3">
                  <input
                    type="text"
                    placeholder="Tindakan lanjut..."
                    value={quickTindakanLanjut}
                    onChange={(e) => setQuickTindakanLanjut(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd();
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 outline-none shadow-2xs placeholder:text-slate-400"
                  />
                </td>
                {/* 4. Assignee PIC */}
                <td className="py-3 px-3">
                  <select
                    value={quickAssignee}
                    onChange={(e) => setQuickAssignee(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 outline-none shadow-2xs"
                  >
                    <option value="">-- PIC --</option>
                    {(projectMembers.length > 0 ? projectMembers : users).map((u) => (
                      <option key={u.uid || u.id} value={u.uid || u.id}>
                        {u.displayName || u.username}
                      </option>
                    ))}
                  </select>
                </td>
                {/* 5. Fitur */}
                <td className="py-3 px-3">
                  <select
                    value={quickFitur}
                    onChange={(e) => setQuickFitur(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 outline-none shadow-2xs"
                  >
                    <option value="">-- Fitur --</option>
                    {masterData.filter(m => m.type?.toLowerCase() === 'fitur').map((m) => (
                      <option key={m.id || m.label} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </td>
                {/* 6. System */}
                <td className="py-3 px-3">
                  <select
                    value={quickSystem}
                    onChange={(e) => setQuickSystem(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 outline-none shadow-2xs"
                  >
                    <option value="">-- System --</option>
                    {masterData.filter(m => m.type?.toLowerCase() === 'system').map((m) => (
                      <option key={m.id || m.label} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </td>
                {/* 7. Surrounding */}
                <td className="py-3 px-3">
                  <select
                    value={quickSurrounding}
                    onChange={(e) => setQuickSurrounding(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 outline-none shadow-2xs"
                  >
                    <option value="">-- Surrounding --</option>
                    {masterData.filter(m => m.type?.toLowerCase() === 'surrounding').map((m) => (
                      <option key={m.id || m.label} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </td>
                {/* Thread */}
                <td className="py-3 px-3 text-center text-slate-400 text-[11px] font-bold">
                  💬 0
                </td>
                {/* Status */}
                <td className="py-3 px-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
                    PENDING
                  </span>
                </td>
                {/* 8. Target Date */}
                <td className="py-3 px-3">
                  <input
                    type="date"
                    value={quickTargetDate}
                    onChange={(e) => setQuickTargetDate(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-700 outline-none shadow-2xs"
                  />
                </td>
                {/* Action */}
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={handleQuickAdd}
                    disabled={isSaving || !quickConcern.trim()}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    + Tambah
                  </button>
                </td>
              </tr>
            )}

            {/* DISCUSSION POINTS DATA ROWS */}
            {points.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                  Belum ada poin diskusi. Gunakan baris di atas untuk menambah poin baru secara langsung.
                </td>
              </tr>
            ) : (
              points.map((p, idx) => {
                const isOwner = p.authorId === (currentUser?.uid || "");
                const isEditingTopic = inlineEditingId === p.id;
                const isCompleted = p.status === "completed";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Index */}
                    <td className="py-3 px-3 text-center font-bold text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* 1. Concern / Topic */}
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {isEditingTopic ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={inlineConcernVal}
                            onChange={(e) => setInlineConcernVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleInlineSaveConcern(p.id!);
                              if (e.key === "Escape") setInlineEditingId(null);
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border border-indigo-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm"
                          />
                          <button
                            onClick={() => handleInlineSaveConcern(p.id!)}
                            className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setInlineEditingId(p.id!);
                            setInlineConcernVal(p.concern);
                          }}
                          className="cursor-pointer hover:text-indigo-600 transition-colors flex items-center justify-between group/cell"
                          title="Klik untuk edit cepat"
                        >
                          <span className={isCompleted ? "line-through text-slate-400 font-normal" : ""}>
                            {p.concern}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1.5 shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* 2. Catatan (Comment) */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        defaultValue={p.keterangan || p.comment || ""}
                        onBlur={(e) => handleInlineUpdateField(p.id!, "keterangan", e.target.value)}
                        placeholder="--"
                        className="border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1.5 text-xs text-slate-600 cursor-pointer outline-none transition-all w-full truncate"
                      />
                    </td>

                    {/* 3. Next Action */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        defaultValue={p.tindakanLanjut || p.next_action || ""}
                        onBlur={(e) => handleInlineUpdateField(p.id!, "tindakanLanjut", e.target.value)}
                        placeholder="--"
                        className="border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1.5 text-xs text-slate-600 cursor-pointer outline-none transition-all w-full truncate"
                      />
                    </td>

                    {/* 4. Assignee (PIC Avatar & Live Dropdown) */}
                    <td className="py-3 px-3">
                      <select
                        value={p.assignTo || p.assignee_id || ""}
                        onChange={(e) => handleInlineUpdateField(p.id!, "assignTo", e.target.value)}
                        className="w-full border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1 text-xs font-bold text-slate-700 cursor-pointer outline-none transition-all"
                      >
                        <option value="">Unassigned</option>
                        {(projectMembers.length > 0 ? projectMembers : users).map((u) => (
                          <option key={u.uid || u.id} value={u.uid || u.id}>
                            {u.displayName || u.username}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 5. Fitur */}
                    <td className="py-3 px-3">
                      <select
                        value={p.fitur || p.feature_id || ""}
                        onChange={(e) => handleInlineUpdateField(p.id!, "fitur", e.target.value)}
                        className="w-full border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1 text-xs font-semibold text-slate-700 cursor-pointer outline-none transition-all"
                      >
                        <option value="">--</option>
                        {masterData.filter(m => m.type?.toLowerCase() === 'fitur').map((m) => (
                          <option key={m.id || m.label} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 6. System */}
                    <td className="py-3 px-3">
                      <select
                        value={p.system || p.system_id || ""}
                        onChange={(e) => handleInlineUpdateField(p.id!, "system", e.target.value)}
                        className="w-full border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1 text-xs font-semibold text-slate-700 cursor-pointer outline-none transition-all"
                      >
                        <option value="">--</option>
                        {masterData.filter(m => m.type?.toLowerCase() === 'system').map((m) => (
                          <option key={m.id || m.label} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* 7. Surrounding */}
                    <td className="py-3 px-3">
                      <select
                        value={p.surrounding || p.surrounding_id || ""}
                        onChange={(e) => handleInlineUpdateField(p.id!, "surrounding", e.target.value)}
                        className="w-full border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1 text-xs font-semibold text-slate-700 cursor-pointer outline-none transition-all"
                      >
                        <option value="">--</option>
                        {masterData.filter(m => m.type?.toLowerCase() === 'surrounding').map((m) => (
                          <option key={m.id || m.label} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Thread Icon Button */}
                    <td className="py-3 px-3 text-center">
                      {(() => {
                        const commentsList = p.id ? (commentsMap[p.id] || []) : [];
                        const count = commentsList.length;

                        return (
                          <button
                            type="button"
                            onClick={() => handleOpenThreadDrawer(p)}
                            className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                              count > 0
                                ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-200/60"
                            }`}
                            title="Buka Thread Komentar & Balasan"
                          >
                            <MessageSquare className={`w-3.5 h-3.5 ${count > 0 ? "text-indigo-600 fill-indigo-100" : "text-slate-400"}`} />
                            <span>💬 {count}</span>
                          </button>
                        );
                      })()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        className="cursor-pointer transition-all active:scale-95 inline-block"
                        title="Klik untuk ubah status PENDING / DONE"
                      >
                        {isCompleted ? (
                          <span className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-2xs hover:bg-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            DONE
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300 shadow-2xs hover:bg-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            PENDING
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Target Date */}
                    <td className="py-3 px-3">
                      <input
                        type="date"
                        value={p.targetDate || p.target_date || ""}
                        onChange={(e) => handleInlineUpdateField(p.id!, "targetDate", e.target.value)}
                        className="border-0 bg-transparent hover:bg-slate-100 focus:bg-white focus:border focus:border-indigo-400 rounded-lg py-1 px-1 text-xs font-semibold text-slate-700 cursor-pointer outline-none transition-all w-full"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {hasPermission(userRole, "meetingNotes", "update", isOwner, permissions) && (
                          <button
                            onClick={() => startEdit(p)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Detail Edit Modal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission(userRole, "meetingNotes", "delete", isOwner, permissions) && (
                          <button
                            onClick={() => setPointToDelete(p.id!)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* THREAD DISCUSSIONS SLIDE-OVER SHEET / POPOVER */}
      {activeThreadPoint && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-[9999] flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250 text-left">
            {/* Drawer Header */}
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

            {/* Drawer Comment List (Scrollable) */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
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
                threadComments.map((comment) => (
                  <div key={comment.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-2xs">
                          {(comment.userName || "U")[0]}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {comment.userName || "Member"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap pl-9">
                      {comment.commentText}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Reply Input Box */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0 space-y-3">
              <textarea
                rows={3}
                placeholder="Tulis balasan atau instruksi untuk PIC..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-xs font-semibold text-slate-800 outline-none transition-all resize-none placeholder:text-slate-400"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSendThreadComment}
                  disabled={isSendingComment || !newCommentText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isSendingComment ? (
                    <span>Mengirim...</span>
                  ) : (
                    <>
                      <span>Kirim Balasan</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
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
