import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  X, Link2 as Link2Icon, ListTodo, CheckSquare, Figma, ExternalLink, 
  Lock as LockIcon, AlertTriangle, FileDigit, Unlink, Link as LinkIcon, 
  FileUp, Download, History, Clock, Plus, Sparkles, ShieldAlert,
  ChevronRight, MoreVertical, MessageSquare, Paperclip, Trash2,
  Share2, Maximize2, Minimize2, Check, User, Calendar, Tag, CheckCircle2, LineChart,
  Layout, Zap, CircleDot, Info, Activity, Layers, Paperclip as AttachmentIcon
} from 'lucide-react';
import { cn, ensureDate } from '../../lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { DescriptionEditor } from '../../components/DescriptionEditor';
import { StatusSelect, PrioritySelect } from '../../components/ui/StatusSelect';
import { PriorityIcon, TypeIcon, StyledDropdown, UserBadge } from '../../components/ui/CommonComponents';
import { usePermissionGuard } from '../../hooks/usePermissionGuard';
import { TaskDetailModalProps } from './types';
import { Task } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

// --- Local UI Components For Isolation ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, size = 'md' }: any) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm border-transparent',
    secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 border-transparent',
    danger: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm'
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-xl border transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant as keyof typeof variants],
        sizes[size as keyof typeof sizes],
        className
      )}
    >
      {children}
    </button>
  );
};

const Textarea = ({ value, onChange, placeholder, rows = 3, className = "" }: any) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={cn(
      "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none font-medium text-slate-700",
      className
    )}
  />
);

const UncontrolledInput = ({ initialValue, onSave, onAutoSave, placeholder, className, disabled, type = "text", ...rest }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

  return (
    <input 
      type={type}
      className={className}
      placeholder={placeholder}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onBlur={() => {
        setIsFocused(false);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
      }}
      disabled={disabled}
      {...rest}
    />
  );
};

const UncontrolledTextarea = ({ initialValue, onSave, onCancel, onAutoSave, placeholder, className, rows = 3 }: any) => {
  const [val, setVal] = useState(initialValue || "");
  const [isFocused, setIsFocused] = useState(false);
  const saveTimeout = useRef<any>(null);

  useEffect(() => {
    if (!isFocused) setVal(initialValue || "");
  }, [initialValue, isFocused]);

  useEffect(() => {
    if (isFocused && val !== (initialValue || "")) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        if (onAutoSave) onAutoSave(val);
        else onSave(val);
      }, 1000);
    }
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [val, isFocused, initialValue, onAutoSave, onSave]);

  return (
    <textarea 
      className={className}
      placeholder={placeholder}
      rows={rows}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      autoFocus
      onFocus={() => setIsFocused(true)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (saveTimeout.current) clearTimeout(saveTimeout.current);
          if (val !== initialValue) onSave(val);
          else onCancel();
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        if (val !== initialValue) onSave(val);
        else onCancel();
      }}
    />
  );
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  projectRole,
  isUpdatingTask,
  isOpen,
  onClose,
  task,
  tasks,
  projectMembers,
  masterData,
  userRole,
  user,
  currentUserProfile,
  sprints,
  updateTaskField,
  hasPermission,
  activityLogs,
  comments,
  newCommentText,
  setNewCommentText,
  handleAddComment,
  handleFileUpload,
  handleRemoveAttachment,
  uploadProgress,
  isLoggedIn,
  handleQuickAddSubtask,
  mentionState,
  handleSelectMention,
  handleCommentChange,
  removeTaskLink,
  handleAddLinkedTask,
  handleRemoveLinkedTask,
  taskLinkTargetId,
  setTaskLinkTargetId,
  taskLinkRelation,
  setTaskLinkRelation,
  isAddingTaskLink,
  setIsAddingTaskLink,
  isAddingExternalLink,
  setIsAddingExternalLink,
  newExternalLinkTitle,
  setNewExternalLinkTitle,
  newExternalLinkUrl,
  setNewExternalLinkUrl,
  handleAddExternalLink,
  removeExternalLink,
  toggleBlockedStatus,
  handleSuggestStoryPoints,
  handleAddLink,
  newLinkTitle,
  setNewLinkTitle,
  newLinkUrl,
  setNewLinkUrl,
  isAddingLink: isAddingInternalLink,
  setIsAddingLink: setIsAddingInternalLink,
  deleteTask
}) => {
  const [activeTab, setActiveTab ] = useState<'comments' | 'history' | 'activity'>('comments');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingAcceptanceCriteria, setIsEditingAcceptanceCriteria] = useState(false);
  
  useEffect(() => {
    setIsEditingDescription(false);
    setIsEditingAcceptanceCriteria(false);
  }, [task?.id]);

  const [isAddingLink, setIsAddingLinkLocal] = useState(false);
  const [isAddingTaskLinkLocal, setIsAddingTaskLinkLocal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  const wrapSubmit = (key: string, fn: () => Promise<void> | void) => async () => {
    setIsSubmitting(prev => ({ ...prev, [key]: true }));
    try {
      await fn();
    } finally {
      setIsSubmitting(prev => ({ ...prev, [key]: false }));
    }
  };

  const isUserReporter = (issue: Task): boolean => {
    if (!issue) return false;
    const currentUserId = currentUserProfile?.uid || currentUserProfile?.id || user?.uid || user?.id;
    const currentUsername = currentUserProfile?.username || user?.username;
    const currentEmail = currentUserProfile?.email || user?.email;
    const rId = issue.reporterId;
    return !!currentUserId && (rId === currentUserId || rId === currentUsername || rId === currentEmail || rId === currentUserProfile?.id);
  };

  const canEditIssue = (issue: Task): boolean => {
    if (!issue) return false;
    const hasRole = hasPermission(userRole, 'list', 'update', true, currentUserProfile?.permissions);
    const isReporter = isUserReporter(issue);
    return hasRole && isReporter;
  };

  const canDeleteIssue = (issue: Task): boolean => {
    if (!issue) return false;
    const hasRole = hasPermission(userRole, 'list', 'delete', true, currentUserProfile?.permissions);
    const isReporter = isUserReporter(issue);
    return hasRole && isReporter;
  };

  const isOwner = task ? (task.assigneeId === currentUserProfile?.uid || task.reporterId === currentUserProfile?.uid) : false;
  const isProjectMember = projectRole?.toLowerCase() === 'member';
  const isEditable = canEditIssue(task);
  const canDelete = canDeleteIssue(task);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'danger',
    onConfirm: () => {},
  });

  const isDirty = isEditingDescription || isEditingAcceptanceCriteria || (newCommentText || '').trim() !== '';

  const handleSafeClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  if (!isOpen || !task) return null;

  const safeFormat = (date: any, formatStr: string, fallback = '--') => {
    try {
      if (!date) return fallback;
      return format(ensureDate(date), formatStr);
    } catch {
      return fallback;
    }
  };

  const filteredLogs = activityLogs
    .filter(log => log.action?.includes(task.key) || log.action?.includes(task.id) || log.details?.includes(task.id) || (task.key && log.details?.includes(task.key)))
    .sort((a,b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));

  return (
    <>
        <div 
          className="w-full h-full flex flex-col relative z-10"
        >

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-full">
              
              {/* Left Column (Main Info) */}
              <div className="lg:col-span-8 p-8 lg:p-10 space-y-10 border-r border-slate-100">
                {(() => {
                  const parentEpic = task?.parentId ? (tasks || []).find(t => t.id === task.parentId) : null;
                  const isEpicExceeded = parentEpic && (
                    (parentEpic.startDate && task.startDate && new Date(task.startDate).getTime() < new Date(parentEpic.startDate).getTime()) ||
                    (parentEpic.endDate && task.startDate && new Date(task.startDate).getTime() > new Date(parentEpic.endDate).getTime()) ||
                    (parentEpic.startDate && task.endDate && new Date(task.endDate).getTime() < new Date(parentEpic.startDate).getTime()) ||
                    (parentEpic.endDate && task.endDate && new Date(task.endDate).getTime() > new Date(parentEpic.endDate).getTime())
                  );
                  if (!isEpicExceeded) return null;
                  return (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 space-y-1">
                        <p className="font-black uppercase tracking-wider text-amber-800">Peringatan Jadwal Epic Timeline:</p>
                        <p className="font-medium">Rentang tanggal Task berada di luar jadwal Epic induk "{parentEpic?.title}" ({parentEpic?.startDate ? format(ensureDate(parentEpic.startDate), 'yyyy-MM-dd') : '∞'} - {parentEpic?.endDate ? format(ensureDate(parentEpic.endDate), 'yyyy-MM-dd') : '∞'}). Penyimpanan akan ditolak oleh server jika melewati batas Epic.</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Title */}
                <div className={cn("space-y-4 transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}>
                  <UncontrolledInput 
                    className="text-3xl font-black text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border-none rounded-2xl px-3 py-2 w-full transition-all outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-200"
                    placeholder="Issue Title"
                    initialValue={task.title || (task as any).summary || (task as any).name || ''}
                    onSave={(val: string) => updateTaskField(task.id, 'title', val)}
                    onAutoSave={(val: string) => updateTaskField(task.id, 'title', val)}
                    disabled={!isEditable}
                  />
                  
                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="bg-slate-50 border-slate-100"
                      onClick={wrapSubmit("addSubtask", () => handleQuickAddSubtask(task.id, task.type === "epic" ? "task" : "subtask"))}
                      disabled={isSubmitting["addSubtask"]}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Add Child
                    </Button>
                    <Button variant="secondary" size="sm" className="bg-slate-50 border-slate-100" onClick={() => setIsAddingTaskLinkLocal(!isAddingTaskLinkLocal)}>
                      <Link2Icon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      Link Issue
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                       <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          Updated {task.updatedAt ? formatDistanceToNow(ensureDate(task.updatedAt), { addSuffix: true }) : 'Never'}
                       </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-indigo-500" />
                      Description
                    </h3>
                  </div>
                  
                  <div className={cn("group relative transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}>
                    {isEditingDescription ? (
                      <DescriptionEditor 
                        task={task} 
                        onSave={(value) => { updateTaskField(task.id, 'description', value); setIsEditingDescription(false); }}
                        onAutoSave={(value) => updateTaskField(task.id, 'description', value)}
                        onCancel={() => setIsEditingDescription(false)}
                      />
                    ) : (
                      <div 
                        className="min-h-[160px] border border-slate-100 hover:border-indigo-200 rounded-3xl p-8 bg-slate-50/30 hover:bg-white transition-all cursor-text shadow-sm hover:shadow-md"
                        onClick={() => isEditable && setIsEditingDescription(true)}
                      >
                        {task.description ? (
                          <div className="markdown-body prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm italic font-medium">No description. Click to add.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acceptance Criteria */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Acceptance Criteria
                    </h3>
                  </div>
                  
                  <div className={cn("group relative", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}>
                    {task.acceptanceCriteria !== undefined && isEditingAcceptanceCriteria ? (
                      <div className="border border-emerald-500 rounded-2xl overflow-hidden bg-white shadow-lg ring-4 ring-emerald-500/10 transition-all">
                        <UncontrolledTextarea
                          initialValue={task.acceptanceCriteria || ''}
                          onSave={(val: string) => {
                              updateTaskField(task.id, 'acceptanceCriteria', val);
                              setIsEditingAcceptanceCriteria(false);
                          }}
                          onAutoSave={(val: string) => updateTaskField(task.id, 'acceptanceCriteria', val)}
                          onCancel={() => setIsEditingAcceptanceCriteria(false)}
                          placeholder="Define the acceptance criteria here... (Markdown supported)"
                          rows={6}
                          className="w-full p-6 text-sm focus:outline-none resize-y leading-relaxed font-medium text-slate-700"
                        />
                        <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>Markdown fully supported. Press Ctrl+Enter to save, or Escape to cancel.</span>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="min-h-[120px] border border-slate-100 hover:border-emerald-200 rounded-3xl p-8 bg-slate-50/30 hover:bg-white transition-all cursor-text shadow-sm hover:shadow-md"
                        onClick={() => isEditable && setIsEditingAcceptanceCriteria(true)}
                      >
                        {task.acceptanceCriteria ? (
                          <div className="markdown-body prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.acceptanceCriteria}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm italic font-medium">No acceptance criteria. Click to add.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>



                {/* Figma Design Section */}
                {task.figmaUrl?.includes("figma.com") && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Figma className="w-4 h-4 text-purple-500" />
                        Design Specification
                      </h3>
                      <a href={task.figmaUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Open Original
                      </a>
                    </div>
                    <div className="rounded-3xl border border-slate-200 overflow-hidden shadow-xl h-[480px] bg-slate-100 relative group">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(task.figmaUrl)}`}
                        allowFullScreen
                        title="Embed Figma"
                        className="border-none"
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* Section: Attachments */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resources</h4>
                    {isEditable && (
                      <div className="flex gap-4">
                        <button onClick={() => setIsAddingLinkLocal(!isAddingLink)} className="text-[10px] font-black text-indigo-600 hover:underline">
                          + Add Link
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                     {task.attachments?.map((att, attIdx) => (
                       <div key={att.id ? `${att.id}-${attIdx}` : `att-${attIdx}`} className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl group transition-all shadow-sm">
                         <a 
                           href={att.url} 
                           target="_blank" 
                           rel="noreferrer"
                           className="flex-1 flex items-center gap-3 min-w-0 pointer-events-auto"
                         >
                            <div className={cn("p-2 rounded-xl shrink-0", att.type === 'link' ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500")} >
                               {att.type === 'link' ? <LinkIcon className="w-3.5 h-3.5" /> : <AttachmentIcon className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-black text-slate-900 truncate tracking-tight hover:underline">{att.name}</p>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {att.type} • {safeFormat(att.createdAt, 'MMM d')}
                                  {att.uploadedByName && ` • Uploaded by ${att.uploadedByName}`}
                               </p>
                            </div>
                         </a>
                         {isEditable && (
                           <button 
                             onClick={() => handleRemoveAttachment?.(att.id)}
                             className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                             title="Delete"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                     ))}
                     {task.attachments?.length === 0 && !isAddingLink && (
                       <div className="py-4 text-center opacity-20 italic text-[10px] uppercase font-black tracking-widest">No resources linked</div>
                     )}
                  </div>

                  {isAddingLink && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-3"
                    >
                       <input 
                         placeholder="Resource Title"
                         className="w-full text-xs font-bold border-slate-200 rounded-xl bg-white p-2 shadow-sm"
                         value={newLinkTitle}
                         onChange={(e) => setNewLinkTitle(e.target.value)}
                       />
                       <input 
                         placeholder="https://..."
                         className="w-full text-xs font-bold border-slate-200 rounded-xl bg-white p-2 shadow-sm"
                         value={newLinkUrl}
                         onChange={(e) => setNewLinkUrl(e.target.value)}
                       />
                       <div className="flex gap-2 justify-end">
                         <Button size="sm" variant="secondary" onClick={() => setIsAddingLinkLocal(false)}>Cancel</Button>
                         <Button size="sm" onClick={wrapSubmit('addLink', () => { handleAddLink(); setIsAddingLinkLocal(false); })} disabled={isSubmitting['addLink'] || !newLinkTitle || !newLinkUrl}>Save Link</Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Section: Linked Tasks */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Related Issues</h4>
                    {isEditable && (
                      <button onClick={() => setIsAddingTaskLinkLocal(!isAddingTaskLinkLocal)} className="text-[10px] font-black text-indigo-600 hover:underline">
                        + Link
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                     {task.linkedTasks?.map((link, linkIdx) => {
                        const target = (tasks || []).find(t => t.id === link.targetTaskId);
                        if (!target) return null;
                        return (
                          <div key={link.id ? `${link.id}-${linkIdx}` : `link-${linkIdx}`} className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2 group/link relative">
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded tracking-widest">
                                   {link.relationType.replace(/_/g, ' ')}
                                </span>
                                <button 
                                  onClick={() => handleRemoveLinkedTask(task.id, link.id)}
                                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors opacity-0 group-hover/link:opacity-100"
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-black text-slate-400">{target.key}</span>
                                <span className="text-xs font-bold text-slate-700 truncate">{target.title}</span>
                             </div>
                          </div>
                        );
                     })}
                  </div>

                  {isAddingTaskLinkLocal && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 space-y-3"
                    >
                       <StyledDropdown 
                         value={taskLinkRelation}
                         onChange={(val) => setTaskLinkRelation(val as any)}
                         options={[
                           { id: 'blocks', label: 'Blocks' },
                           { id: 'is_blocked_by', label: 'Is blocked by' },
                           { id: 'relates_to', label: 'Relates to' }
                         ]}
                         masterData={masterData}
                         className="w-full"
                         buttonClassName="text-[13px] font-bold bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm"
                       />
                      <StyledDropdown 
                        value={taskLinkTargetId}
                        onChange={(val) => setTaskLinkTargetId(val)}
                        options={[
                          { id: '', label: 'Select task...' },
                          ...tasks.filter(t => t.id !== task.id).map(t => ({
                            id: t.id,
                            label: `${t.key}: ${t.title}`
                          }))
                        ]}
                        masterData={masterData}
                        className="w-full"
                        buttonClassName="text-[13px] font-bold bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm"
                      />
                      <div className="flex gap-2 justify-end">
                         <Button size="sm" variant="secondary" onClick={() => setIsAddingTaskLinkLocal(false)}>Cancel</Button>
                         <Button size="sm" onClick={wrapSubmit('addLinkedTask', () => { handleAddLinkedTask(); setIsAddingTaskLinkLocal(false); })} disabled={isSubmitting['addLinkedTask'] || !taskLinkTargetId}>Add Link</Button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Subtasks Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Layout className="w-4 h-4 text-blue-500" />
                      Subtask List
                    </h3>
                  </div>
                  <div className="space-y-3 p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 shadow-inner">
                    {tasks.filter(t => t.parentId === task.id).map((st, stIdx) => (
                      <div key={st.id ? `${st.id}-${stIdx}` : `sub-${stIdx}`} className={cn("flex items-center gap-4 p-3 bg-white hover:bg-indigo-50/30 rounded-2xl group border border-slate-100 transition-all shadow-sm", isUpdatingTask?.[st.id] ? "opacity-50 pointer-events-none" : "hover:border-indigo-100")}>
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm" 
                          checked={st.status === 'Done'}
                          onChange={() => updateTaskField(st.id, 'status', st.status === 'Done' ? 'To Do' : 'Done')}
                          disabled={!isEditable}
                        />
                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shrink-0 select-all uppercase tracking-tighter">
                          {st.key}
                        </span>
                        <UncontrolledInput 
                          className={cn(
                            "text-[13px] font-bold text-slate-700 bg-transparent border-none focus:ring-0 flex-1 min-w-0 disabled:text-slate-300 transition-all",
                            st.status === 'Done' && "line-through opacity-50"
                          )}
                          initialValue={st.title}
                          onSave={(val: string) => updateTaskField(st.id, 'title', val)}
                          onAutoSave={(val: string) => updateTaskField(st.id, 'title', val)}
                          placeholder="Untitled Subtask"
                          disabled={!isEditable}
                        />
                        <div className="flex items-center gap-3 shrink-0">
                          <UserAvatar uid={st.assigneeId || ''} members={projectMembers} className="w-6 h-6 border border-white shadow-sm ring-1 ring-slate-100" />
                          <div className="h-4 w-px bg-slate-200" />
                          <PriorityIcon priority={st.priority || 'Medium'} masterData={masterData} className="w-3.5 h-3.5" />
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModalState({
                                  isOpen: true,
                                  title: "Hapus Subtask?",
                                  message: `Apakah Anda yakin ingin menghapus subtask "${st.title || 'Untitled Subtask'}"? Tindakan ini tidak dapat dibatalkan.`,
                                  variant: "danger",
                                  confirmText: "Hapus Subtask",
                                  onConfirm: () => {
                                    deleteTask(st.id);
                                  }
                                });
                              }}
                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors ml-1"
                              title="Hapus Subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.filter(t => t.parentId === task.id).length === 0 && (
                      <div className="py-4 text-center">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No subtasks defined</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs Section (Comments / History) */}
                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-6 border-b border-slate-100">
                    <button 
                      className={cn(
                        "pb-4 text-xs font-black uppercase tracking-widest transition-all relative",
                        activeTab === 'comments' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                      )} 
                      onClick={() => setActiveTab('comments')}
                    >
                      Comments {comments.length > 0 && `(${comments.length})`}
                      {activeTab === 'comments' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                    <button 
                      className={cn(
                        "pb-4 text-xs font-black uppercase tracking-widest transition-all relative",
                        activeTab === 'history' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                      )} 
                      onClick={() => setActiveTab('history')}
                    >
                      History {filteredLogs.length > 0 && `(${filteredLogs.length})`}
                      {activeTab === 'history' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
                    </button>
                  </div>

                  {activeTab === 'comments' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-top-2">
                       {/* Add Comment */}
                       <div className="flex gap-4 p-2">
                          <UserAvatar uid={user?.uid || ''} members={projectMembers} className="w-9 h-9 border-2 border-white shadow-md shrink-0" />
                          <div className="flex-1 relative group">
                            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all shadow-sm">
                              <div className="flex items-center gap-1 p-1.5 border-b border-slate-100 bg-slate-50/50 text-slate-500 overflow-x-auto custom-scrollbar">
                                 <button className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-200 rounded text-[11px] font-bold text-slate-600 transition-colors shrink-0">
                                   <Sparkles className="w-3 h-3 text-indigo-500" />
                                   Improve writing
                                 </button>
                                 <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
                                 <button className="p-1 hover:bg-slate-200 rounded text-slate-600 shrink-0" title="Text format"><span className="text-xs font-bold leading-none px-0.5 border border-slate-300 rounded font-serif">Tt</span></button>
                                 <button className="p-1 hover:bg-slate-200 rounded font-bold text-slate-600 shrink-0 text-sm leading-none" title="Bold">B</button>
                                 <button className="p-1 hover:bg-slate-200 rounded italic text-slate-600 shrink-0 text-sm leading-none" title="Italic">I</button>
                                 <button className="p-1 hover:bg-slate-200 rounded text-slate-600 shrink-0" title="List"><Layout className="w-3.5 h-3.5" /></button>
                                 <div className="w-px h-4 bg-slate-200 mx-1 shrink-0" />
                                 <button className="p-1 hover:bg-slate-200 rounded shrink-0">
                                    <LinkIcon className="w-3.5 h-3.5" />
                                 </button>
                                 <button className="p-1 hover:bg-slate-200 rounded shrink-0">
                                    <AttachmentIcon className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                              <Textarea 
                                 value={newCommentText}
                                 onChange={handleCommentChange}
                                 placeholder="Type /ai to Ask AI, / to add elements, or @ to mention someone."
                                 className="border-none shadow-none focus:ring-0 !ring-0 !outline-none p-4 resize-none bg-white text-[13px] font-medium leading-relaxed min-h-[100px] w-full"
                              />
                            </div>
                            
                            {mentionState.active && (
                              <div className="absolute z-50 w-72 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden transform bottom-[110%] left-0 animate-in fade-in slide-in-from-bottom-2">
                                <div className="p-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested People</div>
                                <div className="max-h-60 overflow-y-auto py-1">
                                  {projectMembers
                                    .filter(m => m?.username && m?.username.toLowerCase().includes(mentionState.query.toLowerCase()))
                                    .map(member => (
                                      <button
                                        key={member.uid}
                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-3 focus:outline-none focus:bg-indigo-50 transition-all font-bold text-slate-600"
                                        onClick={() => handleSelectMention(member?.username!)}
                                      >
                                        <UserAvatar uid={member.uid} members={projectMembers} className="w-7 h-7" />
                                        <div>
                                          <p className="text-[13px] font-bold text-slate-900 leading-none">{member?.displayName}</p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">@{member?.username}</p>
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end pt-3">
                               <Button size="sm" onClick={wrapSubmit('addComment', handleAddComment)} disabled={isSubmitting['addComment'] || !newCommentText.trim() || !isLoggedIn} className="shadow-lg shadow-indigo-500/20 px-6 font-black uppercase tracking-widest text-[10px]">
                                 Save
                               </Button>
                            </div>
                          </div>
                       </div>

                       {/* Comment List */}
                       <div className="space-y-10">
                          {comments.map((comment, i) => {
                            const author = (projectMembers || []).find(m => m.uid === comment.authorId);
                            return (
                               <motion.div 
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: i * 0.05 }}
                                 key={comment.id ? `${comment.id}-${i}` : `comm-${i}`} 
                                 className="flex gap-4 group"
                               >
                                  <UserAvatar uid={comment.authorId} members={projectMembers} className="w-9 h-9 border-2 border-white shadow-md shrink-0" />
                                  <div className="flex-1 space-y-1">
                                     <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-900 tracking-tight">{author?.displayName || 'Unknown User'}</span>
                                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span className="text-[11px] font-black text-slate-400">
                                          {safeFormat(comment.createdAt, 'MMM d, h:mm a', 'Just now')}
                                        </span>
                                     </div>
                                     <div className="text-[13px] text-slate-700 bg-slate-50/50 p-4 rounded-2xl rounded-tl-none border border-slate-100 leading-relaxed font-medium">
                                        {comment.text?.split(/(@\w+)/g).map((part: string, i: number) => 
                                          part.startsWith('@') ? <span key={i} className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded shadow-sm border border-indigo-100">{part}</span> : part
                                        )}
                                     </div>
                                  </div>
                               </motion.div>
                            );
                          })}
                          {comments.length === 0 && (
                            <div className="py-20 text-center space-y-3 opacity-30">
                               <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
                               <p className="text-sm font-black uppercase tracking-widest text-slate-500">No discussion yet</p>
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                       {filteredLogs.map((log, i) => {
                          const actor = (projectMembers || []).find(m => m?.uid === log.userId) || { displayName: 'System' };
                          return (
                            <div key={log.id ? `${log.id}-${i}` : `log-${i}`} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100 group">
                               <div className="relative">
                                  <UserAvatar uid={log.userId} members={projectMembers} className="w-9 h-9 shrink-0 shadow-sm border-2 border-white relative z-10" />
                                  {i < filteredLogs.length - 1 && <div className="absolute top-9 left-1/2 -content-x-1/2 w-0.5 h-full bg-slate-100 z-0" />}
                               </div>
                               <div className="space-y-1 py-1">
                                  <div className="flex items-center gap-2">
                                     <span className="text-sm font-black text-slate-900">{actor?.displayName}</span>
                                     <span className="text-[11px] font-black text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded shadow-xs uppercase tracking-tighter">
                                        {safeFormat(log.createdAt, 'MMM d, HH:mm')}
                                     </span>
                                  </div>
                                  <p className="text-[13px] text-slate-500 font-medium leading-relaxed group-hover:text-slate-900 transition-colors">
                                     {log.details || log.action}
                                  </p>
                               </div>
                            </div>
                          );
                       })}
                       {filteredLogs.length === 0 && (
                          <div className="py-20 text-center space-y-3 opacity-30">
                             <History className="w-12 h-12 mx-auto text-slate-300" />
                             <p className="text-sm font-black uppercase tracking-widest text-slate-500">No activity history found</p>
                          </div>
                       )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Metdata/Sidebar) - STICKY */}
              <div className={cn("lg:col-span-4 bg-slate-50/50 p-8 space-y-8 border-l border-slate-100 lg:sticky lg:top-0 h-fit transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}>
                
                {/* Main Status Select */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Lifecycle Status
                  </label>
                  <StyledDropdown 
                    value={task.status}
                    options={masterData.filter(m => m.type?.toLowerCase() === 'status').map(m => ({ id: m.label, label: m.label, icon: m.icon, color: m.color }))}
                    masterData={masterData}
                    type="status"
                    onChange={(val) => updateTaskField(task.id, 'status', val)}
                    disabled={!isEditable}
                    className="w-full"
                  />
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-100" />

                {/* Metadata Grid */}
                <div className="space-y-6">
                  {/* Assignee */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Assignee
                    </label>
                    <div className="flex items-center gap-3 w-full">
                       <StyledDropdown 
                        value={task.assigneeId || ''}
                        onChange={(val) => updateTaskField(task.id, 'assigneeId', val)}
                        options={[{ id: '', label: 'Unassigned' }, ...(projectMembers || []).map(m => ({ id: m?.uid || '', label: m?.displayName || m?.email || 'Unknown' }))]}
                        members={projectMembers}
                        type="member"
                        masterData={[]}
                        className={cn("w-full", isProjectMember && "pointer-events-none opacity-80")}
                        buttonClassName="h-[52px] bg-white rounded-2xl border-slate-200 shadow-sm px-4"
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                  </div>

                  {/* Reporter */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      Reporter
                    </label>
                    <div className="flex items-center gap-3 w-full">
                       <StyledDropdown 
                        value={task.reporterId || ''}
                        onChange={(val) => updateTaskField(task.id, 'reporterId', val)}
                        options={[{ id: '', label: 'None' }, ...(projectMembers || []).map(m => ({ id: m?.uid || '', label: m?.displayName || m?.email || 'Unknown' }))]}
                        members={projectMembers}
                        type="member"
                        masterData={[]}
                        className={cn("w-full", isProjectMember && "pointer-events-none opacity-80")}
                        buttonClassName="h-[52px] bg-white rounded-2xl border-slate-200 shadow-sm px-4"
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                  </div>

                  {/* Priority & Points */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" />
                        Priority
                      </label>
                      <StyledDropdown 
                        value={task.priority ?? ''}
                        options={masterData.filter(m => m.type?.toLowerCase() === 'priority').map(p => ({ id: p.label, label: p.label, icon: p.icon, color: p.color }))}
                        masterData={masterData}
                        type="priority"
                        onChange={(val) => updateTaskField(task.id, 'priority', val)}
                        disabled={!isEditable || isProjectMember}
                        className={cn("w-full", isProjectMember && "pointer-events-none opacity-80")}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points</label>
                        {isEditable && !isProjectMember && (
                           <button 
                             onClick={() => handleSuggestStoryPoints(task)}
                             className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                           >
                             <Sparkles className="w-3 h-3" /> AI
                           </button>
                        )}
                      </div>
                      <UncontrolledInput 
                        type="number"
                        initialValue={task.storyPoints || ''}
                        onSave={(val: any) => updateTaskField(task.id, 'storyPoints', parseInt(val) || 0)}
                        className="w-full text-sm font-bold bg-white border border-slate-200 rounded-2xl px-4 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm outline-none"
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                  </div>

                  {/* Blocked Status */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Blocked Status
                    </label>
                    <button
                      onClick={() => toggleBlockedStatus(task.id)}
                      disabled={!isEditable || isProjectMember}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 font-bold text-xs uppercase tracking-wider",
                        task.isBlocked 
                          ? "bg-red-50 border-red-200 text-red-600 shadow-lg shadow-red-500/10 scale-[1.02]" 
                          : "bg-white border-slate-200 text-slate-400 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-red-200 hover:text-red-400 shadow-sm",
                        isProjectMember && "pointer-events-none opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={cn("w-4 h-4", task.isBlocked && "animate-pulse")} />
                        {task.isBlocked ? 'Blocked' : 'Clear'}
                      </div>
                      <div className={cn("w-2 h-2 rounded-full", task.isBlocked ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-slate-300")} />
                    </button>
                  </div>

                  {/* Sprint */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" />
                      Current Sprint
                    </label>
                    <StyledDropdown 
                      value={task.sprintId || ''}
                      onChange={(val) => updateTaskField(task.id, 'sprintId', val || null)}
                      options={[
                        { id: '', label: 'No sprint assigned', icon: 'Box' },
                        ...sprints.map(s => ({
                          id: s.id,
                          label: `${s.name} (${s.status})`,
                          icon: 'IterationCcw'
                        }))
                      ]}
                      type="sprint"
                      masterData={masterData}
                      disabled={!isEditable || isProjectMember}
                      className={cn("w-full", isProjectMember && "pointer-events-none opacity-80")}
                      buttonClassName="text-[13px] font-bold bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm h-[52px]"
                    />
                  </div>

                  {/* Release */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Release / Milestone</label>
                    <StyledDropdown 
                      value={task.release || ''}
                      onChange={(val) => updateTaskField(task.id, 'release', val)}
                      options={[
                        { id: '', label: 'Select release...', icon: 'Box' },
                        ...masterData.filter(d => d.type === 'release').map(d => ({
                          id: d.label,
                          label: d.label,
                          icon: 'Box'
                        }))
                      ]}
                      type="release"
                      masterData={masterData}
                      disabled={!isEditable || isProjectMember}
                      className={cn("w-full", isProjectMember && "pointer-events-none opacity-80")}
                      buttonClassName="text-[13px] font-bold bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm h-[52px]"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Start Date
                      </label>
                      <UncontrolledInput 
                        type="date"
                        initialValue={task.startDate ? format(ensureDate(task.startDate), 'yyyy-MM-dd') : ''}
                        onSave={(val: any) => updateTaskField(task.id, 'startDate', val)}
                        className={cn("w-full text-[11px] font-black bg-white border border-slate-200 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-slate-500 uppercase tracking-tighter", isProjectMember && "opacity-70 cursor-not-allowed")}
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        End Date
                      </label>
                      <UncontrolledInput 
                        type="date"
                        initialValue={task.endDate ? format(ensureDate(task.endDate), 'yyyy-MM-dd') : ''}
                        onSave={(val: any) => updateTaskField(task.id, 'endDate', val)}
                        className={cn("w-full text-[11px] font-black bg-white border border-slate-200 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-slate-500 uppercase tracking-tighter", isProjectMember && "opacity-70 cursor-not-allowed")}
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Due Date
                      </label>
                      <UncontrolledInput 
                        type="date"
                        initialValue={task.dueDate ? format(ensureDate(task.dueDate), 'yyyy-MM-dd') : ''}
                        onSave={(val: any) => updateTaskField(task.id, 'dueDate', val)}
                        className={cn("w-full text-[11px] font-black bg-white border border-slate-200 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-slate-500 uppercase tracking-tighter", isProjectMember && "opacity-70 cursor-not-allowed")}
                        disabled={!isEditable || isProjectMember}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5" />
                        Labels
                      </label>
                      <div className="relative group/labels">
                         <UncontrolledInput 
                          initialValue={task.labels?.join(', ') || ''}
                          onSave={(val: any) => updateTaskField(task.id, 'labels', val.split(',').map((l: any) => l.trim()).filter(Boolean))}
                          placeholder="Add tag..."
                          className="w-full text-[11px] font-bold bg-white border border-slate-200 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-slate-600"
                          disabled={!isEditable}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time Tracking Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Est. Hours
                      </label>
                      <UncontrolledInput 
                        type="number"
                        min="0"
                        step="0.5"
                        initialValue={task.estimatedHours || ''}
                        onSave={(val: any) => updateTaskField(task.id, 'estimatedHours', parseFloat(val) || 0)}
                        className="w-full text-[11px] font-black bg-white border border-slate-200 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-slate-600"
                        disabled={!isEditable}
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <LineChart className="w-3.5 h-3.5 text-indigo-500" />
                        Logged Hours
                      </label>
                      <UncontrolledInput 
                        type="number"
                        min="0"
                        step="0.5"
                        initialValue={task.loggedHours || ''}
                        onSave={(val: any) => updateTaskField(task.id, 'loggedHours', parseFloat(val) || 0)}
                        className="w-full text-[11px] font-black bg-indigo-50/50 border border-indigo-100 rounded-2xl px-3 py-2.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm outline-none text-indigo-700"
                        disabled={!isEditable}
                        placeholder="e.g. 2.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Meta */}
                <div className="pt-8 space-y-3">
                   <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Task created</span>
                      <span className="text-slate-600">{safeFormat(task.createdAt, 'MMM d, yyyy HH:mm')}</span>
                   </div>
                   <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Last system update</span>
                      <span className="text-slate-600">{safeFormat(task.updatedAt, 'MMM d, yyyy HH:mm')}</span>
                   </div>
                   {canDelete && (
                     <div className="pt-4">
                        <button 
                          className="w-full py-3 text-red-400 hover:text-red-600 hover:bg-red-50/50 rounded-2xl border border-dashed border-slate-200 hover:border-red-100 transition-all text-xs font-black uppercase tracking-widest"
                          onClick={() => {
                            setConfirmModalState({
                              isOpen: true,
                              title: "Hapus Task / Issue Permanen?",
                              message: `Apakah Anda yakin ingin menghapus "${task.title}"? Tindakan ini tidak dapat dibatalkan. Semua data terkait akan terhapus permanen.`,
                              variant: "danger",
                              confirmText: "Hapus Permanen",
                              onConfirm: () => {
                                deleteTask(task.id);
                                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                                onClose();
                              }
                            });
                          }}
                        >
                           <Trash2 className="w-4 h-4 mx-auto mb-1" />
                           Permanently Delete
                        </button>
                     </div>
                   )}
                </div>

              </div>
            </div>
          </div>
        </div>

      {/* Discard Unsaved Changes Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        title="Buang Perubahan?"
        message="Terdapat perubahan form yang belum disimpan. Apakah Anda yakin ingin keluar dan membuang perubahan?"
        variant="warning"
        confirmText="Ya, Buang Perubahan"
        cancelText="Batal"
        onConfirm={() => {
          setShowDiscardConfirm(false);
          setIsEditingDescription(false);
          setIsEditingAcceptanceCriteria(false);
          if (setNewCommentText) setNewCommentText("");
          onClose();
        }}
      />

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
        title={confirmModalState.title}
        message={confirmModalState.message}
        variant={confirmModalState.variant || 'danger'}
        confirmText={confirmModalState.confirmText || 'Hapus'}
        cancelText="Batal"
        onConfirm={() => {
          confirmModalState.onConfirm();
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </>
  );
};
