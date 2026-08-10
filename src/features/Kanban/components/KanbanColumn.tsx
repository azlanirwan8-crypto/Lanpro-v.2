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
          "shrink-0 flex flex-col h-full rounded-lg transition-all duration-200 group/col relative bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800", 
          isCompact ? "w-[240px]" : "w-[270px]"
      )}>
      {showHeader && (
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-800/80 rounded-t-lg shadow-2xs">
           <div className="flex items-center gap-2">
              {status.icon ? (
                  <RenderIcon iconName={status.icon} className="w-3.5 h-3.5" style={{ color: status.color }} />
              ) : (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">{status.label}</span>
           </div>
           <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200/60">{tasks.length}</span>
        </div>
      )}
      
      <div className={cn("flex-1 overflow-y-auto custom-scrollbar flex flex-col", isCompact ? "p-1.5" : "p-2")}>
        <Droppable droppableId={columnId || status.label}>
          {(provided: any, snapshot: any) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={cn(
                "flex flex-col rounded-md min-h-[100px] h-full transition-all duration-200 flex-1",
                isCompact ? "gap-1.5" : "gap-2",
                snapshot.isDraggingOver && (
                  TERMINAL_STATUSES.some(s => status.label.toLowerCase().includes(s))
                    ? "bg-red-50/40 border-2 border-dashed border-red-400 cursor-not-allowed"
                    : "bg-indigo-50/50 border-2 border-dashed border-indigo-400"
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
                      className="rounded-lg"
                    >
                      <KanbanCard task={task} mArr={mArr} pArr={pArr} onClick={() => onTaskClick(task)} isDragging={snapshot.isDragging} shakingTaskId={shakingTaskId} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {tasks.length === 0 && snapshot.isDraggingOver && (
                <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-indigo-400 bg-indigo-50/30 min-h-[50px] select-none">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Drop here</span>
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
