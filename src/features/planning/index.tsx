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
  console.log('PlanningView props:', props);
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
              onClick={() => { setSelectedTaskForDetail(task); setIsTaskDetailModalOpen(true); }}
              className={cn(
                "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] select-none",
                variant === 'card' ? 
                  "group bg-white p-3.5 rounded-xl border border-slate-200 border-l-[3px] shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:bg-slate-50/80 hover:border-indigo-300" : 
                  "group bg-white flex items-center justify-between p-3 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50/80 hover:border-indigo-200",
                task.isBlocked && "ring-2 ring-red-500/50 bg-red-50/5",
                task.priority === 'Highest' && variant === 'card' && "border-l-red-500",
                task.priority === 'High' && variant === 'card' && "border-l-orange-500",
                task.priority === 'Medium' && variant === 'card' && "border-l-yellow-500",
                task.priority === 'Low' && variant === 'card' && "border-l-green-500",
                snapshot.isDragging && "shadow-2xl ring-4 ring-indigo-500/20 scale-105 rotate-2 z-50 bg-white border-indigo-400"
              )}
            >
              {variant === 'card' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold text-indigo-500">{task.key}</span>
                      {task.priority && <span className={cn("text-[9px] font-black uppercase tracking-widest", 
                        task.priority === 'Highest' ? 'text-red-500' : 
                        task.priority === 'High' ? 'text-orange-500' : 
                        task.priority === 'Medium' ? 'text-yellow-600' : 'text-green-500'
                      )}>{task.priority}</span>}
                    </div>
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{task.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        {task.assigneeId ? 
                          <UserAvatar uid={task.assigneeId} members={projectMembers} className="w-5 h-5" /> : 
                          <span className="text-[9px] font-black text-slate-400">?</span>
                        }
                      </div>
                      {task.dueDate && (
                        <div className={cn(
                          "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded",
                          ensureDate(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                            ? "bg-red-50 text-red-500" 
                            : "bg-slate-50 text-slate-500"
                        )}>
                          <Clock className="w-3 h-3" />
                          {format(ensureDate(task.dueDate), 'MMM d, yy')}
                        </div>
                      )}
                    </div>
                    <button className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">Move to...</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 w-full">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-orange-500 shrink-0">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20V4M5 11l7-7 7 7"/></svg>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-500 shrink-0">{task.key}</span>
                    <h4 className="text-[12px] font-bold text-slate-800 truncate">{task.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {task.dueDate && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border",
                        ensureDate(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) 
                          ? "bg-red-50 text-red-500 border-red-100" 
                          : "bg-slate-50 text-slate-500 border-slate-100"
                      )}>
                        <Clock className="w-3 h-3" />
                        {format(ensureDate(task.dueDate), 'MMM d, yyyy')}
                      </div>
                    )}
                    <div className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-600 flex items-center gap-1 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      {task.status.toUpperCase()}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                      {task.assigneeId ? 
                        <UserAvatar uid={task.assigneeId} members={projectMembers} className="w-6 h-6" /> : 
                        <span className="text-[10px] font-black text-slate-400">?</span>
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
    <div className="flex-1 overflow-hidden bg-[#f8fafc] flex flex-col pt-8 px-8 pb-0 h-screen">
      <DragDropContext onDragEnd={handleDragEndPlanning}>
        <div className="flex flex-1 gap-8 w-full h-full pb-8">
          <div className="w-[450px] shrink-0 flex flex-col h-full bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <Droppable droppableId="backlog">
              {(provided: any) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="h-full flex flex-col">
                      <BacklogSection tasks={tasks} masterData={masterData} renderDraggableTask={renderDraggableTask} />
                      {provided.placeholder}
                  </div>
              )}
            </Droppable>
          </div>
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 mb-6 flex justify-between items-center shadow-sm shrink-0">
              <div>
                <h2 className="text-[22px] font-black text-slate-800 tracking-tight">Sprint Planning</h2>
                <p className="text-[13px] font-bold text-slate-400 mt-1">Manage your project timeline and task allocation</p>
              </div>
              {canEditPlanning && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsNewSprintModalOpen(true)} 
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95 hover:bg-indigo-700 cursor-pointer"
                  >
                    NEW SPRINT
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
