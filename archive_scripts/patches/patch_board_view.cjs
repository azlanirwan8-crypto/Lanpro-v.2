const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/index.tsx', 'utf8');

// Ensure useState is imported
if (!code.includes('useState')) {
  code = code.replace("import React from 'react';", "import React, { useState } from 'react';");
}

code = code.replace(
  'export const BoardView: React.FC<KanbanBoardProps> = (props) => {',
  'export const BoardView: React.FC<KanbanBoardProps> = (props) => {\n  const [groupBy, setGroupBy] = useState<"epic" | "assignee">("epic");'
);

code = code.replace(
  'const {',
  'const {\n    pArr,'
);

code = code.replace(
  '} = useBoard(props as any);',
  '} = useBoard(props as any, groupBy);'
);

// We need to build Assignee lanes
// Assignee lanes consist of a list of assignees derived from `pArr`
const lanesHeaderReplace = `
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
`;
code = code.replace(
  /<div className="text-\[11px\] font-black uppercase text-slate-400 tracking-widest px-2 pt-3">\s*Roadmap Swimlanes\s*<\/div>/,
  lanesHeaderReplace
);

// We replace the {epics.map(epic => ...)} with a conditional render
const lanesRenderReplace = `
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
          </>
        ) : (
          <>
            {[...pArr, { userId: 'unassigned', user: { displayName: 'Unassigned', email: 'No Assignee' } }].map(member => {
              const uId = member.userId;
              // Check if there are any tasks in this lane, otherwise hide it to save space (except unassigned if it has tasks)
              const hasTasks = boardStatuses.some(s => (groupedTasks[\`\${uId}:\${s.label}\`] || []).length > 0);
              if (!hasTasks && uId === 'unassigned') return null;
              
              return (
                <div key={uId} className="flex gap-4 group">
                   <div className={cn("shrink-0 flex flex-col pt-0 transition-all", isCompact ? "w-[220px]" : "w-[280px] xl:w-[320px]")}>
                      <div className={cn("bg-white rounded-2xl shadow-sm border border-slate-200 sticky left-6 h-fit transition-shadow group-hover:shadow-md", isCompact ? "p-3" : "p-5")}>
                         <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs uppercase overflow-hidden">
                               {member.user?.photoURL ? <img src={member.user.photoURL} alt="avatar" /> : member.user?.displayName?.charAt(0) || '?'}
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
`;

code = code.replace(
  /\{epics\.map\(epic => \([\s\S]*?\)\)\}/,
  lanesRenderReplace
);

// And we need to fix the standalone tasks block to handle groupBy
const standaloneReplace = `
        {/* Standalone Tasks (or tasks not matching current group mode) */}
        {groupBy === 'epic' && standaloneTasks.length > 0 && (
`;
code = code.replace(
  /\{\/\* Standalone Tasks \*\/\}\s*<div/,
  `{/* Standalone Tasks */}\n        {groupBy === 'epic' && (\n        <div`
);
code = code.replace(
  /                 <\/div>\n              <\/div>\n          <\/div>\n        \)\}/,
  `                 </div>\n              </div>\n          </div>\n        )}`
); // Let's use string manipulation if regex fails.
