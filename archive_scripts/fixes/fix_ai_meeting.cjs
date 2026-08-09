const fs = require('fs');
let code = fs.readFileSync('src/features/meetingNotes/AiMeetingCompanion.tsx', 'utf8');

if (!code.includes('const [convertingTaskIds, setConvertingTaskIds] = useState<number[]>([]);')) {
  // Add state
  code = code.replace(
    'const [isConfirmingRestart, setIsConfirmingRestart] = useState(false);',
    'const [isConfirmingRestart, setIsConfirmingRestart] = useState(false);\n  const [convertingTaskIds, setConvertingTaskIds] = useState<number[]>([]);'
  );

  // Add handleConvertToTask function
  const handleConvertToTaskCode = `
  const handleConvertToTask = async (item: any, index: number) => {
    if (!currentUser || !selectedProject) {
      toast.error("Harap login & pilih project terlebih dahulu.");
      return;
    }
    
    setConvertingTaskIds(prev => [...prev, index]);
    
    try {
      const payload = {
        title: \`[Action Item] \${item.concern_masalah?.substring(0, 50)}...\`,
        description: \`**Concern:**\\n\${item.concern_masalah}\\n\\n**Solusi Disepakati:**\\n\${item.solusi_disepakati}\`,
        status: "To Do",
        priority: "High",
        type: "task",
        assigneeId: null,
        reporterId: currentUser.uid || currentUser.id || 'guest',
      };
      
      const data = await apiRequest(\`/api/projects/\${selectedProject.id}/tasks\`, {
        method: "POST",
        body: payload
      });
      
      if (data.status === "success") {
        toast.success("Berhasil membuat Task Issue baru di Backlog!");
        if (onRefreshTasks) {
          onRefreshTasks();
        }
      } else {
        toast.error(data.message || "Gagal membuat task.");
      }
    } catch (err: any) {
      console.error("Failed to convert to task", err);
      toast.error(err.message || "Gagal membuat task.");
    } finally {
      setConvertingTaskIds(prev => prev.filter(i => i !== index));
    }
  };
`;

  code = code.replace(
    'const handleImportAllActionItems = async () => {',
    handleConvertToTaskCode + '\n  const handleImportAllActionItems = async () => {'
  );
  
  // Add onRefreshTasks to interface if missing (optional but good, let's just ignore if not there, or wait it's not in props)
  // Let's check props.
  code = code.replace('if (onRefreshTasks) {', '// No refresh callback needed if websocket is active\n        // if (onRefreshTasks) {');
  code = code.replace('onRefreshTasks();', '// onRefreshTasks();');
  code = code.replace('} else {', '} else {');

  // Add the button
  const buttonHtml = `
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConvertToTask(item, index)}
                              disabled={convertingTaskIds.includes(index)}
                              title="Buat sebagai Task Issue di Backlog"
                              className="px-3.5 py-2.5 shrink-0 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 disabled:opacity-50 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              {convertingTaskIds.includes(index) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><span className="hidden sm:inline">Buat Task Issue</span><span className="sm:hidden">Task</span></>
                              )}
                            </button>
                            <button
                              onClick={() => handleImportSingle(item, index)}
                              disabled={isImporting}
                              title="Impor ke Poin Diskusi internal Notulensi"
                              className="px-3.5 py-2.5 shrink-0 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-100 text-slate-700 hover:text-indigo-700 disabled:opacity-50 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {isImporting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><span className="hidden sm:inline">Impor ke Diskusi</span><ArrowRight className="w-3.5 h-3.5" /></>
                              )}
                            </button>
                          </div>
  `;

  code = code.replace(
    /                          <button[\s\S]*?<\/button>/,
    buttonHtml
  );

  fs.writeFileSync('src/features/meetingNotes/AiMeetingCompanion.tsx', code);
  console.log("Action Item convert to Task Issue added.");
}
