
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Search, Target, LayoutGrid, Filter } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Task, MasterData } from '../../../types';
import { StyledDropdown } from '../../../components/ui/CommonComponents';

interface BacklogSectionProps {
  tasks: Task[];
  masterData: MasterData[];
  renderDraggableTask: (task: Task, index: number, variant: 'card' | 'row') => React.ReactNode;
}

export const BacklogSection: React.FC<BacklogSectionProps> = ({ tasks, masterData, renderDraggableTask }) => {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');

  const backlogTasks = tasks.filter(t => !t.sprintId);
  
  const filteredBacklogTasks = backlogTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.key?.toLowerCase().includes(search.toLowerCase())) return false;
    if (priorityFilter !== 'All Priorities' && t.priority !== priorityFilter) return false;
    return true;
  });

  const epics = tasks.filter(t => (t.type || '').toLowerCase() === 'epic');

  const getTasksForParent = (parentId: string | null) => {
    if (parentId === 'standalone') return filteredBacklogTasks.filter(t => !t.parentId && t.type?.toLowerCase() !== 'epic');
    return filteredBacklogTasks.filter(t => t.parentId === parentId);
  };

  let _draggablesRenderedCount = 0;

  return (
    <>
      <div className="p-6 pb-4 border-b border-slate-100 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-5 h-5 text-slate-400" />
            <h3 className="font-extrabold text-slate-800 text-lg">Backlog</h3>
          </div>
          <div className="px-2 py-0.5 bg-slate-100 rounded-full text-[11px] font-black text-slate-500">
            {filteredBacklogTasks.length}
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="Search backlog..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:border-indigo-400 focus:bg-white transition-colors" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1">
              <StyledDropdown 
                value={priorityFilter}
                onChange={val => setPriorityFilter(val)}
                options={[
                  { id: 'All Priorities', label: 'All Priorities' },
                  ...masterData.filter(m => m.type === 'priority').map(p => ({ id: p.label, label: p.label, icon: p.icon, color: p.color }))
                ]}
                type="priority"
                masterData={masterData}
                className="w-full !py-2"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 min-h-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {epics.flatMap(epic => {
          const items = getTasksForParent(epic.id);
          if (items.length === 0) return [];
          return [
            <div key={`header-${epic.id}`} className="flex items-center gap-2 px-2 mt-4 mb-3">
              <div className="text-purple-600"><Zap className="w-4 h-4" /></div>
              <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest leading-none">{epic.title}</span>
              <div className="ml-auto text-[10px] font-black text-purple-400 bg-purple-50 px-2 rounded-full border border-purple-100">{items.length}</div>
            </div>,
            ...items.map(task => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2.5 ml-4 pl-2 relative border-l-2 border-indigo-100/50">
                  {renderDraggableTask(task, dndIndex, 'card')}
                </div>
              )
            })
          ];
        })}
        
        {(() => {
          const items = getTasksForParent('standalone');
          if (items.length === 0) return [];
          return [
            <div key="header-standalone" className="flex items-center gap-2 px-2 mt-4 mb-3">
              <div className="text-purple-600"><Target className="w-4 h-4" /></div>
              <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest leading-none">Standalone Tasks</span>
              <div className="ml-auto text-[10px] font-black text-purple-400 bg-purple-50 px-2 rounded-full border border-purple-100">{items.length}</div>
            </div>,
            ...items.map(task => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2.5 ml-4 pl-2 relative border-l-2 border-indigo-100/50">
                  {renderDraggableTask(task, dndIndex, 'card')}
                </div>
              )
            })
          ];
        })()}
      </div>
    </>
  );
};
