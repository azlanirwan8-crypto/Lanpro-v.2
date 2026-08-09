import { format, differenceInDays, addDays, isSameDay } from 'date-fns';
import { DashboardViewProps } from './types';
import { ensureDate } from '../../lib/utils';
import { Task, UserProfile } from '../../types';

export const COLORS = ['#F97316', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];

export const useDashboard = (props: DashboardViewProps) => {
  const tasks = Array.isArray(props.tasks) ? props.tasks : [];
  const sprints = Array.isArray(props.sprints) ? props.sprints : [];
  const projectMembers = Array.isArray(props.projectMembers) ? props.projectMembers : [];
  const activityLogs = Array.isArray(props.activityLogs) ? props.activityLogs : [];

  const now = new Date();
  
  const dueSoonTasks = tasks.filter(t => {
     if(t.status === 'Done' || t.status === 'Selesai') return false;
     if(!t.endDate) return false;
     const d = ensureDate(t.endDate);
     return d.getTime() > now.getTime() && d.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
  });

  const overdueTasks = tasks.filter(t => 
    (t.status !== 'Done' && t.status !== 'Selesai') && 
    t.endDate && 
    ensureDate(t.endDate).getTime() < now.getTime()
  );

  const blockedTasks = tasks.filter(t => t.isBlocked || t.labels?.some(l => l.toLowerCase() === 'blocked' || l.toLowerCase() === 'stopper' || l.toLowerCase() === 'stoper'));

  const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'Selesai');
  const inProgressTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Selesai' && t.status !== 'Backlog');
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks.length / totalTasks) * 100);

  // Sprint Data
  const activeSprint = sprints.find(s => s.status === 'active');
  let sprintProgress = 0;
  let sprintTotalTasks = 0;
  let sprintCompletedTasks = 0;
  let sprintDaysLeft = 0;
  
  if (activeSprint) {
     const sTasks = tasks.filter(t => t.sprintId === activeSprint.id);
     sprintTotalTasks = sTasks.length;
     sprintCompletedTasks = sTasks.filter(t => t.status === 'Done' || t.status === 'Selesai').length;
     sprintProgress = sprintTotalTasks === 0 ? 0 : Math.round((sprintCompletedTasks / sprintTotalTasks) * 100);
     if (activeSprint.endDate) {
       sprintDaysLeft = Math.max(0, differenceInDays(ensureDate(activeSprint.endDate), now));
     }
  }

  // Priority Distribution
  const priorityCount = tasks.reduce((acc, t) => {
    const p = t.priority || 'Unassigned';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const priorityData = Object.entries(priorityCount).map(([name, value]) => ({ name, value }));

  // Status Distribution
  const statusCount = tasks.reduce((acc, t) => {
    const s = t.status || 'Backlog';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const statusData = Object.entries(statusCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  // Category Distribution
  const categoryCount = tasks.reduce((acc, t) => {
    const c = t.category || 'Uncategorized';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const categoryData = Object.entries(categoryCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

  // Workload Analytics
  const userWorkloadMap: Record<string, { name: string, Done: number, Active: number }> = {};
  projectMembers.forEach(m => {
     if (!m) return;
     userWorkloadMap[m.uid] = { name: m?.displayName || m?.email?.split('@')[0] || 'Unknown', Done: 0, Active: 0 };
  });
  userWorkloadMap['unassigned'] = { name: 'Unassigned', Done: 0, Active: 0 };

  const teamWorkloadMap: Record<string, { name: string, Done: number, Active: number }> = {};
  projectMembers.forEach(m => {
     if (!m) return;
     const team = m.department || 'No Team';
     if(!teamWorkloadMap[team]) teamWorkloadMap[team] = { name: team, Done: 0, Active: 0 };
  });
  if(!teamWorkloadMap['No Team']) teamWorkloadMap['No Team'] = { name: 'No Team', Done: 0, Active: 0 };

  tasks.forEach(t => {
     const assignee = t.assigneeId || 'unassigned';
     if (!userWorkloadMap[assignee]) {
         userWorkloadMap[assignee] = { name: 'Legacy User', Done: 0, Active: 0 };
     }
     if (t.status === 'Done' || t.status === 'Selesai') userWorkloadMap[assignee].Done += 1;
     else userWorkloadMap[assignee].Active += 1;
     
     let teamName = 'No Team';
     if (assignee !== 'unassigned') {
       const pm = projectMembers.find(m => m && m.uid === assignee);
       if (pm && pm.department) teamName = pm.department;
     }
     if (!teamWorkloadMap[teamName]) teamWorkloadMap[teamName] = { name: teamName, Done: 0, Active: 0 };
     
     if (t.status === 'Done' || t.status === 'Selesai') teamWorkloadMap[teamName].Done += 1;
     else teamWorkloadMap[teamName].Active += 1;
  });

  const workloadData = Object.values(userWorkloadMap).filter(w => w.Done > 0 || w.Active > 0).sort((a,b) => (b.Done + b.Active) - (a.Done + a.Active));
  const teamWorkloadData = Object.values(teamWorkloadMap).filter(w => w.Done > 0 || w.Active > 0).sort((a,b) => (b.Done + b.Active) - (a.Done + a.Active));

  // Compute sprint-based workload for each team member
  const sprintUserWorkloadMap: Record<string, { name: string, Done: number, Active: number }> = {};
  projectMembers.forEach(m => {
     if (!m) return;
     sprintUserWorkloadMap[m.uid] = { name: m?.displayName || m?.email?.split('@')[0] || 'Unknown', Done: 0, Active: 0 };
  });
  sprintUserWorkloadMap['unassigned'] = { name: 'Unassigned', Done: 0, Active: 0 };

  if (activeSprint) {
    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
    sprintTasks.forEach(t => {
       const assignee = t.assigneeId || 'unassigned';
       if (!sprintUserWorkloadMap[assignee]) {
           sprintUserWorkloadMap[assignee] = { name: 'Legacy User', Done: 0, Active: 0 };
       }
       if (t.status === 'Done' || t.status === 'Selesai') sprintUserWorkloadMap[assignee].Done += 1;
       else sprintUserWorkloadMap[assignee].Active += 1;
    });
  }
  const sprintWorkloadData = Object.values(sprintUserWorkloadMap).filter(w => w.Done > 0 || w.Active > 0).sort((a,b) => (b.Done + b.Active) - (a.Done + a.Active));

  const burndownData = (() => {
    if (!activeSprint || !activeSprint.startDate || !activeSprint.endDate) return [];
    const start = ensureDate(activeSprint.startDate);
    const end = ensureDate(activeSprint.endDate);
    const totalDays = differenceInDays(end, start);
    if (totalDays <= 0 || totalDays > 100) return [];

    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id);
    const totalTaskCount = sprintTasks.length;
    if (totalTaskCount === 0) return [];

    const data = [];
    for (let i = 0; i <= totalDays; i++) {
      const currentDate = addDays(start, i);
      const idealRemaining = Math.max(0, totalTaskCount - (totalTaskCount / totalDays) * i);
      
      let completedTasksAsOfDate = 0;
      sprintTasks.forEach(t => {
         if (t.status === 'Done' || t.status === 'Selesai') {
            const taskDate = t.updatedAt ? ensureDate(t.updatedAt) : new Date();
            if (taskDate.getTime() <= currentDate.getTime() || isSameDay(taskDate, currentDate)) {
               completedTasksAsOfDate++;
            }
         }
      });

      const isFuture = currentDate.getTime() > new Date().getTime() && !isSameDay(currentDate, new Date());
      data.push({
         date: format(currentDate, 'MMM d'),
         Ideal: Number(idealRemaining.toFixed(1)),
         Actual: isFuture ? null : (totalTaskCount - completedTasksAsOfDate)
      });
    }
    return data;
  })();

  const last7DaysDataRaw = [];
  const msInDay = 24 * 60 * 60 * 1000;
  for(let i=6; i>=0; i--) {
     const d = new Date(now.getTime() - i * msInDay);
     const dateStr = format(d, 'dd MMM');
     
     const dayActivities = activityLogs.filter(a => {
        if(!a.createdAt) return false;
        const ad = ensureDate(a.createdAt);
        return ad.getDate() === d.getDate() && ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
     }).length;

     const completedThatDay = tasks.filter(t => {
        if((t.status !== 'Done' && t.status !== 'Selesai') || !t.updatedAt) return false;
        const td = ensureDate(t.updatedAt);
        return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
     }).length;

     last7DaysDataRaw.push({
       name: dateStr,
       Activity: dayActivities,
       Completed: completedThatDay
     });
  }
  const last7DaysData = [...last7DaysDataRaw];
  const weeklyVelocity = last7DaysData.reduce((acc, curr) => acc + curr.Completed, 0);

  // Velocity Data (Story points or task count completed across past sprints)
  const velocityData = sprints
    .slice() // copy array
    .sort((a, b) => {
      // sort by start date
      if (!a.startDate || !b.startDate) return 0;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    })
    .slice(-5) // Last 5 sprints
    .map(sprint => {
      const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
      const plannedPoints = sprintTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      const completedTasks = sprintTasks.filter(t => t.status === 'Done' || t.status === 'Selesai');
      const completedPoints = completedTasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0);
      
      return {
        name: sprint.name,
        Planned: plannedPoints || sprintTasks.length, // fallback to task count if no points
        Completed: completedPoints || completedTasks.length
      };
    });

  // Estimation Accuracy Data
  const estimationAccuracyData = (() => {
    let targetTasks: Task[] = [];
    if (activeSprint) {
      targetTasks = tasks.filter(t => t.sprintId === activeSprint.id);
    } else {
      targetTasks = [...tasks]
        .sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 8);
    }

    const filtered = targetTasks.filter(t => (t.storyPoints && t.storyPoints > 0) || (t.loggedHours && t.loggedHours > 0));
    const finalTasks = filtered.length > 0 ? filtered : targetTasks.slice(0, 8);

    return finalTasks.map(t => ({
      key: t.key,
      title: t.title,
      estimated: t.storyPoints || 0,
      actual: t.loggedHours || 0,
    }));
  })();

  const estimationStats = (() => {
    const data = estimationAccuracyData;
    let totalEstimated = 0;
    let totalActual = 0;
    let underEstimatedCount = 0;
    let overEstimatedCount = 0;
    let perfectCount = 0;

    data.forEach(item => {
      totalEstimated += item.estimated;
      totalActual += item.actual;
      if (item.estimated > 0 && item.actual > 0) {
        if (item.actual > item.estimated) {
          underEstimatedCount++;
        } else if (item.estimated > item.actual) {
          overEstimatedCount++;
        } else {
          perfectCount++;
        }
      }
    });

    const accuracyRate = totalEstimated > 0 
      ? Math.max(0, Math.min(100, Math.round((1 - Math.abs(totalEstimated - totalActual) / totalEstimated) * 100)))
      : 100;

    return {
      totalEstimated,
      totalActual,
      underEstimatedCount,
      overEstimatedCount,
      perfectCount,
      accuracyRate
    };
  })();

  return {
    tasks,
    sprints,
    projectMembers,
    activityLogs,
    dueSoonTasks,
    overdueTasks,
    completedTasks,
    inProgressTasks,
    totalTasks,
    completionPercentage,
    activeSprint,
    sprintProgress,
    sprintTotalTasks,
    sprintCompletedTasks,
    sprintDaysLeft,
    blockedTasks,
    priorityData,
    statusData,
    categoryData,
    workloadData,
    teamWorkloadData,
    sprintWorkloadData,
    burndownData,
    last7DaysData,
    weeklyVelocity,
    velocityData,
    estimationAccuracyData,
    estimationStats,
    now
  };
};
