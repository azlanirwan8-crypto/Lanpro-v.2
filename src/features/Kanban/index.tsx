import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './components/KanbanColumn';
import { useBoard } from './hooks/useKanbanLogic';
import { KanbanBoardProps } from './types';
import { RenderIcon } from '../../components/RenderIcon';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { Layers } from 'lucide-react';

const getStatusStyle = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes('done') || lower.includes('selesai') || lower.includes('closed') || lower.includes('resolved')) {
    return {
      bg: 'bg-[#ECFDF5]',
      border: 'border-t-[#10B981]',
      borderColor: '#10B981',
      text: 'text-emerald-700',
      indicatorBg: 'bg-emerald-100',
      indicatorText: 'text-emerald-700',
    };
  }
  if (lower.includes('uat') || lower.includes('review') || lower.includes('code review')) {
    return {
      bg: 'bg-[#F3E8FF]',
      border: 'border-t-[#8B5CF6]',
      borderColor: '#8B5CF6',
      text: 'text-purple-700',
      indicatorBg: 'bg-purple-100',
      indicatorText: 'text-purple-700',
    };
  }
  if (lower.includes('progress') || lower.includes('doing') || lower.includes('in progress') || lower.includes('active')) {
    return {
      bg: 'bg-[#FFFBEB]',
      border: 'border-t-[#F59E0B]',
      borderColor: '#F59E0B',
      text: 'text-amber-700',
      indicatorBg: 'bg-amber-100',
      indicatorText: 'text-amber-700',
    };
  }
  // TO DO / BACKLOG / others
  return {
    bg: 'bg-[#EFF6FF]',
    border: 'border-t-[#3B82F6]',
    borderColor: '#3B82F6',
    text: 'text-blue-700',
    indicatorBg: 'bg-blue-100',
    indicatorText: 'text-blue-700',
  };
};

export const BoardView: React.FC<KanbanBoardProps> = (props) => {
  const { density } = useAppStore();
  const isCompact = density === 'compact';
  const [groupBy, setGroupBy] = useState<"epic" | "assignee">("epic");
  const [showEmptySwimlanes, setShowEmptySwimlanes] = useState(false);

  const {
    boardStatuses,
    epics,
    standaloneTasks,
    tArr,
    mArr,
    pArr,
    groupedTasks,
    handleDragEndBoard,
    shakingTaskId
  } = useBoard(props as any, groupBy);

  if (!boardStatuses || boardStatuses.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500">Loading board...</div>;
  }

  const filteredEpics = showEmptySwimlanes ? epics : epics.filter(epic => {
    const epicTasks = boardStatuses.reduce((acc, status) => acc + (groupedTasks[`${epic.id}:${status.label}`]?.length || 0), 0);
    return epicTasks > 0;
  });

  // Consolidate & Deduplicate Assignees for Swimlane 'By Assignee'
  const allMemberSwimlanes = React.useMemo(() => {
    const map = new Map<string, { id: string; displayName: string; email?: string; photoURL?: string }>();

    // Add unique members from projectMembers (pArr)
    pArr.forEach(m => {
      const id = m?.uid || m?.id;
      if (id && id !== 'unassigned') {
        if (!map.has(id)) {
          map.set(id, {
            id,
            displayName: m?.displayName || m?.name || m?.username || m?.user?.displayName || 'Unknown',
            email: m?.email || m?.user?.email,
            photoURL: m?.photoURL || m?.user?.photoURL
          });
        }
      }
    });

    // Check if any tasks have assignees not present in projectMembers
    tArr.forEach(t => {
      const rawAid = t.assigneeId;
      const aid = typeof rawAid === 'object' ? (rawAid?.uid || rawAid?.id) : rawAid;
      if (aid && aid !== 'unassigned' && aid !== 'null' && aid !== 'undefined' && aid !== 'none' && !map.has(aid)) {
        map.set(aid, {
          id: String(aid),
          displayName: t.assigneeName || t.assigneeDisplayName || `User (${String(aid).slice(0, 6)})`,
          email: undefined,
          photoURL: undefined
        });
      }
    });

    return Array.from(map.values());
  }, [pArr, tArr]);

  const filteredAssigneeSwimlanes = React.useMemo(() => {
    // Filter member swimlanes based on empty state toggle
    const memberLanes = allMemberSwimlanes.filter(m => {
      if (showEmptySwimlanes) return true;
      const taskCount = boardStatuses.reduce((acc, status) => acc + (groupedTasks[`${m.id}:${status.label}`]?.length || 0), 0);
      return taskCount > 0;
    });

    // Calculate unassigned tasks count
    const unassignedCount = boardStatuses.reduce((acc, status) => acc + (groupedTasks[`unassigned:${status.label}`]?.length || 0), 0);

    // Render 'Unassigned' row at the bottom if it has tasks OR if showEmptySwimlanes is checked
    const showUnassigned = showEmptySwimlanes ? true : unassignedCount > 0;

    if (showUnassigned) {
      memberLanes.push({
        id: 'unassigned',
        displayName: 'Unassigned',
        email: 'No Assignee',
        photoURL: undefined
      });
    }

    return memberLanes;
  }, [allMemberSwimlanes, showEmptySwimlanes, boardStatuses, groupedTasks]);

  const renderBoard = () => {
    return (
      <div className={cn("relative w-fit min-w-full pb-8")}>
        {/* Header Bar - Static Sidebar and Scrollable Status Headers */}
        <div className="grid grid-cols-[320px_1fr] sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Bagian A Header */}
            <div className="sticky left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 h-[64px] flex items-center px-6 relative">
                <div className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-700 dark:text-slate-200 font-extrabold text-[12px]">Swimlanes</span>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                            <input type="checkbox" checked={showEmptySwimlanes} onChange={(e) => setShowEmptySwimlanes(e.target.checked)} className="accent-indigo-500 rounded" />
                            <span>Empty</span>
                        </label>
                    </div>
                    <div className="relative">
                        <select 
                          value={groupBy}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-[10px] font-bold px-2.5 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="epic">By Epic</option>
                          <option value="assignee">By Assignee</option>
                        </select>
                    </div>
                </div>
            </div>
            {/* Bagian B Header - Scrollable */}
            <div className="flex overflow-x-auto items-center px-6 py-3 gap-6 bg-white dark:bg-slate-900 custom-scrollbar">
                {boardStatuses.map((status, index) => {
                    const statusStyle = getStatusStyle(status.label);
                    return (
                      <div key={`header-${status.id || status.label}-${index}`} className={cn("shrink-0", index === 0 ? "relative z-10 pl-0" : "", isCompact ? "w-[250px]" : "w-[300px]")}>
                           <div className={cn(
                             "flex items-center justify-between border-t-4 border-x border-b border-slate-200/60 rounded-xl shadow-sm transition-all duration-200",
                             statusStyle.bg,
                             statusStyle.border,
                             isCompact ? "px-3 py-2" : "px-4 py-3"
                           )}>
                              <div className="flex items-center gap-2">
                                 {status.icon ? (
                                      <RenderIcon iconName={status.icon} className="w-4 h-4 saturate-150" style={{ color: statusStyle.borderColor }} />
                                 ) : (
                                      <div className="w-3 h-3 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: statusStyle.borderColor }} />
                                 )}
                                 <span className={cn("text-[12px] font-black uppercase tracking-widest", statusStyle.text)}>{status.label}</span>
                              </div>
                              <span className={cn("px-2 py-1 rounded text-[10px] font-black shadow-sm", statusStyle.indicatorBg, statusStyle.indicatorText)}>
                                  {tArr.filter((t: any) => t.status === status.label).length}
                              </span>
                           </div>
                      </div>
                    );
                 })}
            </div>
        </div>

        {/* Rows Rendering */}
        <div className="flex flex-col gap-6 mt-4">
          {groupBy === 'epic' ? (
             <>
                {filteredEpics.map((epic, epicIndex) => (
                  <div key={epic.id} className="grid grid-cols-[320px_1fr] items-stretch border-b border-slate-200 dark:border-slate-800 min-h-[120px]">
                      {/* Bagian A Row Cell - Sticky Sidebar */}
                      <div className="sticky left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 pl-6 pr-6 py-4 relative">
                          {/* Epic Card Content */}
                          <div className={cn("bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-indigo-600 transition-all duration-300 hover:shadow-md", isCompact ? "p-3" : "p-5")}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                                    <Layers className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Epic</span>
                                <span className="ml-auto bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                  {boardStatuses.reduce((acc, status) => acc + (groupedTasks[`${epic.id}:${status.label}`]?.length || 0), 0)} Issues
                                </span>
                            </div>
                            <h3 className={cn("font-bold text-slate-800 dark:text-slate-100 leading-snug", isCompact ? "text-xs" : "text-sm")}>{epic.title}</h3>
                          </div>
                      </div>
                      
                      {/* Bagian B Row Cells - Columns */}
                      <div className="flex gap-8 px-6 py-4">
                          {boardStatuses.map((status, index) => (
                              <div key={`${epic.id}-${status.id || status.label}-${index}`} className={cn("shrink-0", isCompact ? "w-[250px]" : "w-[300px]")}>
                                  <KanbanColumn
                                    status={status}
                                    tasks={groupedTasks[`${epic.id}:${status.label}`] || []}
                                    mArr={mArr}
                                    pArr={pArr}
                                    columnId={`${epic.id}:${status.label}`}
                                    showHeader={false}
                                    shakingTaskId={shakingTaskId}
                                    onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
                ))}
                {/* Standalone Tasks when Epic grouped */}
                {standaloneTasks.length > 0 && (
                  <div className="grid grid-cols-[320px_1fr] items-stretch border-b border-slate-200 dark:border-slate-800 min-h-[120px]">
                      {/* Bagian A Row Cell - Sticky Sidebar */}
                      <div className="sticky left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 pl-6 pr-6 py-4 relative">
                          <div className={cn("bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 h-fit transition-shadow group-hover:shadow-sm", isCompact ? "p-3" : "p-5")}>
                              <h3 className={cn("font-bold text-slate-600 dark:text-slate-300 leading-snug", isCompact ? "text-xs" : "text-sm")}>Other Tasks</h3>
                              <p className="mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">Tasks not assigned to any Epic</p>
                          </div>
                      </div>
                      
                      {/* Bagian B Row Cells - Columns */}
                      <div className="flex gap-8 px-6 py-4">
                          {boardStatuses.map((status, index) => (
                              <div key={`standalone-${status.id || status.label}-${index}`} className={cn("shrink-0", isCompact ? "w-[250px]" : "w-[300px]")}>
                                  <KanbanColumn
                                    status={status}
                                    tasks={groupedTasks[`standalone:${status.label}`] || []}
                                    mArr={mArr}
                                    pArr={pArr}
                                    columnId={`standalone:${status.label}`}
                                    showHeader={false}
                                    shakingTaskId={shakingTaskId}
                                    onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
                )}
             </>
          ) : (
              <>
                {filteredAssigneeSwimlanes.map((member) => {
                  const uId = member.id;
                  const isUnassigned = uId === 'unassigned';
                  const totalIssueCount = boardStatuses.reduce(
                    (acc, status) => acc + (groupedTasks[`${uId}:${status.label}`]?.length || 0),
                    0
                  );

                  return (
                    <div key={uId} className="grid grid-cols-[320px_1fr] items-stretch border-b border-slate-200 dark:border-slate-800 min-h-[120px]">
                      {/* Bagian A Row Cell - Sticky Sidebar */}
                      <div className="sticky left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 pl-6 pr-6 py-4 relative">
                        <div className={cn(
                          "bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 transition-shadow group-hover:shadow-md",
                          isUnassigned ? "border-l-slate-400 bg-slate-50/50 dark:bg-slate-800/50" : "border-l-indigo-600",
                          isCompact ? "p-3" : "p-5"
                        )}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0",
                              isUnassigned ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            )}>
                              {isUnassigned ? (
                                '?'
                              ) : member.photoURL ? (
                                <img src={member.photoURL} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                (member.displayName || '?').charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
                              {isUnassigned ? 'Unassigned' : 'Assignee'}
                            </span>
                            <span className="ml-auto bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">
                              {totalIssueCount} Issues
                            </span>
                          </div>
                          <h3 className={cn("font-bold text-slate-800 dark:text-slate-100 leading-snug truncate", isCompact ? "text-xs" : "text-sm")}>
                            {member.displayName}
                          </h3>
                          {member.email && member.email !== 'No Assignee' && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{member.email}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Bagian B Row Cells - Columns */}
                      <div className="flex gap-8 px-6 py-4">
                        {boardStatuses.map((status, index) => (
                          <div key={`${uId}-${status.id || status.label}-${index}`} className={cn("shrink-0", isCompact ? "w-[250px]" : "w-[300px]")}>
                            <KanbanColumn
                              status={status}
                              tasks={groupedTasks[`${uId}:${status.label}`] || []}
                              mArr={mArr}
                              pArr={pArr}
                              columnId={`${uId}:${status.label}`}
                              showHeader={false}
                              shakingTaskId={shakingTaskId}
                              onTaskClick={(task) => { props.setSelectedTaskForDetail(task); props.setIsTaskDetailModalOpen(true); }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] z-0 opacity-40 pointer-events-none" />
    <DragDropContext onDragEnd={handleDragEndBoard}>
        <div className="flex-1 overflow-auto bg-transparent relative z-10 custom-scrollbar">
            {renderBoard()}
        </div>
    </DragDropContext>
    </div>
  );
};
