import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, ensureDate } from '../../../lib/utils';
import { UserAvatar } from '../../../components/ui/UserAvatar';
import { RenderIcon } from '../../../components/RenderIcon';
import { useAppStore } from '../../../store/useAppStore';
import { MoreHorizontal, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';

interface KanbanCardProps {
  task: any;
  mArr: any[];
  pArr: any[];
  onClick: () => void;
  isDragging?: boolean;
  shakingTaskId?: string | null;
}

export const KanbanCard = React.memo<KanbanCardProps>(({ task, mArr, pArr, onClick, isDragging, shakingTaskId }) => {
  // ...
  // Line 94 (approx):
  // ...
  // isDragging && "..."
  // shakingTaskId === task.id && "animate-shake"
  const { density, updateTask } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColor = mArr.find(m => m.type === 'status' && m.label === task.status)?.color || '#e2e8f0';
  const priorityInfo = mArr.find(m => m.type === 'priority' && m.label === task.priority);
  const isCompact = density === 'compact';

  const subtasks = task.subtasks || [];
  const hasUnfinishedSubtasks = subtasks.some((st: any) => st.status !== 'Done');
  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((st: any) => st.status === 'Done').length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleToggleSubtask = (subtask: any) => {
    const newStatus = subtask.status === 'Done' ? 'TODO' : 'Done';
    const updatedSubtasks = subtasks.map((st: any) => 
      st.id === subtask.id ? { ...st, status: newStatus } : st
    );
    updateTask(task.id, { ...task, subtasks: updatedSubtasks });
  };

  // Check if due date is within 48 hours
  const hasDueDate = !!task.dueDate;
  let isDueSoon = false;
  let isOverdue = false;
  let daysHoursText = "";

  if (hasDueDate) {
    const dueTime = ensureDate(task.dueDate).getTime();
    const nowTime = new Date().getTime();
    const diffMs = dueTime - nowTime;
    
    if (diffMs < 48 * 60 * 60 * 1000) {
      isDueSoon = true;
      if (diffMs < 0) {
        isOverdue = true;
      } else {
        const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
        if (diffHours >= 24) {
          daysHoursText = `${Math.floor(diffHours / 24)} hari`;
        } else {
          daysHoursText = `${diffHours} jam`;
        }
      }
    }
  }

  // Load QA test status for this task
  const projectId = task.projectId || 'default';
  const savedQA = localStorage.getItem(`qa_test_cases_${projectId}`);
  let qaStatus: 'passed' | 'failed' | 'blocked' | 'untested' | null = null;
  if (savedQA) {
    try {
      const parsed = JSON.parse(savedQA);
      const linkedTestCase = parsed.find((tc: any) => tc.caseId === task.id);
      if (linkedTestCase) {
        qaStatus = linkedTestCase.status;
      }
    } catch (e) {}
  }

  const Component = isDragging ? 'div' : motion.div;

  return (
    <Component
      {...(!isDragging ? { layout: true, transition: { type: "spring", stiffness: 350, damping: 30 }, whileHover: { y: -2, transition: { duration: 0.15 } }, whileTap: { scale: 0.99 } } : {})}
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-2xs border cursor-pointer group flex flex-col overflow-hidden",
        "transition-all duration-200 ease-out select-none border-l-4",
        isCompact 
          ? "p-2 gap-1.5" 
          : "p-3 gap-2",
        task.isBlocked 
          ? "border-l-red-600 border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/20 hover:border-red-400 shadow-rose-100/30" 
          : (task.priority === 'Highest' || task.priority === 'High')
          ? "border-l-red-500 border-slate-200/80 dark:border-slate-700/80 hover:border-red-300 dark:hover:border-red-500 hover:shadow-xs"
          : task.priority === 'Medium'
          ? "border-l-amber-500 border-slate-200/80 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-xs"
          : "border-l-indigo-400 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs",
        hasUnfinishedSubtasks && "border-red-300 dark:border-red-800 bg-red-50/10 dark:bg-red-950/30",
        isDragging && "z-[9999] cursor-grabbing opacity-90 shadow-xl ring-2 ring-indigo-400 !transition-none pointer-events-none",
        shakingTaskId === task.id && "animate-shake"
      )}
    >
      {/* Top row: task key + status badges */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-1.5 transition-colors flex-wrap">
            {priorityInfo ? (
               <RenderIcon iconName={priorityInfo.icon} className={cn("transition-transform duration-200", isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} style={{ color: priorityInfo.color }} />
            ) : (
               <RenderIcon iconName="CheckSquare" className={cn("transition-transform duration-200", isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            )}
            <span className="font-mono font-bold text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-100/60">
              {task.key}
            </span>
            {task.priority && (
              <span className={cn(
                "font-extrabold uppercase rounded tracking-wider border",
                isCompact ? "text-[8px] px-1 py-0.2" : "text-[9px] px-1.5 py-0.2",
                (task.priority === 'Highest' || task.priority === 'High') 
                  ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800" 
                  : task.priority === 'Medium' 
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800" 
                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              )}>
                {task.priority}
              </span>
            )}
            {task.isBlocked && (
              <span className={cn("font-black uppercase text-red-600 dark:text-red-400 bg-red-100/90 dark:bg-red-950/90 rounded tracking-widest animate-pulse border border-red-200", isCompact ? "text-[8px] px-1 py-0.5" : "text-[9px] px-1.5 py-0.5")}>Blocked</span>
            )}
            {hasUnfinishedSubtasks && (
              <div 
                className="text-red-500 dark:text-red-400 cursor-help"
                title="Kartu terbelenggu: Selesaikan semua subtask sebelum memindahkan ke Done"
              >
                <AlertTriangle className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
              </div>
            )}
            {qaStatus && (
              <span className={cn(
                "font-black uppercase rounded tracking-widest",
                isCompact ? "text-[7.5px] px-1 py-0.5" : "text-[8.5px] px-1.5 py-0.5",
                qaStatus === 'passed' ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" :
                qaStatus === 'failed' ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 animate-pulse" :
                qaStatus === 'blocked' ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800" :
                "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
              )}>
                QA: {qaStatus === 'passed' ? 'PASS ✅' : qaStatus === 'failed' ? 'FAIL ❌' : qaStatus === 'blocked' ? 'BLOCKED ⚠️' : 'UNTESTED'}
              </span>
            )}
         </div>

         {/* Warning visual notification for due date within 48 hours */}
         {isDueSoon && (
           <div 
             className={cn(
               "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight select-none border animate-pulse shrink-0",
               isOverdue 
                 ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400" 
                 : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400"
             )}
             title={isOverdue ? "Terlambat! Tugas telah melewati tanggal jatuh tempo." : `Tenggat waktu kurang dari 48 jam (${daysHoursText})`}
           >
             <AlertTriangle className={cn(isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
             {!isCompact && (
               <span>{isOverdue ? "Terlambat" : `Sisa ${daysHoursText}`}</span>
             )}
           </div>
         )}
      </div>

      {/* Task Title */}
      <h4 className={cn("text-slate-700 dark:text-slate-200 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors duration-200", isCompact ? "font-medium text-xs line-clamp-1" : "font-semibold text-sm line-clamp-2")}>
         {task.title}
      </h4>

      {/* Info Row: Category & Avatar */}
      <div className={cn("flex items-center justify-between border-t border-slate-50 dark:border-slate-700/50", isCompact ? "mt-1 pt-1" : "mt-2 pt-2")}>
          <div className="flex items-center gap-2">
             <div className={cn("flex items-center gap-1 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-950/30 group-hover:border-indigo-100/50 dark:group-hover:border-indigo-800/50 transition-colors duration-300 rounded-full", isCompact ? "px-1.5 py-0" : "px-2 py-0.5")}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                <span className={cn("font-bold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 uppercase tracking-wider transition-colors duration-300", isCompact ? "text-[8px]" : "text-[10px]")}>{task.status}</span>
             </div>
             {task.category && (
               <span className={cn("font-bold text-slate-400 dark:text-slate-500 capitalize px-1", isCompact ? "text-[8px]" : "text-[10px]")}>{task.category}</span>
             )}
          </div>
          <div className="flex items-center group-hover:scale-105 transition-transform duration-300">
            <UserAvatar uid={task.assigneeId || ''} members={pArr} className={cn("ring-2 ring-white dark:ring-slate-800 shadow-sm", isCompact ? "w-5 h-5" : "w-6 h-6")} />
          </div>
      </div>

      {totalCount > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span className={cn("font-bold", percentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>{completedCount}/{totalCount} Subtasks ({Math.round(percentage)}%)</span>
            </div>
            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-300", 
                  percentage === 0 ? "bg-slate-300 dark:bg-slate-600" :
                  percentage === 100 ? "bg-emerald-500 dark:bg-emerald-400" : "bg-indigo-500 dark:bg-indigo-400"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {subtasks.map((st: any) => (
                <div key={st.id} className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400" onClick={(e) => { e.stopPropagation(); handleToggleSubtask(st); }}>
                  {st.status === 'Done' ? <CheckSquare className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> : <Square className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                  <span className={st.status === 'Done' ? "line-through text-slate-400 dark:text-slate-500" : ""}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Component>
  );
}) as any;
