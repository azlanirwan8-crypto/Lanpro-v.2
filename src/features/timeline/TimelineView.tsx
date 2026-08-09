import React, { useState, useEffect, useRef } from 'react';
import { Task, Project } from '../../types';
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, addDays, differenceInDays, startOfYear, endOfYear } from 'date-fns';
import { ensureDate } from '../../lib/utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

interface TimelineViewProps {
  tasks: Task[];
  selectedProject: Project | null;
  updateTaskField: (taskId: string, field: string, value: any) => Promise<void>;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
  timelineZoom: 'days' | 'weeks' | 'months';
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  tasks,
  selectedProject,
  updateTaskField,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
  timelineZoom
}) => {
  const [timelineInteraction, setTimelineInteraction] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: Date;
    initialEnd: Date;
  } | null>(null);
  const [tempDates, setTempDates] = useState<Record<string, { startDate: string; endDate: string }>>({});
  
  const timelineListRef = useRef<HTMLDivElement>(null);
  const timelineMainRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const pixelsPerDay = timelineZoom === 'days' ? 60 : timelineZoom === 'weeks' ? 24 : 8;

  const handleTimelineVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (timelineListRef.current && target === timelineMainRef.current) {
      timelineListRef.current.scrollTop = target.scrollTop;
    } else if (timelineMainRef.current && target === timelineListRef.current) {
      timelineMainRef.current.scrollTop = target.scrollTop;
    }
  };

  const getTimelineBounds = () => {
    let minDate = new Date('2099-12-31');
    let maxDate = new Date('2000-01-01');
    let hasDates = false;

    (tasks || []).forEach(task => {
      if (task.startDate) {
        const start = ensureDate(task.startDate);
        if (start < minDate) minDate = start;
        hasDates = true;
      }
      if (task.endDate) {
        const end = ensureDate(task.endDate);
        if (end > maxDate) maxDate = end;
        hasDates = true;
      }
    });

    if (!hasDates) {
      minDate = startOfMonth(new Date());
      maxDate = endOfMonth(addDays(new Date(), 90));
    } else {
      minDate = startOfMonth(minDate);
      maxDate = endOfMonth(addDays(maxDate, 90));
    }
    
    // Ensure coverage for specific months requested (Apr, May)
    const targetMin = new Date('2026-03-01');
    const targetMax = new Date('2026-05-31');
    if (minDate > targetMin) minDate = targetMin;
    if (maxDate < targetMax) maxDate = targetMax;

    minDate = startOfMonth(minDate);
    maxDate = endOfMonth(maxDate);

    if (minDate > maxDate) {
      maxDate = endOfMonth(addDays(minDate, 90));
    }

    const totalDays = differenceInDays(maxDate, minDate);
    const months = [];
    let current = startOfMonth(minDate);
    while (current <= maxDate) {
      months.push(current);
      current = addDays(endOfMonth(current), 1);
    }
    
    const weeks = [];
    let currentWeek = startOfWeek(minDate);
    while (currentWeek <= maxDate) {
      weeks.push(currentWeek);
      currentWeek = addDays(endOfWeek(currentWeek), 1);
    }

    const days = [];
    for (let i = 0; i <= totalDays; i++) {
        days.push(addDays(minDate, i));
    }

    const years = [];
    let currentYear = startOfYear(minDate);
    while (currentYear <= maxDate) {
      years.push(currentYear);
      currentYear = addDays(endOfYear(currentYear), 1);
    }

    return { minDate, maxDate, totalDays, months, weeks, days, years };
  };

  useEffect(() => {
    if (!timelineInteraction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - timelineInteraction.startX;
      const daysDiff = Math.round(dx / pixelsPerDay);

      const newDates = { ...tempDates };
      const task = tasks.find(t => t.id === timelineInteraction.taskId);
      if (!task) return;

      let newStart = timelineInteraction.initialStart;
      let newEnd = timelineInteraction.initialEnd;

      if (timelineInteraction.type === 'move') {
        newStart = addDays(timelineInteraction.initialStart, daysDiff);
        newEnd = addDays(timelineInteraction.initialEnd, daysDiff);
      } else if (timelineInteraction.type === 'resize-start') {
        newStart = addDays(timelineInteraction.initialStart, daysDiff);
        if (newStart > newEnd) newStart = newEnd;
      } else if (timelineInteraction.type === 'resize-end') {
        newEnd = addDays(timelineInteraction.initialEnd, daysDiff);
        if (newEnd < newStart) newEnd = newStart;
      }

      newDates[task.id] = {
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd')
      };
      setTempDates(newDates);
    };

    const handleMouseUp = async () => {
      const pending = tempDates[timelineInteraction.taskId];
      if (pending) {
        await updateTaskField(timelineInteraction.taskId, 'startDate', pending.startDate);
        await updateTaskField(timelineInteraction.taskId, 'endDate', pending.endDate);
      }
      setTimelineInteraction(null);
      setTempDates({});
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [timelineInteraction, tasks, tempDates, pixelsPerDay, updateTaskField]);


  const { minDate, totalDays, months: timelineMonths, days: timelineDays, weeks: timelineWeeks, years: timelineYears } = getTimelineBounds();
  const localTasks = tasks || [];
  const today = new Date();
  let todayLeft = 0;
  if (today >= minDate) {
    todayLeft = (differenceInDays(today, minDate) / (totalDays || 1)) * 100;
  }

  return (
    <div className="flex-1 overflow-hidden p-6 flex">
      <div ref={timelineContainerRef} className="print-roadmap-container flex flex-1 w-full relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none">
        <div className="w-80 shrink-0 border-r border-gray-200 flex flex-col z-20 bg-white relative">
          <div className="sticky top-0 z-30 h-[73px] bg-[#F4F5F7] border-b border-gray-200 px-4 flex items-center justify-between">
            <span className="font-bold text-[10px] text-gray-400 uppercase tracking-widest">Epic / Task</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-24" ref={timelineListRef} onScroll={handleTimelineVerticalScroll}>
            {localTasks.map(task => (
              <div key={task.id} className="h-16 flex items-center gap-3 px-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors relative z-10">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-gray-800 truncate">{task.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setSelectedTaskForDetail(task); setIsTaskDetailModalOpen(true); }} className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline uppercase tracking-tighter text-left">{task.key}</button>
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[9px] font-black uppercase text-gray-400">{task.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-auto relative bg-[#fcfcfc]" ref={timelineMainRef} onScroll={handleTimelineVerticalScroll}>
          <div className="min-w-max relative" style={{ width: `${totalDays * pixelsPerDay}px`, minHeight: '100%' }}>
            <div className="sticky top-0 z-30 h-[73px] bg-[#F4F5F7] border-b border-gray-200 shadow-sm box-border flex flex-col">
              <div className="flex h-8 border-b border-gray-200/50">
                {timelineZoom !== 'months' ? timelineMonths.map((m: any) => {
                  const mStart = startOfMonth(m);
                  const actualStart = mStart < minDate ? minDate : mStart;
                  const mEnd = endOfMonth(m);
                  const expectedEnd = mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                  const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                  return (
                    <div key={m.toISOString()} className="flex items-center px-2 py-1 border-r border-gray-200/50" style={{ width: `${actualDays * pixelsPerDay}px` }}>
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{format(m, 'MMM yyyy')}</span>
                    </div>
                  );
                }) : timelineYears.map((y: any) => {
                  const yStart = startOfYear(y);
                  const actualStart = yStart < minDate ? minDate : yStart;
                  const yEnd = endOfYear(y);
                  const expectedEnd = yEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : yEnd;
                  const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                  return (
                    <div key={y.toISOString()} className="flex items-center px-2 py-1 border-r border-gray-200/50" style={{ width: `${actualDays * pixelsPerDay}px` }}>
                      <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{format(y, 'yyyy')}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex h-10">
                {timelineZoom === 'days' && timelineDays.map((d: any, i: number) => (
                  <div key={d.toISOString()} className="flex items-center justify-center border-r border-gray-200/50 shrink-0" style={{ width: `${pixelsPerDay}px` }}>
                    <span className="text-[10px] font-bold text-gray-400">{format(d, 'd')}</span>
                  </div>
                ))}
                {timelineZoom === 'weeks' && timelineWeeks.map((w: any, i: number) => {
                  const wStart = startOfWeek(w);
                  const actualStart = wStart < minDate ? minDate : wStart;
                  const wEnd = endOfWeek(w);
                  const expectedEnd = wEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : wEnd;
                  const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                  return (
                    <div key={w.toISOString()} className="flex items-center justify-center border-r border-gray-200/50 shrink-0" style={{ width: `${actualDays * pixelsPerDay}px` }}>
                      <span className="text-[10px] font-bold text-gray-400">W{format(w, 'w')}</span>
                    </div>
                  );
                })}
                {timelineZoom === 'months' && timelineMonths.map((m: any, i: number) => {
                  const mStart = startOfMonth(m);
                  const actualStart = mStart < minDate ? minDate : mStart;
                  const mEnd = endOfMonth(m);
                  const expectedEnd = mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                  const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                  return (
                    <div key={m.toISOString()} className="flex items-center justify-center border-r border-gray-200/50 shrink-0" style={{ width: `${actualDays * pixelsPerDay}px` }}>
                      <span className="text-[10px] font-bold text-gray-400">{format(m, 'MMM')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none flex z-10 pt-[73px]">
              {timelineZoom === 'days' && timelineDays.map((d: any, i: number) => (
                <div key={'grid-'+d.toISOString()} className={`shrink-0 border-r ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50/50 border-gray-100' : 'border-gray-100/50'}`} style={{ width: `${pixelsPerDay}px` }} />
              ))}
              {timelineZoom === 'weeks' && timelineWeeks.map((w: any, i: number) => {
                const wStart = startOfWeek(w);
                const actualStart = wStart < minDate ? minDate : wStart;
                const wEnd = endOfWeek(w);
                const expectedEnd = wEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : wEnd;
                const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                return <div key={'grid-'+w.toISOString()} className="shrink-0 border-r border-gray-100/50" style={{ width: `${actualDays * pixelsPerDay}px` }} />;
              })}
              {timelineZoom === 'months' && timelineMonths.map((m: any, i: number) => {
                const mStart = startOfMonth(m);
                const actualStart = mStart < minDate ? minDate : mStart;
                const mEnd = endOfMonth(m);
                const expectedEnd = mEnd > addDays(minDate, totalDays) ? addDays(minDate, totalDays) : mEnd;
                const actualDays = differenceInDays(expectedEnd, actualStart) + 1;
                return <div key={'grid-'+m.toISOString()} className="shrink-0 border-r border-gray-100/50" style={{ width: `${actualDays * pixelsPerDay}px` }} />;
              })}
            </div>
            <div className="relative pt-0 z-20">
              {localTasks.map((task, idx) => {
                const dates = tempDates[task.id] || { startDate: task.startDate, endDate: task.endDate };
                if (!dates.startDate || !dates.endDate) return <div key={task.id} className="h-16 border-b border-gray-200 bg-white/50" />;
                const start = ensureDate(dates.startDate);
                const end = ensureDate(dates.endDate);
                const left = (differenceInDays(start, minDate) / (totalDays || 1)) * 100;
                const width = Math.max(0.5, ((differenceInDays(end, start) + 1) / (totalDays || 1)) * 100);
                return (
                  <div key={task.id} className="h-16 relative border-b border-gray-200 bg-transparent flex items-center">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-8 rounded-full shadow-sm flex items-center transition-all bg-blue-100 border border-blue-200/50 group/bar hover:shadow-md"
                      style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px' }}
                    >
                      <div className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize z-20" onMouseDown={(e) => { e.stopPropagation(); setTimelineInteraction({ taskId: task.id, type: 'resize-start', startX: e.clientX, initialStart: start, initialEnd: end }); }} />
                      <div className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize z-20" onMouseDown={(e) => { e.stopPropagation(); setTimelineInteraction({ taskId: task.id, type: 'resize-end', startX: e.clientX, initialStart: start, initialEnd: end }); }} />
                      <div className="flex-1 h-full px-3 flex items-center min-w-0 cursor-grab active:cursor-grabbing overflow-hidden" onMouseDown={(e) => setTimelineInteraction({ taskId: task.id, type: 'move', startX: e.clientX, initialStart: start, initialEnd: end })}>
                        <span className="text-[10px] font-black text-blue-700 truncate uppercase tracking-tighter">{task.title}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {todayLeft >= 0 && todayLeft <= 100 && (
              <div className="absolute top-0 bottom-0 z-20 border-l-2 border-red-500 border-dashed pointer-events-none" style={{ left: `${todayLeft}%` }}>
                <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm absolute -top-0 -translate-x-1/2 shadow-sm">TODAY</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
