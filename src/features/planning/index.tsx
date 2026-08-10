import React, { useRef } from 'react';
import { DragDropContext, Droppable as _Droppable, Draggable as _Draggable } from '@hello-pangea/dnd';
import { History, Target, Plus, Upload, ShieldAlert, Clock } from 'lucide-react';
import { format } from 'date-fns';

const Droppable = _Droppable as any;
const Draggable = _Draggable as any;

import { cn, ensureDate } from '../../lib/utils';
import { Task } from '../../types';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { PlanningViewProps } from './types';
import { usePlanning } from './hooks';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { BacklogSection } from './BacklogSection';
import { SprintSection } from './SprintSection';

export const PlanningView: React.FC<PlanningViewProps> = (props) => {

  const {
    tasks,
    sprints,
    masterData,
    projectMembers,
    expandedSprintId,
    setExpandedSprintId,
    setSelectedTaskForDetail,
    setIsTaskDetailModalOpen,
    setIsNewSprintModalOpen,
    setIsEditSprintModalOpen,
    setEditingSprint,
    handleStartSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleDragEndPlanning
  } = props;

  const { canEditPlanning, priorityColorMap } = usePlanning(props);

  const renderDraggableTask = (task: Task, index: number, variant: 'card' | 'row' = 'card') => (
      <Draggable key={task.id} draggableId={task.id} index={index}>
        {(provided: any, snapshot: any) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{...provided.draggableProps.style}}
            className="outline-none"
          >
            <div
              onClick={() => { 
                setSelectedTaskForDetail(task); 
                setIsTaskDetailModalOpen(false); 
                useAppStore.getState().setCurrentView('issueDetail' as any); 
              }}
              className={cn(
                "transition-all duration-200 ease-out select-none",
                variant === 'card' ? 
                  "group bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs cursor-pointer hover:border-indigo-300 hover:shadow-xs" : 
                  "group bg-white flex items-center justify-between p-2.5 px-3 rounded-lg border border-slate-200/80 shadow-2xs cursor-pointer hover:bg-slate-50/70 hover:border-indigo-300",
                task.isBlocked && "ring-1 ring-red-500/50 bg-red-50/10 border-red-200",
                snapshot.isDragging && "shadow-xl ring-2 ring-indigo-500/20 scale-[1.02] z-50 bg-white border-indigo-400"
              )}
            >
              {variant === 'card' ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/60">{task.key}</span>
                      {task.priority && <span className={cn("text-[10px] font-semibold uppercase tracking-wider", 
                        task.priority === 'Highest' ? 'text-red-600' : 
                        task.priority === 'High' ? 'text-amber-600' : 
                        task.priority === 'Medium' ? 'text-yellow-600' : 'text-slate-500'
                      )}>{task.priority}</span>}
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        {task.assigneeId ? 
                          <UserAvatar uid={task.assigneeId} members={projectMembers} className="w-5 h-5" /> : 
                          <span className="text-[10px] font-bold text-slate-400">?</span>
                        }
                      </div>
                      {task.dueDate && (
                        <div className={cn(
                          "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded",
                          ensureDate(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                            ? "bg-red-50 text-red-600 border border-red-100" 
                            : "bg-slate-50 text-slate-500"
                        )}>
                          <Clock className="w-3 h-3" />
                          {format(ensureDate(task.dueDate), 'MMM d')}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100/60">
                      {task.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100/60 shrink-0">{task.key}</span>
                    <h4 className="text-xs font-semibold text-slate-800 truncate">{task.title}</h4>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {task.dueDate && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded border",
                        ensureDate(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                          ? "bg-red-50 text-red-600 border-red-100" 
                          : "bg-slate-50 text-slate-500 border-slate-200/60"
                      )}>
                        <Clock className="w-3 h-3" />
                        {format(ensureDate(task.dueDate), 'MMM d')}
                      </div>
                    )}
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-200/70 rounded text-[10px] font-semibold text-slate-700">
                      {task.status}
                    </span>
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                      {task.assigneeId ? 
                        <UserAvatar uid={task.assigneeId} members={projectMembers} className="w-5 h-5" /> : 
                        <span className="text-[10px] font-bold text-slate-400">?</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
  );

  return (
    <div className="flex-1 overflow-hidden bg-[#f3f3f9] flex flex-col p-4 md:p-5 h-screen text-left">
      <DragDropContext onDragEnd={handleDragEndPlanning}>
        <div className="flex flex-1 gap-5 w-full h-full min-h-0">
          <div className="w-[360px] lg:w-[380px] shrink-0 flex flex-col h-full bg-white border border-slate-200/80 rounded-lg overflow-hidden shadow-2xs">
            <Droppable droppableId="backlog">
              {(provided: any) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="h-full flex flex-col">
                      <BacklogSection tasks={tasks} masterData={masterData} renderDraggableTask={renderDraggableTask} />
                      {provided.placeholder}
                  </div>
              )}
            </Droppable>
          </div>
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            <div className="bg-white px-5 py-3.5 rounded-lg border border-slate-200/80 mb-4 flex justify-between items-center shadow-2xs shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-800 tracking-tight">Sprint Planning</h2>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Kelola lini masa proyek dan alokasi sprint tim</p>
              </div>
              {canEditPlanning && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsNewSprintModalOpen(true)} 
                    className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>NEW SPRINT</span>
                  </button>
                </div>
              )}
            </div>

            <SprintSection 
              sprints={sprints} 
              tasks={tasks} 
              expandedSprintId={expandedSprintId} 
              setExpandedSprintId={setExpandedSprintId} 
              renderDraggableTask={renderDraggableTask}
              handleStartSprint={handleStartSprint} 
              handleCompleteSprint={handleCompleteSprint} 
              handleDeleteSprint={handleDeleteSprint} 
              canEditPlanning={canEditPlanning}
              setEditingSprint={setEditingSprint}
              setIsEditSprintModalOpen={setIsEditSprintModalOpen}
            />
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
