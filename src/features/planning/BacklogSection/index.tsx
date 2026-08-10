
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
      <div className="p-4 border-b border-slate-200/80 flex flex-col gap-3 shrink-0 bg-white shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Backlog Tasks</h3>
          </div>
          <div className="px-2 py-0.5 bg-indigo-50 border border-indigo-100/60 rounded-md text-xs font-semibold text-indigo-700">
            {filteredBacklogTasks.length} Issues
          </div>
        </div>
        
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              placeholder="Search backlog tasks..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-[38px] bg-slate-50/70 border border-slate-200/80 rounded-md text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-2xs" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                className="w-full"
                buttonClassName="h-[38px] bg-white rounded-md border border-slate-200/80 hover:border-slate-300 shadow-2xs px-3 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/40 min-h-0 custom-scrollbar">
        {epics.flatMap(epic => {
          const items = getTasksForParent(epic.id);
          if (items.length === 0) return [];
          return [
            <div key={`header-${epic.id}`} className="flex items-center gap-2 px-1 mt-3 mb-2">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider leading-none">{epic.title}</span>
              <div className="ml-auto text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.2 rounded-md border border-purple-100">{items.length}</div>
            </div>,
            ...items.map(task => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2 pl-2 relative border-l-2 border-indigo-200/60">
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
            <div key="header-standalone" className="flex items-center gap-2 px-1 mt-3 mb-2">
              <Target className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-none">Standalone Backlog</span>
              <div className="ml-auto text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.2 rounded-md border border-slate-200/60">{items.length}</div>
            </div>,
            ...items.map(task => {
              const dndIndex = _draggablesRenderedCount++;
              return (
                <div key={task.id} className="mb-2 pl-2 relative border-l-2 border-indigo-200/60">
                  {renderDraggableTask(task, dndIndex, 'card')}
                </div>
              )
            })
          ];
        })()}

        {filteredBacklogTasks.length === 0 && (
          <div className="py-12 text-center text-xs font-medium text-slate-400 italic">
            Belum ada task di Backlog. Buat task baru atau sesuaikan filter.
          </div>
        )}
      </div>
    </>
  );
};
