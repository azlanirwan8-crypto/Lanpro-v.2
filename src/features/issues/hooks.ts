import { useMemo, useState } from 'react';
import { Task } from '../../types';
import { IssueListViewProps } from './types';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';

export const useIssueList = (props: IssueListViewProps) => {
  const { tasks, roots, selectedProject, user, masterData } = props;

  // UI state
  const [listFilterStatus, setListFilterStatus] = useState('All');
  const [listFilterPriority, setListFilterPriority] = useState('All');
  const [listFilterAssignee, setListFilterAssignee] = useState('All');
  const [listFilterCategory, setListFilterCategory] = useState('All');
  const [listFilterSprint, setListFilterSprint] = useState('All');
  const [listFilterLabel, setListFilterLabel] = useState('All');
  const [listFilterEnvironment, setListFilterEnvironment] = useState('All');
  const [listFilterProjectRisk, setListFilterProjectRisk] = useState('All');
  const [listFilterRelease, setListFilterRelease] = useState('All');
  const [listFilterResolution, setListFilterResolution] = useState('All');
  const [listFilterDateType, setListFilterDateType] = useState('dueDate');
  const [listFilterStartDate, setListFilterStartDate] = useState('');
  const [listFilterEndDate, setListFilterEndDate] = useState('');

  const [issueSearch, setIssueSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Columns state
  const [issueTableColumns, setIssueTableColumns] = useState([
    { id: 'work', label: 'WORK', width: 450, visible: true },
    { id: 'assignee', label: 'ASSIGNEE', width: 150, visible: true },
    { id: 'reporter', label: 'REPORTER', width: 150, visible: true },
    { id: 'priority', label: 'PRIORITY', width: 120, visible: true },
    { id: 'status', label: 'STATUS', width: 130, visible: true },
    { id: 'progress', label: 'PROGRESS', width: 130, visible: true },
    { id: 'storyPoints', label: 'STORY POINTS', width: 100, visible: true },
    { id: 'sprint', label: 'SPRINT', width: 130, visible: true },
    { id: 'labels', label: 'LABELS', width: 160, visible: false },
    { id: 'resolution', label: 'RESOLUTION', width: 120, visible: true },
    { id: 'category', label: 'CATEGORY', width: 120, visible: true },
    { id: 'startDate', label: 'START DATE', width: 120, visible: true },
    { id: 'endDate', label: 'END DATE', width: 120, visible: true },
    { id: 'release', label: 'RELEASE', width: 120, visible: true },
    { id: 'dueDate', label: 'DUE DATE', width: 120, visible: true },
    { id: 'updated', label: 'UPDATED', width: 120, visible: true },
    { id: 'created', label: 'CREATED', width: 120, visible: true },
  ]);
  const [isConfigureColumnsOpen, setIsConfigureColumnsOpen] = useState(false);

  // Inline add state
  const [inlineAddingTaskId, setInlineAddingTaskId] = useState<string | null>(null);
  const [inlineAddTitle, setInlineAddTitle] = useState('');
  const [inlineAddType, setInlineAddType] = useState('Task');
  const [inlineAddPriority, setInlineAddPriority] = useState('Medium');
  const [inlineAddStatus, setInlineAddStatus] = useState('To Do');
  const [inlineAddAssigneeId, setInlineAddAssigneeId] = useState('');
  const [inlineAddReporterId, setInlineAddReporterId] = useState('');
  const [inlineAddCategory, setInlineAddCategory] = useState('');
  const [inlineAddDueDate, setInlineAddDueDate] = useState('');
  const [inlineAddRelease, setInlineAddRelease] = useState('');
  const [isInlineTypeOpen, setIsInlineTypeOpen] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const currentUserId = props.currentUserProfile?.uid || props.currentUserProfile?.id || props.user?.uid || props.user?.id;
  const currentUsername = props.currentUserProfile?.username || props.user?.username;
  const currentEmail = props.currentUserProfile?.email || props.user?.email;
  const currentDisplayName = props.currentUserProfile?.displayName || props.user?.displayName;
  const currentNamaLengkap = (props.currentUserProfile as any)?.nama_lengkap || (props.user as any)?.nama_lengkap;

  const validIdentifiers = [
    currentUserId,
    currentUsername,
    currentEmail,
    currentDisplayName,
    currentNamaLengkap
  ].filter(Boolean);

  const rawTasks = Array.isArray(tasks) ? tasks : [];
  const tArr = rawTasks.filter(t => {
    if (!t) return false;
    const aId = t.assigneeId;
    const rId = t.reporterId;
    return (
      validIdentifiers.includes(aId) ||
      validIdentifiers.includes(rId)
    );
  });

  const displayRoots = useMemo(() => {
    const rawRootList = roots || tArr.filter(t => !t.parentId || !tArr.some(p => p.id === t.parentId));
    const rootList = Array.from(
      new Map((rawRootList || []).filter(t => t && t.id).map(t => [t.id, t])).values()
    );
    const query = issueSearch.toLowerCase().trim();

    return rootList.filter((root: Task) => {
      // Direct helper to determine if an individual task matches filters & search query
      const matchesFiltersAndSearch = (t: Task) => {
        const matchesS = !query || 
          (t.title || '').toLowerCase().includes(query) || 
          (t.key || '').toLowerCase().includes(query);

        if (!matchesS) return false;

        if (listFilterStatus && listFilterStatus !== 'All' && t.status !== listFilterStatus) return false;
        if (listFilterPriority && listFilterPriority !== 'All' && t.priority !== listFilterPriority) return false;
        if (listFilterAssignee && listFilterAssignee !== 'All' && t.assigneeId !== listFilterAssignee) return false;
        if (listFilterCategory && listFilterCategory !== 'All' && t.category !== listFilterCategory) return false;
        if (listFilterSprint && listFilterSprint !== 'All') {
          if (listFilterSprint === 'Backlog' && t.sprintId) return false;
          if (listFilterSprint !== 'Backlog' && t.sprintId !== listFilterSprint) return false;
        }

        // Custom field / Attribute filtering
        if (listFilterEnvironment && listFilterEnvironment !== 'All' && t.environment !== listFilterEnvironment) return false;
        if (listFilterProjectRisk && listFilterProjectRisk !== 'All' && t.projectRisk !== listFilterProjectRisk) return false;
        if (listFilterRelease && listFilterRelease !== 'All' && t.release !== listFilterRelease) return false;
        if (listFilterResolution && listFilterResolution !== 'All' && t.resolution !== listFilterResolution) return false;

        // Label filtering
        if (listFilterLabel && listFilterLabel !== 'All') {
          if (!t.labels || !Array.isArray(t.labels) || !t.labels.includes(listFilterLabel)) return false;
        }

        // Date Range filtering
        if (listFilterStartDate || listFilterEndDate) {
          const col = listFilterDateType;
          const checkDateValue = (columnKey: string, taskItem: Task): boolean => {
            const rawVal = taskItem[columnKey as keyof Task];
            if (!rawVal) return false;
            try {
              const itemDate = new Date(rawVal);
              if (isNaN(itemDate.getTime())) return false;
              const time = itemDate.getTime();
              const startOk = listFilterStartDate ? time >= new Date(listFilterStartDate + 'T00:00:00').getTime() : true;
              const endOk = listFilterEndDate ? time <= new Date(listFilterEndDate + 'T23:59:59').getTime() : true;
              return startOk && endOk;
            } catch {
              return false;
            }
          };

          if (col === 'any') {
            const hasAnyMatch = ['startDate', 'endDate', 'dueDate', 'createdAt'].some(c => checkDateValue(c, t));
            if (!hasAnyMatch) return false;
          } else {
            if (!checkDateValue(col, t)) return false;
          }
        }

        return true;
      };

      // Does the root task itself match?
      const rootMatches = matchesFiltersAndSearch(root);

      // Do any of its subtasks match? (direct subtasks or nested)
      const subtasks = tArr.filter(c => c.parentId === root.id);
      const childMatches = subtasks.some(child => matchesFiltersAndSearch(child));

      if (childMatches && query) {
        // Auto expand this root task so matching subtasks are instantly visible
        setExpandedTasks(prev => {
          if (prev.has(root.id)) return prev;
          const next = new Set(prev);
          next.add(root.id);
          return next;
        });
      }

      return rootMatches || childMatches;
    });
  }, [
    roots, 
    tArr, 
    issueSearch, 
    listFilterStatus, 
    listFilterPriority, 
    listFilterAssignee, 
    listFilterCategory, 
    listFilterSprint,
    listFilterLabel,
    listFilterEnvironment,
    listFilterProjectRisk,
    listFilterRelease,
    listFilterResolution,
    listFilterDateType,
    listFilterStartDate,
    listFilterEndDate
  ]);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.size === displayRoots.length && displayRoots.length > 0) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(displayRoots.map(r => r.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTaskIds(next);
  };

  const toggleTaskExpansion = (id: string) => {
    const next = new Set(expandedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedTasks(next);
  };

  const handleInlineAdd = async (parentId: string | null = null, customTitle?: string) => {
    if (isCreating) return;
    const activeUid = user?.uid;
    const titleToUse = customTitle !== undefined ? customTitle : inlineAddTitle;
    if (!selectedProject || !titleToUse.trim() || !activeUid) {
      if (selectedProject && !titleToUse.trim()) toast.error('Judul tugas tidak boleh kosong');
      setInlineAddingTaskId(null);
      if (customTitle === undefined) {
        setInlineAddTitle('');
      }
      return;
    }
    
    setIsCreating(true);
    const effectiveUserId = user?.uid || "guest";
    try {
      await apiRequest(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        headers: { 
          "x-user-id": effectiveUserId
        },
        body: {
          title: titleToUse,
          status: inlineAddStatus || 'To Do',
          type: inlineAddType.toLowerCase(),
          parentId: parentId,
          priority: inlineAddPriority || 'Medium',
          release: inlineAddRelease || '',
          assigneeId: inlineAddAssigneeId || null,
          reporterId: inlineAddReporterId || activeUid,
          category: inlineAddCategory || null,
          dueDate: inlineAddDueDate || null
        }
      });
      
      if (customTitle === undefined) {
        setInlineAddTitle('');
      }
      setInlineAddType('Task');
      setInlineAddPriority('Medium');
      setInlineAddStatus('To Do');
      setInlineAddAssigneeId('');
      setInlineAddReporterId('');
      setInlineAddCategory('');
      setInlineAddDueDate('');
      setInlineAddRelease('');
      setInlineAddingTaskId(null);
      // Automatically expand parent if it was not
      if (parentId && !expandedTasks.has(parentId)) {
        setExpandedTasks(prev => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
      toast.success('Berhasil menambahkan tugas baru');
      
      // OPTIMISTIC UPDATE / RE-FETCH DATA
      if (props.fetchTasks) {
        props.fetchTasks();
      }
    } catch (error) {
      console.error(error);
      toast.error('Gagal menambahkan subtask');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReorderColumns = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(issueTableColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setIssueTableColumns(items);
  };

  const handleColumnResize = (id: string, newWidth: number) => {
    setIssueTableColumns(prev => prev.map(c => c.id === id ? { ...c, width: Math.max(80, newWidth) } : c));
  };


  return {
    displayRoots,
    handleToggleSelectAll,
    handleToggleSelectOne,
    listFilterStatus, setListFilterStatus,
    listFilterPriority, setListFilterPriority,
    listFilterAssignee, setListFilterAssignee,
    listFilterCategory, setListFilterCategory,
    listFilterSprint, setListFilterSprint,
    listFilterLabel, setListFilterLabel,
    listFilterEnvironment, setListFilterEnvironment,
    listFilterProjectRisk, setListFilterProjectRisk,
    listFilterRelease, setListFilterRelease,
    listFilterResolution, setListFilterResolution,
    listFilterDateType, setListFilterDateType,
    listFilterStartDate, setListFilterStartDate,
    listFilterEndDate, setListFilterEndDate,
    issueSearch, setIssueSearch,
    listPage, setListPage,
    itemsPerPage, setItemsPerPage,
    expandedTasks, setExpandedTasks,
    selectedTaskIds, setSelectedTaskIds,
    issueTableColumns, setIssueTableColumns,
    isConfigureColumnsOpen, setIsConfigureColumnsOpen,
    inlineAddingTaskId, setInlineAddingTaskId,
    inlineAddTitle, setInlineAddTitle,
    inlineAddType, setInlineAddType,
    inlineAddPriority, setInlineAddPriority,
    inlineAddStatus, setInlineAddStatus,
    inlineAddAssigneeId, setInlineAddAssigneeId,
    inlineAddReporterId, setInlineAddReporterId,
    inlineAddCategory, setInlineAddCategory,
    inlineAddDueDate, setInlineAddDueDate,
    inlineAddRelease, setInlineAddRelease,
    isInlineTypeOpen, setIsInlineTypeOpen,
    isCreating,
    toggleTaskExpansion,
    handleInlineAdd,
    handleReorderColumns,
    handleColumnResize
  };
};
