import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '../../../lib/utils';
import { RenderIcon } from '../../../components/RenderIcon';
import { KanbanCard } from './KanbanCard';
import { useAppStore } from '../../../store/useAppStore';
import { TERMINAL_STATUSES } from '../../../lib/constants';

interface KanbanColumnProps {
  status: any;
  tasks: any[];
  mArr: any[];
  pArr: any[];
  onTaskClick: (task: any) => void;
  columnId?: string;
  showHeader?: boolean;
  shakingTaskId?: string | null;
}

export const KanbanColumn = React.memo<KanbanColumnProps>(({ status, tasks, mArr, pArr, onTaskClick, columnId, showHeader = true, shakingTaskId }) => {
  const { density } = useAppStore();
  const isCompact = density === 'compact';

  return (
      <div className={cn(
          "shrink-0 flex flex-col h-full backdrop-blur-sm rounded-2xl transition-all duration-300 group/col relative bg-slate-50/50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800", 
          isCompact ? "w-[250px]" : "w-[300px]"
      )}>
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 rounded-t-2xl">
           <div className="flex items-center gap-2">
              {status.icon ? (
                  <RenderIcon iconName={status.icon} className="w-3.5 h-3.5 saturate-150" style={{ color: status.color }} />
              ) : (
                  <div className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10 dark:border-white/10" style={{ backgroundColor: status.color }} />
              )}
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">{status.label}</span>
           </div>
           <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold">{tasks.length}</span>
        </div>
      )}
      
      <div className={cn("flex-1 overflow-y-auto custom-scrollbar flex flex-col", isCompact ? "p-1.5" : "p-2")}>
        <Droppable droppableId={columnId || status.label}>
          {(provided: any, snapshot: any) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "flex flex-col rounded-xl min-h-[150px] h-full transition-all duration-200 flex-1",
                isCompact ? "gap-1.5" : "gap-2.5",
                snapshot.isDraggingOver && (
                  TERMINAL_STATUSES.some(s => status.label.toLowerCase().includes(s))
                    ? "bg-red-50/40 ring-2 ring-inset ring-red-400/80 shadow-[0_0_15px_rgba(244,63,94,0.15)] cursor-not-allowed"
                    : "bg-indigo-50/40 ring-2 ring-inset ring-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                )
              )}
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                  {(provided: any, snapshot: any) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={provided.draggableProps.style}
                      className={cn(
                          "rounded-xl"
                      )}
                    >
                      <KanbanCard task={task} mArr={mArr} pArr={pArr} onClick={() => onTaskClick(task)} isDragging={snapshot.isDragging} shakingTaskId={shakingTaskId} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {tasks.length === 0 && snapshot.isDraggingOver && (
                <div className={cn(
                  "flex items-center justify-center p-4 rounded-xl border border-dashed border-indigo-300/50 bg-indigo-50/20 transition-all duration-300 hover:border-indigo-400 hover:bg-indigo-50/40 min-h-[60px] relative select-none"
                )}>
                    <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase">Drop here</span>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.columnId !== nextProps.columnId) return false;
  if (prevProps.showHeader !== nextProps.showHeader) return false;
  if (prevProps.status?.label !== nextProps.status?.label) return false;
  if (prevProps.status?.color !== nextProps.status?.color) return false;
  if (prevProps.status?.icon !== nextProps.status?.icon) return false;
  if (prevProps.tasks.length !== nextProps.tasks.length) return false;
  if (prevProps.mArr !== nextProps.mArr) return false;
  if (prevProps.pArr !== nextProps.pArr) return false;
  
  // Verify deep equality of tasks
  for (let i = 0; i < prevProps.tasks.length; i++) {
    const pt = prevProps.tasks[i];
    const nt = nextProps.tasks[i];
    if (
      pt.id !== nt.id ||
      pt.status !== nt.status ||
      pt.version !== nt.version ||
      pt.title !== nt.title ||
      pt.assigneeId !== nt.assigneeId ||
      pt.isBlocked !== nt.isBlocked ||
      pt.priority !== nt.priority ||
      pt.updatedAt !== nt.updatedAt ||
      JSON.stringify(pt.subtasks) !== JSON.stringify(nt.subtasks) ||
      (pt.linkedTasks?.length || 0) !== (nt.linkedTasks?.length || 0)
    ) {
      return false;
    }
  }
  return true;
});
