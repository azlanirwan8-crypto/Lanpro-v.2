const fs = require('fs');
let code = fs.readFileSync('src/features/Kanban/hooks/useKanbanLogic.ts', 'utf8');

code = code.replace(
  'export const useBoard = (props: KanbanBoardProps) => {',
  'export const useBoard = (props: KanbanBoardProps, groupBy: "epic" | "assignee" = "epic") => {'
);

const newGroupLogic = `
  const groupedTasks = useMemo(() => {
    const epicIds = new Set(epics.map(e => e.id));
    const groups: Record<string, typeof tArr> = {};
    
    tArr.forEach(task => {
      if ((task.type || '').toLowerCase() === 'epic') return;
      
      let laneKey = 'standalone';
      if (groupBy === 'epic') {
         const hasEpicParent = task.parentId && epicIds.has(task.parentId);
         laneKey = hasEpicParent ? task.parentId : 'standalone';
      } else if (groupBy === 'assignee') {
         laneKey = task.assigneeId || 'unassigned';
      }
      
      const key = \`\${laneKey}:\${task.status}\`;
            
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });
    return groups;
  }, [tArr, epics, groupBy]);
`;

code = code.replace(
  /const groupedTasks = useMemo\(\(\) => \{[\s\S]*?\}, \[tArr, epics\]\);/,
  newGroupLogic
);

// We need to return the new lane logic in handleDragEndBoard if we are grouped by assignee.
// Actually, if we group by assignee, moving a task between lanes should change its assigneeId!
// Wait, destination.droppableId is `laneKey:status`.
const dragEndPatch = `
    const parts = destination.droppableId.split(':');
    const newStatus = parts.length > 1 ? parts[1] : destination.droppableId;
    const destLaneId = parts.length > 1 ? parts[0] : null;

    if (!checkTaskBlockers(tArr, draggableId, newStatus)) return;

    if (props.setTasks && taskToMove) {
      const newTasks = tArr.map(t => {
        if (t.id === draggableId) {
           const updated = { ...t, status: newStatus };
           if (destLaneId) {
             if (groupBy === 'epic') {
               updated.parentId = (destLaneId === 'unparented' || destLaneId === 'standalone') ? null : destLaneId;
             } else if (groupBy === 'assignee') {
               updated.assigneeId = (destLaneId === 'unassigned') ? null : destLaneId;
             }
           }
           return updated;
        }
        return t;
      });
      props.setTasks(newTasks);
    }

    try {
      const updates: any = {
        status: newStatus,
        version: taskToMove.version
      };
      
      if (destLaneId) {
        if (groupBy === 'epic') {
          updates.parentId = (destLaneId === 'unparented' || destLaneId === 'standalone') ? null : destLaneId;
        } else if (groupBy === 'assignee') {
          updates.assigneeId = (destLaneId === 'unassigned') ? null : destLaneId;
        }
      }
`;

code = code.replace(
    /const parts = destination\.droppableId\.split\(':'\);[\s\S]*?if \(destLaneId\) \{[\s\S]*?updates\.parentId = destLaneId;\n        \}\n      \}/,
    dragEndPatch
);

fs.writeFileSync('src/features/Kanban/hooks/useKanbanLogic.ts', code);
console.log("Kanban logic updated with groupBy support.");
