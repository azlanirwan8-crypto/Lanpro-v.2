const fs = require('fs');
fs.writeFileSync('src/features/dashboard/components/TodayTaskSummary.tsx', `import React from "react";
import { Inbox } from "lucide-react";

interface StatusData {
  name: string;
  current_count: number;
  total_count: number;
  color_code: string;
}

interface TodayTaskSummaryProps {
  statusData: StatusData[];
}

export const TodayTaskSummary: React.FC<TodayTaskSummaryProps> = ({ statusData }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex flex-col h-full">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Today's Task Summary</h3>
      
      {statusData.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-6">
          <Inbox className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Tidak ada tugas di-assign untuk Anda hari ini</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-2">
          {statusData.map((status, index) => {
            const percentage = status.total_count > 0 ? (status.current_count / status.total_count) * 100 : 0;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color_code }} />
                    <span className="font-semibold text-slate-700">{status.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{status.current_count} / {status.total_count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out" 
                    style={{ width: \`\${percentage}%\`, backgroundColor: status.color_code }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {statusData.length > 0 && (
        <div className="pt-4 mt-2 border-t border-slate-100">
        </div>
      )}
    </div>
  );
};
`);
console.log("Written file");
