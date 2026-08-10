import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { KanbanBoardProps } from '../types';
import { TERMINAL_STATUSES } from '../../../lib/constants';

const checkTaskBlockers = (tasks: any[], taskId: string, targetStatus: string) => {
  const isTerminalStatus = targetStatus.toLowerCase().includes('done') || targetStatus.toLowerCase().includes('completed');
  if (!isTerminalStatus) return true;

  const task = tasks.find(t => t.id === taskId);
  if (!task || !task.linkedTasks) return true;

  const blockers = task.linkedTasks.filter((l: any) => l.relationType === 'is_blocked_by');
  
  for (const blocker of blockers) {
    const blockingTask = tasks.find(t => t.id === blocker.targetTaskId);
    if (blockingTask && !blockingTask.status.toLowerCase().includes('done') && !blockingTask.status.toLowerCase().includes('completed')) {
      toast.error(`Tidak dapat menyelesaikan ${task.key}: tugas ini terblokir oleh ${blockingTask.key} (${blockingTask.status}).`);
      return false;
    }
  }
  return true;
};

export const useBoard = (props: KanbanBoardProps, groupBy: "epic" | "assignee" = "epic") => {
  const { masterData, tasks, projectMembers, userRole, user, selectedProject } = props;
  const [shakingTaskId, setShakingTaskId] = useState<string | null>(null);

  const mArr = useMemo(() => Array.isArray(masterData) ? masterData : [], [masterData]);
  const tArr = useMemo(() => Array.isArray(tasks) ? tasks : [], [tasks]);
  const pArr = useMemo(() => Array.isArray(projectMembers) ? projectMembers : [], [projectMembers]);

  const boardStatuses = useMemo(() => 
    mArr.filter(d => d.type === 'status').sort((a,b) => (a.order||0) - (b.order||0)),
    [mArr]
  );

  const epics = useMemo(() => 
    tArr.filter(t => (t.type || '').toLowerCase() === 'epic'),
    [tArr]
  );

  const standaloneTasks = useMemo(() => {
    const epicIds = new Set(epics.map(e => e.id));
    return tArr.filter(t => (t.type || '').toLowerCase() !== 'epic' && (!t.parentId || epicIds.has(t.parentId)));
  }, [tArr, epics]);

  
  const groupedTasks = useMemo(() => {
    const epicIds = new Set(epics.map(e => e.id));
    const groups: Record<string, typeof tArr> = {};
    
    tArr.forEach(task => {
      const isEpic = (task.type || '').toLowerCase() === 'epic';
      const isSubtask = task.parentId && !epicIds.has(task.parentId); // Assuming subtasks point to non-epic tasks
      
      if (isEpic || isSubtask) return;
      
      let laneKey = 'standalone';
      if (groupBy === 'epic') {
         const hasEpicParent = task.parentId && epicIds.has(task.parentId);
         laneKey = hasEpicParent ? task.parentId : 'standalone';
      } else if (groupBy === 'assignee') {
         const rawAid = task.assigneeId;
         const aid = typeof rawAid === 'object' ? (rawAid?.uid || rawAid?.id) : rawAid;
         laneKey = (aid && aid !== 'null' && aid !== 'undefined' && aid !== 'none') ? String(aid) : 'unassigned';
      }
      
      const key = `${laneKey}:${task.status}`;
            
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });
    return groups;
  }, [tArr, epics, groupBy]);


  const handleDragEndBoard = async (result: any) => {
    if (!result.destination || !selectedProject) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const taskToMove = tArr.find(t => t.id === draggableId);
    
    const parts = destination.droppableId.split(':');
    const newStatus = parts.length > 1 ? parts[1] : destination.droppableId;

    // Check for unfinished subtasks when moving to DONE / UAT / Completed
    const isTerminalStatus = (status: string) => {
      if (!status) return false;
      const s = status.toLowerCase().trim();
      return s.includes('done') || s.includes('completed') || s.includes('uat') || s.includes('closed') || s.includes('finish') || TERMINAL_STATUSES.includes(s);
    };

    if (taskToMove && isTerminalStatus(newStatus)) {
      const inlineUnfinished = (taskToMove.subtasks || []).filter((st: any) => !isTerminalStatus(st.status));
      const childUnfinished = tArr.filter((t: any) => t.parentId === taskToMove.id && !isTerminalStatus(t.status));

      if (inlineUnfinished.length > 0 || childUnfinished.length > 0) {
        setShakingTaskId(draggableId);
        setTimeout(() => setShakingTaskId(null), 800);
        toast.error("Subtask Dependency Blocker: Kartu tidak dapat dipindahkan ke 'DONE' / 'UAT' karena masih memiliki subtask yang belum 100% selesai.", {
          duration: 5000,
        });
        if (props.refreshTasks) props.refreshTasks(); // Revert position
        return;
      }
    }

    // Check for blocking dependencies
    if (taskToMove && taskToMove.linkedTasks) {
      const blockers = taskToMove.linkedTasks.filter((l: any) => l.relationType === 'is_blocked_by');
      for (const blocker of blockers) {
        const blockingTask = tArr.find(t => t.id === blocker.targetTaskId);
        if (blockingTask && blockingTask.status !== 'Done' && blockingTask.status !== 'Completed') {
          toast.error(`Tidak dapat memindahkan ${taskToMove.title}: tugas ini terblokir oleh ${blockingTask.title}.`);
          return;
        }
      }
    }
    
    if (taskToMove && !['admin', 'manager'].includes(userRole)) {
      if (taskToMove.assigneeId !== user?.uid && taskToMove.reporterId !== user?.uid) {
        toast.error('Akses Ditolak: Anda hanya dapat memindahkan tugas yang ditugaskan kepada Anda atau yang Anda buat.');
        return;
      }
    }

    
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


      const { apiRequest } = await import('../../../lib/api');
      const effectiveUserId = user?.uid || user?.id || "guest";
      await apiRequest(`/api/projects/${selectedProject.id}/tasks/${draggableId}`, {
        method: "PUT",
        headers: {
          "x-user-id": effectiveUserId
        },
        body: updates
      });

      if (props.refreshTasks) {
        props.refreshTasks();
      }
    } catch (e: any) {
      console.error("Failed to update task status", e);
      toast.error(e.message || "Gagal memindahkan task.");
      if (props.refreshTasks) {
         props.refreshTasks(); // Revert on failure
      }
    }
  };

  return {
    mArr,
    tArr,
    pArr,
    boardStatuses,
    epics,
    standaloneTasks,
    groupedTasks,
    handleDragEndBoard,
    shakingTaskId
  };
};
