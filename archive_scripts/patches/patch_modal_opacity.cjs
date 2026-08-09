const fs = require('fs');
let code = fs.readFileSync('src/features/issues/TaskDetailModal.tsx', 'utf8');

// 1. Wrap Left Column main info (excluding subtasks) and Right Column metadata
// Wait, the easiest way is to apply it directly to the components, or small groups.
// But we can also just wrap the 'Main Info' parts.
// Actually, let's wrap the Title, Description, Acceptance Criteria
// Title:
code = code.replace(
  /className="space-y-4"/,
  'className={cn("space-y-4 transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}'
);

// Description:
code = code.replace(
  /className="group relative"/,
  'className={cn("group relative transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}'
);

// Acceptance Criteria:
code = code.replace(
  /className="group relative pt-2"/,
  'className={cn("group relative pt-2 transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}'
);

// Right Column:
code = code.replace(
  /className="lg:col-span-4 bg-slate-50\/50 p-8 lg:p-10 border-t lg:border-t-0 border-slate-100 flex flex-col"/,
  'className={cn("lg:col-span-4 bg-slate-50/50 p-8 lg:p-10 border-t lg:border-t-0 border-slate-100 flex flex-col transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}'
);

// Subtasks:
code = code.replace(
  /className="flex items-center gap-4 p-3 bg-white hover:bg-indigo-50\/30 rounded-2xl group border border-slate-100 hover:border-indigo-100 transition-all shadow-sm"/,
  'className={cn("flex items-center gap-4 p-3 bg-white hover:bg-indigo-50/30 rounded-2xl group border border-slate-100 transition-all shadow-sm", isUpdatingTask?.[st.id] ? "opacity-50 pointer-events-none" : "hover:border-indigo-100")}'
);

fs.writeFileSync('src/features/issues/TaskDetailModal.tsx', code);
