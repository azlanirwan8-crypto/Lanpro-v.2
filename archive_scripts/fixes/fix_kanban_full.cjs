const fs = require('fs');

const code = `import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './components/KanbanColumn';
import { useBoard } from './hooks/useKanbanLogic';
import { KanbanBoardProps } from './types';
import { RenderIcon } from '../../components/RenderIcon';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { Layers } from 'lucide-react';

export const BoardView: React.FC<KanbanBoardProps> = (props) => {
  const { density } = useAppStore();
  const isCompact = density === 'compact';
  const [groupBy, setGroupBy] = useState<"epic" | "assignee">("epic");

  const {
    boardStatuses,
    epics,
    standaloneTasks,
    tArr,
    mArr,
    pArr,
    groupedTasks,
    handleDragEndBoard
  } = useBoard(props as any, groupBy);

  const renderBoard = () => {
    return (
      <div className={cn("flex flex-col w-full pb-8", isCompact ? "gap-4" : "gap-6")}>
        {/* Header Row */}
        <div className="flex items-start gap-4 sticky top-0 z-20 bg-[#f8fafc] pt-2 pb-2">
             <div className={cn("shrink-0 transition-all", isCompact ? "w-[220px]" : "w-[280px] xl:w-[320px]")}>
                <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-2 pt-3 flex justify-between items-center">
                   <span>Swimlanes</span>
                   <select 
                     value={groupBy}
                     onChange={(e) => setGroupBy(e.target.value as any)}
                     className="bg-transparent border-none text-[9px] font-bold text-indigo-500 cursor-pointer outline-none"
                   >
                     <option value="epic">By Epic</option>
                     <option value="assignee">By Assignee</option>
                   </select>
                </div>
             </div>
              <div className="flex gap-4 flex-1">
                 {boardStatuses.map((status, index) => (
                    <div key={\`header-\${status.id || status.label}-\${index}\`} className={cn("shrink-0 transition-all", isCompact ? "w-[250px]" : "w-[300px]")}>
                         <div className={cn("flex items-center justify-between border border-slate-200/60 rounded-xl shadow-sm bg-white", isCompact ? "px-3 py-2" : "px-4 py-3")}>
                            <div className="flex items-center gap-2">
                               {status.icon ? (
                                   <RenderIcon iconName={status.icon} className="w-4 h-4 saturate-150" style={{ color: status.color }} />
                               ) : (
                                   <div className="w-3 h-3 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: status.color }} />
                               )}
                               <span className="text-[12px] font-bold uppercase tracking-widest text-slate-700">{status.label}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">
                                {tArr.filter((t: any) => t.status === status.label).length}
                            </span>
                         </div>
                    </div>
                 ))}
             </div>
        </div>

        {/* Swimlanes Rendering */}
        {groupBy === 'epic' ? (
          <>
            {epics.map(epic => (
              <div key={epic.id} className="flex gap-4 group">
                 <div className={cn("shrink-0 flex flex-col pt-0 transition-all", isCompact ? "w-[220px]" : "w-[280px] xl:w-[320px]")}>
                    <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 sticky left-6 h-fit transition-shadow group-hover:shadow-md", isCompact ? "p-3" : "p-5")}>
                       <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                             <Layers className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Epic</span>
                       </div>
                       <h3 className={cn("font-bold text-slate-800 leading-snug", isCompact ? "text-xs" : "text-sm")}>{epic.title}</h3>
                       {epic.description && !isCompact && (
                         <p className="mt-2 text-xs text-slate-500 line-clamp-2">{epic.description}</p>
                       )}
                    </div>
                 </div>
                 <div className={cn("flex gap-4 flex-1 bg-white/40 border border-dashed border-slate-200", isCompact ? "p-1.5 rounded-2xl" : "p-2 rounded-3xl")}>
                     {boardStatuses.map((status, index) => (
                        <KanbanColumn 
                            key={\`\${epic.id}-\${status.id || status.label}-\${index}\`}
                            status={status}
                            tasks={groupedTasks[\`\${epic.id}:\${status.label}\`] || []}
                            mArr={mArr}
                            pArr={pArr}
                            columnId={\`\${epic.id}:\${status.label}\`}
                            showHeader={false}
                            onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                        />
                     ))}
                 </div>
              </div>
            ))}
            
            {/* Standalone Tasks when Epic grouped */}
            {standaloneTasks.length > 0 && (
              <div className="flex gap-4 group mt-2">
                   <div className={cn("shrink-0 flex flex-col pt-0 transition-all", isCompact ? "w-[220px]" : "w-[280px] xl:w-[320px]")}>
                      <div className={cn("bg-transparent rounded-2xl border border-dashed border-slate-300 sticky left-6 h-fit transition-shadow group-hover:shadow-sm", isCompact ? "p-3" : "p-5")}>
                         <h3 className={cn("font-bold text-slate-600 leading-snug", isCompact ? "text-xs" : "text-sm")}>Other Tasks</h3>
                         <p className="mt-1 text-[10px] font-medium text-slate-400">Tasks not assigned to any Epic</p>
                      </div>
                   </div>
                   <div className={cn("flex gap-4 flex-1 bg-white/20 border border-dashed border-slate-200", isCompact ? "p-1.5 rounded-2xl" : "p-2 rounded-3xl")}>
                       {boardStatuses.map((status, index) => (
                          <KanbanColumn 
                              key={\`standalone-\${status.id || status.label}-\${index}\`}
                              status={status}
                              tasks={groupedTasks[\`standalone:\${status.label}\`] || []}
                              mArr={mArr}
                              pArr={pArr}
                              columnId={\`standalone:\${status.label}\`}
                              showHeader={false}
                              onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                          />
                       ))}
                   </div>
              </div>
            )}
          </>
        ) : (
          <>
            {[...pArr, { userId: 'unassigned', user: { displayName: 'Unassigned', email: 'No Assignee' } }].map(member => {
              const uId = member.userId;
              const hasTasks = boardStatuses.some(s => (groupedTasks[\`\${uId}:\${s.label}\`] || []).length > 0);
              if (!hasTasks && uId === 'unassigned') return null;
              
              return (
                <div key={uId} className="flex gap-4 group">
                   <div className={cn("shrink-0 flex flex-col pt-0 transition-all", isCompact ? "w-[220px]" : "w-[280px] xl:w-[320px]")}>
                      <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 sticky left-6 h-fit transition-shadow group-hover:shadow-md", isCompact ? "p-3" : "p-5")}>
                         <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs uppercase overflow-hidden">
                               {member.user?.photoURL ? <img src={member.user.photoURL} alt="avatar" className="w-full h-full object-cover" /> : member.user?.displayName?.charAt(0) || '?'}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignee</span>
                         </div>
                         <h3 className={cn("font-bold text-slate-800 leading-snug", isCompact ? "text-xs" : "text-sm")}>{member.user?.displayName || 'Unknown'}</h3>
                      </div>
                   </div>
                   <div className={cn("flex gap-4 flex-1 bg-white/40 border border-dashed border-slate-200", isCompact ? "p-1.5 rounded-2xl" : "p-2 rounded-3xl")}>
                       {boardStatuses.map((status, index) => (
                          <KanbanColumn 
                              key={\`\${uId}-\${status.id || status.label}-\${index}\`}
                              status={status}
                              tasks={groupedTasks[\`\${uId}:\${status.label}\`] || []}
                              mArr={mArr}
                              pArr={pArr}
                              columnId={\`\${uId}:\${status.label}\`}
                              showHeader={false}
                              onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                          />
                       ))}
                   </div>
                </div>
              );
            })}
          </>
        )}

      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] z-0 opacity-50" />
        <div className="flex-1 overflow-auto bg-transparent relative z-10 px-6 sm:px-8 custom-scrollbar">
            <DragDropContext onDragEnd={handleDragEndBoard}>
              {renderBoard()}
            </DragDropContext>
        </div>
    </div>
  );
};
`;

fs.writeFileSync('src/features/Kanban/index.tsx', code);
console.log("Restored Kanban correctly");
