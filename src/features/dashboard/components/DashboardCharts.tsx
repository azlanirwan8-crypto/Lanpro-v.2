import React from "react";
import { motion } from "motion/react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface ChartProps {
  data: any[];
  colors: string[];
  totalTasks: number;
  title: string;
}

export const DashboardDonutChart: React.FC<ChartProps> = ({ data, colors, totalTasks, title }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100/80 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 select-none shrink-0">
        <span className="text-[10px] font-black tracking-widest text-slate-800 uppercase">{title}</span>
      </div>
      <div className="flex-1 w-full h-[220px] min-h-[200px] flex items-center relative">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-slate-400 italic text-xs w-full">No tasks found.</div>
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 mr-[40%]">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
              <span className="text-lg font-black text-slate-800">{totalTasks}</span>
            </div>
            <motion.div className="w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="40%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                    {data.map((_, index) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
            <div className="flex flex-col justify-center gap-2 pl-4 shrink-0">
              {data.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="truncate max-w-[80px]">{item.name}</span>
                  <span className="text-slate-400">({item.value})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
