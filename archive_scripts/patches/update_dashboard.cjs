const fs = require('fs');
const content = fs.readFileSync('src/features/dashboard/index.tsx', 'utf8');

const target1 = `  const formattedStatusData = useMemo(() => {
    return statusData.map((s, i) => ({
      name: s.name,
      current_count: s.value,
      total_count: totalTasks,
      color_code: COLORS[i % COLORS.length]
    }));
  }, [statusData, totalTasks]);`;

const replacement1 = `  // 1. KODE REFACTOR AGREGASI DATA (REACT / HELPER FUNCTION)
  const myPersonalMetrics = useMemo(() => {
    if (!currentUser) {
      return {
        myTasks: [],
        myTodayTasks: [],
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0,
        completionPercentage: 0,
        statusData: []
      };
    }

    const currentUserId = currentUser.uid || currentUser.id;
    const currentUserEmail = currentUser.email;

    // Filter STRICT ASSIGNEE
    const myTasks = tasks.filter(t => {
      // Handle array or single string for assigneeId if needed, but usually string
      const isAssignee = t.assigneeId === currentUserId || t.assigneeEmail === currentUserEmail;
      
      // Exclude Parent tasks (Epic/Story) if they are not explicitly assigned to this user
      // Assuming tasks have a type/issueType property or we rely strictly on assignee
      return isAssignee;
    });

    const now = new Date();
    
    // Total Denominator
    const total = myTasks.length;

    // Task categories
    const completedTasks = myTasks.filter(t => t.status?.toLowerCase() === 'done' || t.status?.toLowerCase() === 'selesai');
    const completed = completedTasks.length;
    
    const inProgressTasks = myTasks.filter(t => !['done', 'selesai', 'backlog'].includes(t.status?.toLowerCase() || ''));
    const inProgress = inProgressTasks.length;

    const overdueTasks = myTasks.filter(t => 
      !['done', 'selesai'].includes(t.status?.toLowerCase() || '') && 
      t.endDate && 
      ensureDate(t.endDate).getTime() < now.getTime()
    );
    const overdue = overdueTasks.length;

    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Today's task logic
    const myTodayTasks = myTasks.filter(t => {
      let isDueToday = false;
      if (t.dueDate || t.endDate) {
        const dateToUse = t.dueDate ? ensureDate(t.dueDate) : ensureDate(t.endDate!);
        isDueToday = isSameDay(dateToUse, now);
      }
      const isActive = !["done", "archive", "closed", "canceled", "selesai"].includes(t.status?.toLowerCase() || "");
      return isDueToday || isActive;
    });

    const statusMap: Record<string, number> = {};
    myTodayTasks.forEach(t => {
      const s = t.status || 'To Do';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    
    const todayTotal = myTodayTasks.length;
    
    const statusData = Object.entries(statusMap)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count], i) => ({
        name,
        current_count: count,
        total_count: todayTotal,
        color_code: COLORS[i % COLORS.length]
      }));

    return {
      myTasks,
      myTodayTasks,
      total,
      completed,
      inProgress,
      overdue,
      completionPercentage,
      statusData
    };
  }, [tasks, currentUser]);

  const formattedStatusData = myPersonalMetrics.statusData;`;

let newContent = content.replace(target1, replacement1);

const target2 = `<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard title="Completion" value={\`\${completionPercentage}%\`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <MetricCard title="In Progress" value={inProgressTasks.length.toString()} icon={<Activity className="w-4 h-4 text-blue-500" />} />
          <MetricCard title="Overdue" value={overdueTasks.length.toString()} icon={<AlertCircle className="w-4 h-4 text-rose-500" />} />
          <MetricCard title="Velocity" value={weeklyVelocity.toString()} icon={<TrendingUp className="w-4 h-4 text-amber-500" />} />
          <MetricCard title="Members" value={projectMembers.length.toString()} icon={<Users className="w-4 h-4 text-indigo-500" />} />
        </div>`;

const replacement2 = `<div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard title="My Completion" value={\`\${myPersonalMetrics.completionPercentage}%\`} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
          <MetricCard title="My In Progress" value={myPersonalMetrics.inProgress.toString()} icon={<Activity className="w-4 h-4 text-blue-500" />} />
          <MetricCard title="My Overdue" value={myPersonalMetrics.overdue.toString()} icon={<AlertCircle className="w-4 h-4 text-rose-500" />} />
          <MetricCard title="Velocity" value={weeklyVelocity.toString()} icon={<TrendingUp className="w-4 h-4 text-amber-500" />} />
          <MetricCard title="Members" value={projectMembers.length.toString()} icon={<Users className="w-4 h-4 text-indigo-500" />} />
        </div>`;

newContent = newContent.replace(target2, replacement2);

fs.writeFileSync('src/features/dashboard/index.tsx', newContent);
console.log("Replaced successfully!");
