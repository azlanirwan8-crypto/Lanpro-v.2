
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronDown, Edit2, Trash2, Zap, Target, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, ensureDate } from '../../../lib/utils';
import { Task, Sprint } from '../../../types';
import { Droppable as _Droppable } from '@hello-pangea/dnd';

const Droppable = _Droppable as any;

interface SprintSectionProps {
  sprints: Sprint[];
  tasks: Task[];
  expandedSprintId: string | null;
  setExpandedSprintId: (id: string) => void;
  renderDraggableTask: (task: Task, index: number, variant: 'card' | 'row') => React.ReactNode;
  handleStartSprint: (id: string) => void;
  handleCompleteSprint: (id: string) => void;
  handleDeleteSprint: (id: string) => void;
  canEditPlanning: boolean;
  setEditingSprint: (sprint: Sprint) => void;
  setIsEditSprintModalOpen: (open: boolean) => void;
}

export const SprintSection: React.FC<SprintSectionProps> = ({
  sprints, tasks, expandedSprintId, setExpandedSprintId, renderDraggableTask,
  handleStartSprint, handleCompleteSprint, handleDeleteSprint, canEditPlanning,
  setEditingSprint, setIsEditSprintModalOpen
}) => {
  return (
    <div className="flex-1 overflow-auto space-y-4 pb-10 pr-2 min-h-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      {sprints.sort((a,b) => ensureDate(b.startDate).getTime() - ensureDate(a.startDate).getTime()).map(sprint => {
        const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
        const totalTasks = sprintTasks.length;
        const doneTasks = sprintTasks.filter(t => 
          t.status.toLowerCase() === 'done' || 
          t.status.toLowerCase().includes('done') || 
          t.status.toLowerCase().includes('completed')
        ).length;
        const completionPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        const isExpanded = expandedSprintId === sprint.id || (expandedSprintId === null && sprint.status === 'active');
        
        const isOverdue = sprint.status === 'active' && sprint.endDate && (ensureDate(sprint.endDate) < new Date(new Date().setHours(0,0,0,0)));

        return (
          <div key={sprint.id} className={cn(
            "bg-white border rounded-[2rem] overflow-hidden mb-4 transition-all duration-300", 
            sprint.status === 'active' ? (isOverdue ? "border-red-500 shadow-xl shadow-red-100/50 ring-4 ring-red-50" : "border-indigo-500 shadow-xl shadow-indigo-100/50 ring-4 ring-indigo-50") :
            sprint.status === 'planned' ? "border-slate-200 border-dashed hover:border-slate-300 shadow-sm" :
            "border-slate-200 bg-slate-50/50 opacity-90 shadow-sm",
            isExpanded && sprint.status !== 'active' ? "border-indigo-200" : ""
          )}>
            <div className="p-6 flex items-start justify-between cursor-pointer border-b border-dashed border-slate-100" onClick={() => setExpandedSprintId(isExpanded ? "" : sprint.id)}>
              <div className="flex gap-4">
                <div className="mt-1 text-slate-400">
                  <Calendar className={cn("w-5 h-5", isOverdue ? "text-red-500" : "")} />
                </div>
                <div>
                   <div className="flex items-center gap-3">
                     <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-300 cursor-pointer", isExpanded ? "rotate-0" : "-rotate-90")} />
                     <h3 className="font-extrabold text-slate-800 text-[15px]">{sprint.name}</h3>
                     <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full", sprint.status === 'active' ? (isOverdue ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700") : sprint.status === 'planned' ? "bg-slate-100 text-slate-500" : "bg-slate-200 text-slate-600")}>
                        {sprint.status === 'active' ? (isOverdue ? 'OVERDUE' : 'ACTIVE') : sprint.status === 'planned' ? 'PLANNED' : 'COMPLETED'}
                     </span>
                   </div>
                   <div className={cn("text-[11px] font-bold mt-1", isOverdue ? "text-red-500" : "text-slate-400")}>
                     {sprint.startDate && sprint.endDate ? `${format(ensureDate(sprint.startDate), 'MMM d, yyyy')} - ${format(ensureDate(sprint.endDate), 'MMM d, yyyy')}` : 'No dates set'}
                   </div>

                   {/* Progress Bar */}
                   <div className="mt-3 w-56 sm:w-72" onClick={(e) => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Progress</span>
                       <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded-full">{completionPercentage}% ({doneTasks}/{totalTasks})</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                       <div 
                         className={cn(
                           "h-full rounded-full transition-all duration-[400ms] ease-out",
                           completionPercentage === 100 ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse" : "bg-indigo-600"
                         )}
                         style={{ width: `${completionPercentage}%` }}
                       />
                     </div>
                   </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-4">
                   <div className="flex flex-col items-end">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Velocity</span>
                     <span className="text-[13px] font-black text-slate-700 mt-1">{sprintTasks.length} Issues</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Points</span>
                     <span className="text-[13px] font-black text-slate-700 mt-1">{sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)}</span>
                   </div>
                   {canEditPlanning && (
                     <div className="flex items-center gap-2">
                       {sprint.status === 'planned' && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleStartSprint(sprint.id); }} 
                           className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-black rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-500/20 active:scale-95 flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
                         >
                           <Zap className="w-3 h-3" /> START
                         </button>
                       )}
                       {sprint.status === 'active' && (
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleCompleteSprint(sprint.id); }} 
                           className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-black rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 flex items-center gap-1 shadow-sm shrink-0 cursor-pointer"
                         >
                           <CheckCircle2 className="w-3 h-3" /> COMPLETE
                         </button>
                       )}
                       <button onClick={(e) => { e.stopPropagation(); setEditingSprint(sprint); setIsEditSprintModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all active:scale-90 cursor-pointer">
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteSprint(sprint.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90 cursor-pointer">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   )}
                 </div>
              </div>
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1, transition: { height: { type: 'spring', stiffness: 120, damping: 20 }, opacity: { duration: 0.25 } } }} 
                  exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.25 }, opacity: { duration: 0.15 } } }} 
                  className="overflow-hidden"
                >
                   <div className="p-8 pt-0">
                      <Droppable droppableId={sprint.id}>
                        {(provided: any, snapshot: any) => {
                          const sprintEpics = tasks.filter(t => (t.type || '').toLowerCase() === 'epic' && sprintTasks.some(st => st.parentId === t.id));
                          
                          const getSprintTasksForParent = (parentId: string | null) => {
                            if (parentId === 'standalone') return sprintTasks.filter(t => !t.parentId && t.type?.toLowerCase() !== 'epic');
                            return sprintTasks.filter(t => t.parentId === parentId);
                          };

                          let _draggablesRenderedCount = 0;

                          return (
                            <div 
                              {...provided.droppableProps} 
                              ref={provided.innerRef}
                              className={cn(
                                "min-h-[100px] transition-all duration-300 rounded-2xl p-4 border-2 border-dashed",
                                snapshot.isDraggingOver 
                                  ? "bg-indigo-50/70 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] animate-pulse" 
                                  : "border-transparent",
                                sprintTasks.length === 0 && !snapshot.isDraggingOver && "border-slate-200"
                              )}
                            >
                              {sprintTasks.length === 0 && !snapshot.isDraggingOver ? (
                                <div className="flex items-center justify-center p-8">
                                  <p className="text-[11px] font-bold text-slate-400">No tasks in this sprint. Drag items from backlog here.</p>
                                </div>
                              ) : (
                                <>
                                  {sprintEpics.flatMap(epic => {
                                    const items = getSprintTasksForParent(epic.id);
                                    if (items.length === 0) return [];
                                    return [
                                      <div key={`sprint-header-${epic.id}`} className="flex items-center justify-between px-3 py-2 bg-[#f4f7f9] border border-slate-200 rounded-lg mb-2 mt-4 first:mt-0">
                                        <div className="flex items-center gap-2">
                                          <div className="text-purple-600"><Zap className="w-3.5 h-3.5" /></div>
                                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest leading-none mt-0.5">{epic.title}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-purple-400 bg-white border border-purple-100 px-2 py-0.5 rounded-full shadow-sm">{items.length}</div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div key={task.id} className="mb-2 pl-1 relative max-w-full overflow-hidden">
                                            {renderDraggableTask(task, dndIndex, 'row')}
                                          </div>
                                        );
                                      })
                                    ];
                                  })}

                                  {(() => {
                                    const items = getSprintTasksForParent('standalone');
                                    if (items.length === 0) return [];
                                    return [
                                      <div key="sprint-header-standalone" className="flex items-center justify-between px-3 py-2 bg-[#f4f7f9] border border-slate-200 rounded-lg mb-2 mt-4 first:mt-0">
                                        <div className="flex items-center gap-2">
                                          <div className="text-purple-600"><Target className="w-3.5 h-3.5" /></div>
                                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest leading-none mt-0.5">STANDALONE TASKS</span>
                                        </div>
                                        <div className="text-[10px] font-black text-purple-400 bg-white border border-purple-100 px-2 py-0.5 rounded-full shadow-sm">{items.length}</div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div key={task.id} className="mb-2 pl-1 relative max-w-full overflow-hidden">
                                            {renderDraggableTask(task, dndIndex, 'row')}
                                          </div>
                                        );
                                      })
                                    ];
                                  })()}
                                </>
                              )}
                              {provided.placeholder}
                            </div>
                          );
                        }}
                      </Droppable>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
