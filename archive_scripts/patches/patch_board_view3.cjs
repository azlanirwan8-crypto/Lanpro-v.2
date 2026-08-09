const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/index.tsx', 'utf8');

const regex = /\{epics\.map\(epic => \([\s\S]*?\)\)\}/;
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
`;

code = code.replace(regex, lanesRenderReplace);
fs.writeFileSync('src/features/Kanban/index.tsx', code);
console.log("Replaced epics map with swimlanes.");
