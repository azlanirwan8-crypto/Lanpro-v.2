const fs = require('fs');
let code = fs.readFileSync('src/features/issues/TaskDetailModal.tsx', 'utf8');

// Acceptance Criteria:
code = code.replace(
  /className="group relative"\>\s*\{task\.acceptanceCriteria/,
  'className={cn("group relative", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}>\n                    {task.acceptanceCriteria'
);

// Right Column:
code = code.replace(
  /className="lg:col-span-4 bg-slate-50\/50 p-8 space-y-8 border-l border-slate-100 lg:sticky lg:top-0 h-fit"/,
  'className={cn("lg:col-span-4 bg-slate-50/50 p-8 space-y-8 border-l border-slate-100 lg:sticky lg:top-0 h-fit transition-opacity", isUpdatingTask?.[task.id] && "opacity-50 pointer-events-none")}'
);

fs.writeFileSync('src/features/issues/TaskDetailModal.tsx', code);
