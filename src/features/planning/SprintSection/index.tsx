
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
    <div className="flex-1 overflow-auto space-y-3.5 pb-16 pr-1 min-h-0 custom-scrollbar">
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
            "bg-white border rounded-lg overflow-hidden transition-all duration-200 shadow-2xs", 
            sprint.status === 'active' ? (isOverdue ? "border-red-400 ring-2 ring-red-50" : "border-indigo-400 ring-2 ring-indigo-50") :
            sprint.status === 'planned' ? "border-slate-200/90 hover:border-indigo-300" :
            "border-slate-200/60 bg-slate-50/40 opacity-95",
            isExpanded && sprint.status !== 'active' ? "border-indigo-200" : ""
          )}>
            <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition border-b border-slate-100" onClick={() => setExpandedSprintId(isExpanded ? "" : sprint.id)}>
              <div className="flex items-center gap-3.5 min-w-0">
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0", isExpanded ? "rotate-0" : "-rotate-90")} />
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className={cn("w-4 h-4 shrink-0", isOverdue ? "text-red-500" : "text-slate-400")} />
                  <h3 className="font-bold text-slate-800 text-sm truncate">{sprint.name}</h3>
                  <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0", 
                    sprint.status === 'active' ? (isOverdue ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200") : 
                    sprint.status === 'planned' ? "bg-slate-100 text-slate-600 border-slate-200/60" : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {sprint.status === 'active' ? (isOverdue ? 'OVERDUE' : 'ACTIVE') : sprint.status === 'planned' ? 'PLANNED' : 'COMPLETED'}
                  </span>
                </div>
                <div className={cn("text-xs font-medium hidden sm:block truncate ml-2", isOverdue ? "text-red-500 font-semibold" : "text-slate-500")}>
                  {sprint.startDate && sprint.endDate ? `${format(ensureDate(sprint.startDate), 'MMM d, yyyy')} - ${format(ensureDate(sprint.endDate), 'MMM d, yyyy')}` : 'No dates set'}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {/* Progress Mini Bar */}
                <div className="hidden lg:flex items-center gap-2.5 w-44" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        completionPercentage === 100 ? "bg-emerald-500" : "bg-indigo-600"
                      )}
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 shrink-0 w-9 text-right">{completionPercentage}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase leading-none">Issues</span>
                    <span className="text-xs font-bold text-slate-700">{sprintTasks.length}</span>
                  </div>
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase leading-none">Points</span>
                    <span className="text-xs font-bold text-indigo-600">{sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0)}</span>
                  </div>

                  {canEditPlanning && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80">
                      {sprint.status === 'planned' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleStartSprint(sprint.id); }} 
                          className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Zap className="w-3 h-3" /> <span>START</span>
                        </button>
                      )}
                      {sprint.status === 'active' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCompleteSprint(sprint.id); }} 
                          className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-all flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" /> <span>COMPLETE</span>
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setEditingSprint(sprint); setIsEditSprintModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSprint(sprint.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
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
                  animate={{ height: 'auto', opacity: 1, transition: { height: { type: 'spring', stiffness: 150, damping: 22 }, opacity: { duration: 0.2 } } }} 
                  exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.2 }, opacity: { duration: 0.15 } } }} 
                  className="overflow-hidden bg-slate-50/30"
                >
                   <div className="p-3.5 pt-2">
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
                                "min-h-[80px] transition-all duration-200 rounded-md p-2.5 border border-dashed",
                                snapshot.isDraggingOver 
                                  ? "bg-indigo-50/70 border-indigo-400 shadow-2xs" 
                                  : "border-slate-200/80 bg-white",
                                sprintTasks.length === 0 && !snapshot.isDraggingOver && "border-slate-200"
                              )}
                            >
                              {sprintTasks.length === 0 && !snapshot.isDraggingOver ? (
                                <div className="flex items-center justify-center p-6 text-center">
                                  <p className="text-xs font-medium text-slate-400">Belum ada task di sprint ini. Tarik task dari Backlog di sebelah kiri ke sini.</p>
                                </div>
                              ) : (
                                <>
                                  {sprintEpics.flatMap(epic => {
                                    const items = getSprintTasksForParent(epic.id);
                                    if (items.length === 0) return [];
                                    return [
                                      <div key={`sprint-header-${epic.id}`} className="flex items-center justify-between px-3 py-1.5 bg-purple-50/50 border border-purple-100 rounded-md mb-2 mt-2 first:mt-0">
                                        <div className="flex items-center gap-2">
                                          <Zap className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider leading-none">{epic.title}</span>
                                        </div>
                                        <div className="text-[10px] font-semibold text-purple-600 bg-white border border-purple-100 px-2 py-0.2 rounded-md">{items.length}</div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div key={task.id} className="mb-2 max-w-full overflow-hidden">
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
                                      <div key="sprint-header-standalone" className="flex items-center justify-between px-3 py-1.5 bg-slate-100/70 border border-slate-200/60 rounded-md mb-2 mt-2 first:mt-0">
                                        <div className="flex items-center gap-2">
                                          <Target className="w-3.5 h-3.5 text-slate-500" />
                                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-none">Standalone Tasks</span>
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200/60 px-2 py-0.2 rounded-md">{items.length}</div>
                                      </div>,
                                      ...items.map((task) => {
                                        const dndIndex = _draggablesRenderedCount++;
                                        return (
                                          <div key={task.id} className="mb-2 max-w-full overflow-hidden">
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
