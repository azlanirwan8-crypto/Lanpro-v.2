import React, { useState, useEffect, useRef } from 'react';
import { Task, Project } from '../../types';
import { format, startOfMonth, startOfWeek, endOfMonth, endOfWeek, addDays, differenceInDays, startOfYear, endOfYear } from 'date-fns';
import { ensureDate, cn } from '../../lib/utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, ChevronDown, ChevronRight, FileText, Image as ImageIcon, Plus, Minus, Zap, CornerDownRight, ListTodo, Target, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TimelineProps {
  tasks: Task[];
  selectedProject: Project | null;
  updateTaskField: (taskId: string, field: string, value: any) => Promise<void>;
  setSelectedTaskForDetail: (task: Task) => void;
  setIsTaskDetailModalOpen: (open: boolean) => void;
}

// Provide default helpers for mapping status and priorities to Tailwind colors
const getStatusColors = (status: string = '', isEpic: boolean) => {
  if (isEpic) {
    return {
      bg: "bg-gradient-to-r from-purple-100 to-purple-50/50",
      border: "border-purple-200 hover:border-purple-300",
      text: "text-purple-900",
      activeBg: "bg-purple-950 ring-2 ring-purple-400 border-purple-800",
      handle: "hover:bg-purple-600/15 active:bg-purple-600/25 group/l-handle",
      handleBar: "bg-purple-400/80 border-purple-400/20 group-hover/l-handle:bg-purple-600",
      handleR: "hover:bg-purple-600/15 active:bg-purple-600/25 group/r-handle",
      handleBarR: "bg-purple-400/80 border-purple-400/20 group-hover/r-handle:bg-purple-600",
      tooltipText: "text-purple-300",
      tooltipBadge: "bg-purple-500/30 text-purple-200"
    };
  }

  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('complete')) {
    return {
      bg: "bg-gradient-to-r from-emerald-50 to-white",
      border: "border-emerald-200/80 hover:border-emerald-300",
      text: "text-emerald-900",
      activeBg: "bg-emerald-950 ring-2 ring-emerald-400 border-emerald-800",
      handle: "hover:bg-emerald-600/15 active:bg-emerald-600/25 group/l-handle",
      handleBar: "bg-emerald-400/80 border-emerald-400/20 group-hover/l-handle:bg-emerald-600",
      handleR: "hover:bg-emerald-600/15 active:bg-emerald-600/25 group/r-handle",
      handleBarR: "bg-emerald-400/80 border-emerald-400/20 group-hover/r-handle:bg-emerald-600",
      tooltipText: "text-emerald-300",
      tooltipBadge: "bg-emerald-500/30 text-emerald-200"
    };
  }
  if (s.includes('progress') || s.includes('active') || s.includes('review') || s.includes('uat')) {
    return {
      bg: "bg-gradient-to-r from-indigo-50 to-white",
      border: "border-indigo-200/80 hover:border-indigo-300",
      text: "text-indigo-900",
      activeBg: "bg-indigo-950 ring-2 ring-indigo-400 border-indigo-800",
      handle: "hover:bg-indigo-600/15 active:bg-indigo-600/25 group/l-handle",
      handleBar: "bg-indigo-400/80 border-indigo-400/20 group-hover/l-handle:bg-indigo-600",
      handleR: "hover:bg-indigo-600/15 active:bg-indigo-600/25 group/r-handle",
      handleBarR: "bg-indigo-400/80 border-indigo-400/20 group-hover/r-handle:bg-indigo-600",
      tooltipText: "text-indigo-300",
      tooltipBadge: "bg-indigo-500/30 text-indigo-200"
    };
  }
  
  // Default (To Do / Backlog)
  return {
    bg: "bg-gradient-to-r from-slate-50 to-white",
    border: "border-slate-200/80 hover:border-slate-300",
    text: "text-slate-900",
    activeBg: "bg-slate-950 ring-2 ring-slate-400 border-slate-800",
    handle: "hover:bg-slate-600/15 active:bg-slate-600/25 group/l-handle",
    handleBar: "bg-slate-400/80 border-slate-400/20 group-hover/l-handle:bg-slate-600",
    handleR: "hover:bg-slate-600/15 active:bg-slate-600/25 group/r-handle",
    handleBarR: "bg-slate-400/80 border-slate-400/20 group-hover/r-handle:bg-slate-600",
    tooltipText: "text-slate-300",
    tooltipBadge: "bg-slate-500/30 text-slate-200"
  };
};

const getPriorityColor = (priority: string = '') => {
  const p = priority.toLowerCase();
  if (p.includes('p0') || p.includes('urgent') || p.includes('blocker') || p.includes('highest')) return "border-l-rose-500 shadow-rose-900/5";
  if (p.includes('p1') || p.includes('high')) return "border-l-orange-500 shadow-orange-900/5";
  if (p.includes('p2') || p.includes('medium')) return "border-l-amber-400 shadow-amber-900/5";
  if (p.includes('p3') || p.includes('low')) return "border-l-blue-400 shadow-blue-900/5";
  // Default
  return "border-l-slate-400 shadow-slate-900/5";
}

export const TimelinePanel: React.FC<TimelineProps> = ({
  tasks,
  selectedProject,
  updateTaskField,
  setSelectedTaskForDetail,
  setIsTaskDetailModalOpen,
}) => {
  const [pixelsPerDay, setPixelsPerDay] = useState<number>(24);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [timelineInteraction, setTimelineInteraction] = useState<{
    taskId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStart: Date;
    initialEnd: Date;
  } | null>(null);
  const [tempDates, setTempDates] = useState<Record<string, { startDate: string; endDate: string }>>({});
  
  // Backlog and epic hierarchy expansion state: default to expanded (true)
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});

  const toggleEpic = (epicId: string) => {
    setExpandedEpics(prev => ({
      ...prev,
      [epicId]: prev[epicId] === false ? true : false
    }));
  };

  // Build a highly-scannable, vertically synchronized parent-child presentation list
  const renderedRows = React.useMemo(() => {
    const list: Array<{
      task: Task;
      isChild: boolean;
      depth: number;
      parentId?: string;
      isLastChild?: boolean;
    }> = [];

    // Find top-level parents (tasks of type Epic, or tasks with no parent, or tasks whose parent is not loaded)
    const topLevels = tasks.filter(t => !t.parentId || !tasks.some(p => p.id === t.parentId));

    // Put Epics first, then others, sorting to keep structure nice
    const sortedTopLevels = [...topLevels].sort((a, b) => {
      const aIsEpic = (a.type || '').toLowerCase() === 'epic';
      const bIsEpic = (b.type || '').toLowerCase() === 'epic';
      if (aIsEpic && !bIsEpic) return -1;
      if (!aIsEpic && bIsEpic) return 1;
      return 0;
    });

    sortedTopLevels.forEach(task => {
      list.push({ task, isChild: false, depth: 0, isLastChild: false });
      
      const children = tasks.filter(t => t.parentId === task.id);
      if (children.length > 0) {
        // Epics are expanded by default unless explicitly clicked to collapse
        const isCollapsed = expandedEpics[task.id] === false;
        if (!isCollapsed) {
          const addChildren = (currentChildren: Task[], currentDepth: number) => {
             currentChildren.forEach((child, idx) => {
                const isLastChild = idx === currentChildren.length - 1;
                list.push({
                   task: child,
                   isChild: true,
                   depth: currentDepth,
                   parentId: child.parentId,
                   isLastChild
                });
                
                // Add grand-children if any, keeping them visually grouped under this child
                // Note: we can use the same expandedEpics state to let users collapse ANY parent if we want,
                // but for now we follow the same collapse state as before
                const grandChildren = tasks.filter(t => t.parentId === child.id);
                if (grandChildren.length > 0 && expandedEpics[child.id] !== false) {
                   addChildren(grandChildren, currentDepth + 1);
                }
             });
          };
          addChildren(children, 1);
        }
      }
    });

    return list;
  }, [tasks, expandedEpics]);
  
  const [isDraggingToPan, setIsDraggingToPan] = useState(false);
  const dragPanStartRef = useRef({ x: 0, scrollLeft: 0 });
  const touchStartRef = useRef<{
    x1: number;
    y1: number;
    x2: number | null;
    y2: number | null;
    initialDist: number | null;
    initialPixelsPerDay: number;
    initialScrollLeft: number;
  } | null>(null);

  const timelineListRef = useRef<HTMLDivElement>(null);
  const timelineMainRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const timelineZoom = pixelsPerDay >= 45 ? 'days' : pixelsPerDay >= 15 ? 'weeks' : 'months';

  // --- MOUSE HOVER/DRAG PANNING ---
  const handleDragPanMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left mouse button (0)
    if (e.button !== 0) return;
    
    // Do not initiate drag pan if clicking on a task bar or resize handle or other interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('.cursor-grab') || 
      target.closest('.cursor-ew-resize') || 
      target.closest('button') || 
      target.closest('a') ||
      target.closest('input')
    ) {
      return;
    }

    setIsDraggingToPan(true);
    dragPanStartRef.current = {
      x: e.clientX,
      scrollLeft: timelineMainRef.current ? timelineMainRef.current.scrollLeft : 0
    };
  };

  useEffect(() => {
    if (!isDraggingToPan) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (timelineMainRef.current) {
        const dx = e.clientX - dragPanStartRef.current.x;
        timelineMainRef.current.scrollLeft = dragPanStartRef.current.scrollLeft - dx;
      }
    };

    const handleMouseUp = () => {
      setIsDraggingToPan(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingToPan]);

  // --- CONTROLS: WHEEL ZOOM AND TOUCH GESTURES (PAN & PINCH) ---
  useEffect(() => {
    const mainEl = timelineMainRef.current;
    if (!mainEl) return;

    // --- MOUSE WHEEL ZOOM ---
    const handleWheel = (e: WheelEvent) => {
      // Zoom on wheel ONLY when Ctrl key is pressed (standard trackpad pinch or Ctrl + mouse wheel)
      if (e.ctrlKey) {
        e.preventDefault();
        
        const rect = mainEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + mainEl.scrollLeft;
        const dayOffset = mouseX / pixelsPerDay;

        const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        let newPixelsPerDay = pixelsPerDay * zoomFactor;
        newPixelsPerDay = Math.max(4, Math.min(150, newPixelsPerDay));

        setPixelsPerDay(newPixelsPerDay);
        
        const newScrollLeft = dayOffset * newPixelsPerDay - (e.clientX - rect.left);
        mainEl.scrollLeft = newScrollLeft;
      }
    };

    // --- TOUCH PAN AND PINCH ZOOM ---
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x1: e.touches[0].clientX,
          y1: e.touches[0].clientY,
          x2: null,
          y2: null,
          initialDist: null,
          initialPixelsPerDay: pixelsPerDay,
          initialScrollLeft: mainEl.scrollLeft,
        };
      } else if (e.touches.length === 2) {
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;
        const dist = Math.hypot(x2 - x1, y2 - y1);

        touchStartRef.current = {
          x1,
          y1,
          x2,
          y2,
          initialDist: dist,
          initialPixelsPerDay: pixelsPerDay,
          initialScrollLeft: mainEl.scrollLeft,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;

      if (e.touches.length === 1 && start.initialDist === null) {
        // Horizontal pan with single finger
        const dx = e.touches[0].clientX - start.x1;
        const dy = e.touches[0].clientY - start.y1;
        
        // Block page vertically-dominant scroll if horizontal dragging is clear
        if (Math.abs(dx) > Math.abs(dy)) {
          e.preventDefault();
          mainEl.scrollLeft = start.initialScrollLeft - dx;
        }
      } else if (e.touches.length === 2 && start.initialDist !== null) {
        // Pinch-to-zoom with two fingers
        e.preventDefault();
        const x1 = e.touches[0].clientX;
        const y1 = e.touches[0].clientY;
        const x2 = e.touches[1].clientX;
        const y2 = e.touches[1].clientY;
        const dist = Math.hypot(x2 - x1, y2 - y1);

        const zoomFactor = dist / start.initialDist;
        let newPixelsPerDay = start.initialPixelsPerDay * zoomFactor;
        newPixelsPerDay = Math.max(4, Math.min(150, newPixelsPerDay));

        // Center of user's fingers relative to viewport
        const rect = mainEl.getBoundingClientRect();
        const midX = (x1 + x2) / 2 - rect.left;
        const midXInContent = midX + start.initialScrollLeft;
        const dayOffset = midXInContent / start.initialPixelsPerDay;

        setPixelsPerDay(newPixelsPerDay);
        
        const newScrollLeft = dayOffset * newPixelsPerDay - midX;
        mainEl.scrollLeft = newScrollLeft;
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    mainEl.addEventListener('wheel', handleWheel, { passive: false });
    mainEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    mainEl.addEventListener('touchend', handleTouchEnd);

    return () => {
      mainEl.removeEventListener('wheel', handleWheel);
      mainEl.removeEventListener('touchstart', handleTouchStart);
      mainEl.removeEventListener('touchmove', handleTouchMove);
      mainEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pixelsPerDay]);

  const handleTimelineVerticalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (timelineListRef.current && target === timelineMainRef.current) {
      timelineListRef.current.scrollTop = target.scrollTop;
    } else if (timelineMainRef.current && target === timelineListRef.current) {
      timelineMainRef.current.scrollTop = target.scrollTop;
    }
  };

  const exportTimelineToPng = async () => {
    if (!timelineContainerRef.current) return;
    const toastId = toast.loading('Memproses export PNG...');
    try {
      const canvas = await html2canvas(timelineContainerRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `Roadmap_${selectedProject?.key || 'Export'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Successfully exported to PNG', { id: toastId });
    } catch(err) {
      console.error(err);
      toast.error('Failed to export PNG', { id: toastId });
    }
  };

  const exportTimelineToPdf = async () => {
    if (!timelineContainerRef.current) {
      toast.error('Elemen bagan Gantt tidak ditemukan.');
      return;
    }

    const toastId = toast.loading('Sedang menghasilkan laporan PDF eksekutif...');

    try {
      // First, render the Gantt chart to canvas so we have it ready
      const canvas = await html2canvas(timelineContainerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      // Create PDF in Portrait by default
      const doc = new jsPDF('p', 'mm', 'a4');

      const colors = {
        primary: [15, 23, 42],      // Slate-900 (Elegant Charcoal-slate)
        accent: [79, 70, 229],      // Indigo-600
        secondary: [99, 102, 241],   // Indigo-500
        done: [16, 185, 129],       // Emerald-500
        progress: [59, 130, 246],   // Blue-500
        todo: [100, 116, 139],      // Slate-500
        priorityHigh: [239, 68, 68],// Rose-500
        neutralBg: [248, 250, 252], // Slate-50
        border: [226, 232, 240],    // Slate-200
        text: [51, 65, 85],         // Slate-700
        textDark: [15, 23, 42],     // Slate-900
        white: [255, 255, 255]
      };

      const drawHeaderBanner = (titleText: string, subtitleText: string) => {
        // Slate shadow or primary cover
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, 210, 32, 'F');
        
        // Accent color strip at bottom
        doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.rect(0, 32, 210, 1.5, 'F');

        // White elegant metadata text over banner
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(titleText, 12, 16);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(200, 210, 230);
        doc.text(subtitleText, 12, 24);
      };

      // ==========================================
      // PAGE 1: PORTRAIT - EXECUTIVE DASHBOARD
      // ==========================================
      drawHeaderBanner(
        'LAPORAN PROYEK EKSEKUTIF & ROADMAP',
        `PROYEK: ${selectedProject?.name ? selectedProject.name.toUpperCase() : 'SEMUA PROYEK'}  |  LEVEL: LAPORAN EKSEKUTIF`
      );

      // Report Header info
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Dibuat pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 12, 43);
      doc.text(`Kode Proyek: ${selectedProject?.key || 'N/A'}`, 12, 48);
      
      const scheduledTasksCount = tasks.filter(t => t.startDate && t.endDate).length;
      doc.text(`Cakupan Jadwal: ${scheduledTasksCount} dari ${tasks.length} tugas direncanakan (${tasks.length > 0 ? Math.round((scheduledTasksCount / tasks.length) * 100) : 0}%)`, 120, 43);

      // Divider
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.line(10, 52, 200, 52);

      // 4 Tile Metrics Widgets
      const tileWidth = 43;
      const tileHeight = 24;
      const tileSpacing = 5;
      const startX = 11;
      const startY = 58;

      const totalTasks = tasks.length;
      const doneTasks = tasks.filter(t => t.status === 'Done').length;
      const progressTasks = tasks.filter(t => t.status === 'In Progress').length;
      const unscheduledTasks = tasks.filter(t => !t.startDate || !t.endDate).length;

      const metrics = [
        { label: 'TOTAL TUGAS', value: `${totalTasks}`, desc: 'Elemen backlog', color: colors.primary },
        { label: 'SELESAI', value: `${doneTasks}`, desc: 'Selesai & diverifikasi', color: colors.done },
        { label: 'DALAM PROSES', value: `${progressTasks}`, desc: 'Sedang dikerjakan', color: colors.progress },
        { label: 'BELUM TERPLOT', value: `${unscheduledTasks}`, desc: 'Tanpa tanggal/jadwal', color: colors.todo }
      ];

      metrics.forEach((m, idx) => {
        const x = startX + idx * (tileWidth + tileSpacing);
        // Draw tile background
        doc.setFillColor(colors.neutralBg[0], colors.neutralBg[1], colors.neutralBg[2]);
        doc.roundedRect(x, startY, tileWidth, tileHeight, 2, 2, 'F');
        // Border
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.roundedRect(x, startY, tileWidth, tileHeight, 2, 2, 'S');

        // Draw top accent bar
        doc.setFillColor(m.color[0], m.color[1], m.color[2]);
        doc.rect(x + 1.5, startY + 1.5, tileWidth - 3, 1.5, 'F');

        // Text labels inside tiles
        doc.setFontSize(7.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(120, 130, 140);
        doc.text(m.label, x + 4, startY + 7);

        doc.setFontSize(14);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        doc.text(m.value, x + 4, startY + 15);

        doc.setFontSize(6.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(140, 150, 160);
        doc.text(m.desc, x + 4, startY + 20);
      });

      // Progress bar section
      const progressY = startY + tileHeight + 8;
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text('PROGRES IMPLEMENTASI PROYEK', 12, progressY);

      const completeRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      doc.setFontSize(9.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
      doc.text(`${completeRate}% SELESAI`, 172, progressY);

      // Bar container
      doc.setFillColor(235, 240, 245);
      doc.roundedRect(12, progressY + 3, 186, 3.5, 1, 1, 'F');
      // Completed bar
      if (completeRate > 0) {
        doc.setFillColor(colors.done[0], colors.done[1], colors.done[2]);
        doc.roundedRect(12, progressY + 3, (186 * completeRate) / 100, 3.5, 1, 1, 'F');
      }

      // Executive Brief Narrative
      const narrativeY = progressY + 14;
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text('RINGKASAN EKSEKUTIF', 12, narrativeY);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 120);
      
      const notesLine1 = `Ikhtisar status pengiriman ini mewakili batas kinerja aktif dan matriks penjadwalan untuk proyek "${selectedProject?.name || 'N/A'}".`;
      const notesLine2 = `Roadmap pengembangan mencakup ${totalTasks} elemen pekerjaan yang ditentukan, mewakili hasil kerja strategis yang selaras dengan prioritas bisnis saat ini.`;
      const notesLine3 = `Blok prioritas tinggi, milis milestone kritis, dan batas waktu divisualisasikan pada bagan Gantt yang dilampirkan pada Halaman 2, dengan rincian backlog lengkap dijadwalkan pada direktori Halaman 3.`;
      
      doc.text(notesLine1, 12, narrativeY + 5);
      doc.text(notesLine2, 12, narrativeY + 9);
      doc.text(notesLine3, 12, narrativeY + 13);

      // Brief summary list of priorities on frontpage
      const summaryTableY = narrativeY + 22;
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text('IKHTISAR EPIC MILESTONE', 12, summaryTableY);

      // Simple Table Headers
      doc.setFillColor(241, 245, 249);
      doc.rect(12, summaryTableY + 3, 186, 7.5, 'F');
      doc.setDrawColor(218, 226, 233);
      doc.rect(12, summaryTableY + 3, 186, 7.5, 'S');

      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('KUNCI EPIC', 16, summaryTableY + 8);
      doc.text('JUDUL', 38, summaryTableY + 8);
      doc.text('STATUS', 115, summaryTableY + 8);
      doc.text('FOKUS LINIMASA', 145, summaryTableY + 8);

      // Render up to 7 Epics on the frontpage
      const epics = tasks.filter(t => (t.type || '').toLowerCase() === 'epic');
      let epicRowY = summaryTableY + 10.5;
      
      epics.slice(0, 8).forEach((epic, idx) => {
        const currentY = epicRowY + idx * 8.5;
        // Alternating background
        if (idx % 2 === 1) {
          doc.setFillColor(250, 252, 254);
          doc.rect(12, currentY, 186, 8.5, 'F');
        }
        doc.setDrawColor(235, 241, 246);
        doc.line(12, currentY + 8.5, 198, currentY + 8.5);

        doc.setFontSize(8);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.text(epic.key || '-', 16, currentY + 5.5);

        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        // Clip epic title if too long
        const epicTitle = epic.title.length > 42 ? epic.title.slice(0, 42) + '...' : epic.title;
        doc.text(epicTitle, 38, currentY + 5.5);

        // Status Badge text
        const stat = epic.status || 'To Do';
        let displayStatus = stat;
        if (stat === 'Done') {
          displayStatus = 'Selesai';
          doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
        } else if (stat === 'In Progress') {
          displayStatus = 'Sedang Berjalan';
          doc.setTextColor(colors.progress[0], colors.progress[1], colors.progress[2]);
        } else {
          displayStatus = 'Rencana / Backlog';
          doc.setTextColor(colors.todo[0], colors.todo[1], colors.todo[2]);
        }
        
        doc.text(displayStatus.toUpperCase(), 115, currentY + 5.5);

        // Schedule dates text
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(110, 120, 130);
        const datesString = epic.startDate && epic.endDate 
          ? `${format(ensureDate(epic.startDate), 'dd MMM yyyy')} - ${format(ensureDate(epic.endDate), 'dd MMM yyyy')}`
          : 'TBD (Belum Terplot)';
        doc.text(datesString, 145, currentY + 5.5);
      });

      if (epics.length === 0) {
        doc.setFontSize(8.5);
        doc.setFont('Helvetica', 'italic');
        doc.setTextColor(140, 140, 140);
        doc.text('Belum ada struktur epic utama yang dipetakan di dalam timeline saat ini.', 20, epicRowY + 10);
      }

      // Add Footer on Page 1
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(160, 170, 180);
      doc.text('Laporan Eksekutif  |  Halaman 1 dari 3', 12, 287);
      doc.text('RAHASIA - HANYA UNTUK KEGUNAAN KOMITE PENGARAH INTERNAL', 105, 287, { align: 'center' });

      // ==========================================
      // PAGE 2: LANDSCAPE - VISUAL GANTT CHART
      // ==========================================
      doc.addPage('a4', 'l');

      // Draw landscape header strip
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, 297, 20, 'F');
      
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.rect(0, 20, 297, 1.2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('REPRESENTASI VISUAL ROADMAP & BAGAN GANTT OTOMATIS', 12, 11.5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(210, 220, 235);
      doc.text('MILESTONE REAL-TIME & TANGKAPAN KOMPONEN INTERAKTIF AKTIF', 12, 16.5);

      // Add captured roadmap image onto Page 2
      // Canvas dimensions scaling to landscape page
      const landscapeWidth = 273; // 297 - 24 (margins)
      const landscapeHeight = 155; // 210 - 55 (header margins)
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const hScale = landscapeWidth / canvasWidth;
      const vScale = landscapeHeight / canvasHeight;
      const scale = Math.min(hScale, vScale);

      const drawWidth = canvasWidth * scale;
      const drawHeight = canvasHeight * scale;
      
      // Center Gantt chart on Page 2
      const drawX = 12 + (landscapeWidth - drawWidth) / 2;
      const drawY = 27 + (landscapeHeight - drawHeight) / 2;

      // Draw shadow border frame around chart container
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.4);
      doc.rect(drawX - 1.5, drawY - 1.5, drawWidth + 3, drawHeight + 3, 'S');

      // Draw the beautiful capture image
      doc.addImage(imgData, 'PNG', drawX, drawY, drawWidth, drawHeight);

      // Legend or Instructions block
      const legendY = 190;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(12, legendY, 273, 10, 1.5, 1.5, 'F');
      // Border
      doc.setDrawColor(230, 235, 240);
      doc.roundedRect(12, legendY, 273, 10, 1.5, 1.5, 'S');

      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(80, 90, 100);
      doc.text('LEGENDA BAGAN:  ', 16, legendY + 6.5);
      
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(40, legendY + 5, 4, 2.5, 'F');
      doc.setFont('Helvetica', 'normal');
      doc.text('Frame Backlog', 46, legendY + 7);

      doc.setFillColor(colors.done[0], colors.done[1], colors.done[2]);
      doc.rect(73, legendY + 5, 4, 2.5, 'F');
      doc.text('Selesai', 79, legendY + 7);

      doc.setFillColor(colors.progress[0], colors.progress[1], colors.progress[2]);
      doc.rect(106, legendY + 5, 4, 2.5, 'F');
      doc.text('Aktif / Dalam Proses', 112, legendY + 7);

      doc.setFillColor(colors.todo[0], colors.todo[1], colors.todo[2]);
      doc.rect(160, legendY + 5, 4, 2.5, 'F');
      doc.text('Belum Terplot / Backlog', 166, legendY + 7);

      doc.setFillColor(147, 51, 234); // Purple 600
      doc.rect(215, legendY + 5, 4, 2.5, 'F');
      doc.text('Blok Epic Utama', 221, legendY + 7);

      // Add Footer on Page 2
      doc.setTextColor(170, 180, 190);
      doc.setFontSize(7.5);
      doc.text('Laporan Eksekutif  |  Halaman 2 dari 3', 12, 204);
      doc.text('RAHASIA - HANYA UNTUK KEGUNAAN KOMITE PENGARAH INTERNAL', 148, 204, { align: 'center' });


      // ==========================================
      // PAGE 3: PORTRAIT - DETAILED TASK SCHEDULE
      // ==========================================
      doc.addPage('a4', 'p');

      // Draw third page header strip
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.rect(0, 20, 210, 1.2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('JADWAL PENGIRIMAN TUGAS KOMPREHENSIF', 12, 11);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(200, 210, 230);
      doc.text('ALUR WAKTU TUGAS YANG SELARAS DAN ARSIP ROADMAP KOMPREHENSIF', 12, 15.5);

      // Column Headers for Detailed tasks table
      let tableY = 28;
      doc.setFillColor(241, 245, 249);
      doc.rect(12, tableY, 186, 8, 'F');
      doc.setDrawColor(218, 226, 233);
      doc.rect(12, tableY, 186, 8, 'S');

      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('KUNCI', 15, tableY + 5.5);
      doc.text('JUDUL RINGKASAN TUGAS', 35, tableY + 5.5);
      doc.text('TIPE', 104, tableY + 5.5);
      doc.text('STATUS', 122, tableY + 5.5);
      doc.text('PRIORITAS', 144, tableY + 5.5);
      doc.text('FOKUS LINIMASA', 165, tableY + 5.5);

      // Loop over and draw ALL renderedRows
      let itemRowY = tableY + 8;
      let totalPagesInDoc = 3;
      
      renderedRows.forEach((row, idx) => {
        const task = row.task;

        // Dynamic multi-page breaking logic if lists exceed single page limits
        if (itemRowY > 268) {
          // Footers
          doc.setFontSize(7.5);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(170, 180, 190);
          doc.text(`Laporan Eksekutif  |  Halaman ${totalPagesInDoc}`, 12, 287);
          doc.text('RAHASIA - HANYA UNTUK KEGUNAAN KOMITE PENGARAH INTERNAL', 105, 287, { align: 'center' });

          doc.addPage('a4', 'p');
          totalPagesInDoc += 1;

          // Header
          doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          doc.rect(0, 0, 210, 15, 'F');
          
          doc.setTextColor(255, 255, 255);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('JADWAL PENGIRIMAN TUGAS KOMPREHENSIF (LANJUTAN)', 12, 9.5);

          // Table header again
          tableY = 20;
          doc.setFillColor(241, 245, 249);
          doc.rect(12, tableY, 186, 8, 'F');
          doc.setDrawColor(218, 226, 233);
          doc.rect(12, tableY, 186, 8, 'S');

          doc.setFontSize(7.5);
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('KUNCI', 15, tableY + 5.5);
          doc.text('JUDUL RINGKASAN TUGAS', 35, tableY + 5.5);
          doc.text('TIPE', 104, tableY + 5.5);
          doc.text('STATUS', 122, tableY + 5.5);
          doc.text('PRIORITAS', 144, tableY + 5.5);
          doc.text('FOKUS LINIMASA', 165, tableY + 5.5);

          itemRowY = tableY + 8;
        }

        // Alternating background row stripes
        if (idx % 2 === 1) {
          doc.setFillColor(250, 252, 254);
          doc.rect(12, itemRowY, 186, 8.5, 'F');
        }
        doc.setDrawColor(238, 242, 245);
        doc.line(12, itemRowY + 8.5, 198, itemRowY + 8.5);

        // Task Key
        doc.setFontSize(7.5);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        doc.text(task.key, 15, itemRowY + 5.5);

        // Task Title - indented slightly if row is a nested child
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
        const titleIndent = row.isChild ? 41 : 35;
        if (row.isChild) {
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(100, 110, 120);
          doc.text('└─', 35, itemRowY + 5.5);
        } else {
          doc.setFont('Helvetica', 'bold');
        }

        // Shorten title to match printable width safely
        const allowedWidth = row.isChild ? 60 : 66;
        let shortTitle = task.title;
        if (shortTitle.length > allowedWidth) {
          shortTitle = shortTitle.slice(0, allowedWidth) + '...';
        }
        doc.text(shortTitle, titleIndent, itemRowY + 5.5);

        // Task Type
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(110, 120, 130);
        
        let typeLabel: string = task.type || 'task';
        if (typeLabel.toLowerCase() === 'epic') typeLabel = 'Epic';
        else if (typeLabel.toLowerCase() === 'story') typeLabel = 'Story';
        else if (typeLabel.toLowerCase() === 'bug') typeLabel = 'Bug';
        else if (typeLabel.toLowerCase() === 'task') typeLabel = 'Tugas';
        else if (typeLabel.toLowerCase() === 'subtask') typeLabel = 'Subtugas';

        doc.text(typeLabel.toUpperCase(), 104, itemRowY + 5.5);

        // Task Status
        const stat = task.status || 'To Do';
        let displayStatus = stat;
        if (stat === 'Done') {
          displayStatus = 'Selesai';
          doc.setTextColor(colors.done[0], colors.done[1], colors.done[2]);
        } else if (stat === 'In Progress') {
          displayStatus = 'Proses';
          doc.setTextColor(colors.progress[0], colors.progress[1], colors.progress[2]);
        } else {
          displayStatus = 'Rencana';
          doc.setTextColor(colors.todo[0], colors.todo[1], colors.todo[2]);
        }
        
        doc.setFont('Helvetica', 'bold');
        doc.text(displayStatus.toUpperCase(), 122, itemRowY + 5.5);

        // Priority Badge
        const priorityText = task.priority || 'Medium';
        let displayPriority = priorityText;
        if (priorityText === 'Urgent') displayPriority = 'Sangat Kritis';
        else if (priorityText === 'High') displayPriority = 'Tinggi';
        else if (priorityText === 'Medium') displayPriority = 'Sedang';
        else if (priorityText === 'Low') displayPriority = 'Rendah';

        if (priorityText === 'Urgent' || priorityText === 'P0' || priorityText === 'High' || priorityText === 'P1') {
          doc.setTextColor(colors.priorityHigh[0], colors.priorityHigh[1], colors.priorityHigh[2]);
        } else {
          doc.setTextColor(110, 120, 130);
        }
        doc.setFont('Helvetica', 'normal');
        doc.text(displayPriority, 144, itemRowY + 5.5);

        // Scheduled range
        doc.setTextColor(110, 120, 130);
        const dateRangeText = task.startDate && task.endDate 
          ? `${format(ensureDate(task.startDate), 'dd MMM yy')} - ${format(ensureDate(task.endDate), 'dd MMM yy')}`
          : 'TBD (Backlog)';
        doc.text(dateRangeText, 165, itemRowY + 5.5);

        itemRowY += 8.5;
      });

      // Add Final Page Footer for the last iteration
      doc.setFontSize(7.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(170, 180, 190);
      doc.text(`Laporan Eksekutif  |  Halaman ${totalPagesInDoc} dari ${totalPagesInDoc}`, 12, 287);
      doc.text('RAHASIA - HANYA UNTUK KEGUNAAN KOMITE PENGARAH INTERNAL', 105, 287, { align: 'center' });

      // Save the generated document
      doc.save(`Roadmap_Laporan_Eksekutif_${selectedProject?.key || 'Export'}.pdf`);
      toast.success('Berhasil mengekspor ringkasan PDF eksekutif!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses ekspor PDF.', { id: toastId });
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
        await updateTaskField(timelineInteraction.taskId, 'dates', {
          startDate: pending.startDate,
          endDate: pending.endDate
        });
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
  const today = new Date();
  let todayLeft = 0;
  if (today >= minDate) {
    todayLeft = (differenceInDays(today, minDate) / (totalDays || 1)) * 100;
  }

  const getEarliestTaskDate = () => {
    let earliest: Date | null = null;
    (tasks || []).forEach(task => {
      if (task.startDate) {
        const d = ensureDate(task.startDate);
        if (!earliest || d < earliest) {
          earliest = d;
        }
      }
    });
    return earliest || new Date();
  };

  const scrollToDate = (targetDate: Date, behavior: ScrollBehavior = 'smooth') => {
    if (!timelineMainRef.current) return;
    const daysFromStart = differenceInDays(targetDate, minDate);
    const scrollX = Math.max(0, daysFromStart * pixelsPerDay - 100);
    timelineMainRef.current.scrollTo({
      left: scrollX,
      behavior
    });
  };

  const hasAutoScrolledRef = useRef(false);
  useEffect(() => {
    if (!hasAutoScrolledRef.current && tasks && tasks.length > 0) {
      const earliest = getEarliestTaskDate();
      setTimeout(() => {
        scrollToDate(earliest, 'auto');
        hasAutoScrolledRef.current = true;
      }, 150);
    }
  }, [tasks, pixelsPerDay]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f3f3f9] p-4 md:p-5 gap-4 text-left">
      {/* Timeline Controls Header */}
      <div className="bg-white px-5 py-3.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Project Roadmap</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Visualisasi lini masa proyek, epics, dan ketergantungan tugas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-md border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                const earliest = getEarliestTaskDate();
                scrollToDate(earliest, 'smooth');
                toast.success("Berhasil fokus ke Task Pertama Aktif");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100/70 text-slate-700 rounded text-xs font-semibold shadow-2xs transition-all border border-slate-200/60"
              title="Focus First Task"
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Focus First Task</span>
            </button>
            <button
              type="button"
              onClick={() => {
                scrollToDate(new Date(), 'smooth');
                toast.success("Berhasil melompat ke garis hari ini (Today)");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-100/70 text-slate-700 rounded text-xs font-semibold shadow-2xs transition-all border border-slate-200/60"
              title="Jump to Today"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Today</span>
            </button>
          </div>


          <div className="flex bg-white rounded-md border border-slate-200/80 p-0.5 shadow-2xs items-center">
            <button
              type="button"
              onClick={() => setPixelsPerDay(prev => Math.max(4, prev - 4))}
              className="p-1 px-[7px] text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
              title="Zoom Out (Ctrl + Scroll Down)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            
            {(['days', 'weeks', 'months'] as const).map((z) => (
              <button 
                key={z} 
                type="button"
                onClick={() => {
                  if (z === 'days') setPixelsPerDay(60);
                  else if (z === 'weeks') setPixelsPerDay(24);
                  else if (z === 'months') setPixelsPerDay(8);
                }}
                className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded transition-all ${
                  timelineZoom === z 
                    ? 'bg-slate-100 text-slate-800 font-bold shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {z}
              </button>
            ))}

            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => setPixelsPerDay(prev => Math.min(150, prev + 4))}
              className="p-1 px-[7px] text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
              title="Zoom In (Ctrl + Scroll Up)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              onBlur={() => setTimeout(() => setIsExportMenuOpen(false), 200)}
              className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT AS</span> <ChevronDown className="w-3 h-3" />
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200/80 py-1 z-50">
                <button 
                  onClick={exportTimelineToPdf}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  PDF Document
                </button>
                <button 
                  onClick={exportTimelineToPng}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-700 flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  PNG Image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex min-h-0">
        <div ref={timelineContainerRef} className="print-roadmap-container flex flex-1 w-full relative bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden select-none">
          <div className="w-64 md:w-80 shrink-0 border-r border-slate-200/80 flex flex-col z-20 bg-white relative">
            <div className="sticky top-0 z-30 h-[73px] bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 px-5 flex items-center justify-between">
              <span className="font-bold text-[11px] text-slate-500 uppercase tracking-widest">Item & Hierarki</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10 pt-4 border-t border-slate-200" ref={timelineListRef} onScroll={handleTimelineVerticalScroll}>
              <AnimatePresence initial={false}>
                {renderedRows.map(({ task, isChild, depth, isLastChild }) => {
                  const hasChildren = tasks.some(t => t.parentId === task.id);
                  const expanded = expandedEpics[task.id] !== false;
                  const isEpic = (task.type || '').toLowerCase() === 'epic';

                  return (
                    <motion.div 
                      key={task.id}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 56, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className={cn(
                        "h-14 flex items-center gap-2 border-b border-slate-100 bg-white transition-colors relative z-10 overflow-hidden",
                        isChild 
                          ? "bg-slate-50/40 hover:bg-slate-50/80 pr-3" 
                          : isEpic
                            ? "bg-purple-50/10 hover:bg-purple-50/40 px-3"
                            : "hover:bg-slate-50 px-3"
                      )}
                      style={{
                        ...isChild ? { paddingLeft: `${14 + (depth * 20)}px` } : {},
                        willChange: "transform, opacity, height"
                      }}
                    >
                      {isChild && (
                        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 0, width: `${14 + (depth * 20)}px` }}>
                          {Array.from({ length: depth }).map((_, i) => {
                            const isCurrentDepth = i === depth - 1;
                            return (
                              <React.Fragment key={i}>
                                <div 
                                  className={cn(
                                    "absolute top-0 w-[2px] bg-slate-200/80",
                                    isCurrentDepth && isLastChild ? "h-7 rounded-bl-lg" : "h-full"
                                  )} 
                                  style={{ left: `${14 + (i * 20)}px` }}
                                />
                                {isCurrentDepth && (
                                  <div 
                                     className="absolute top-7 w-[20px] h-[2px] bg-slate-200/80 rounded-tr-lg" 
                                     style={{ left: `${14 + (i * 20)}px` }}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}

                      {/* Spacer/Chevron for Tree Hierarchy */}
                      {(hasChildren) ? (
                        <button
                          type="button"
                          onClick={() => toggleEpic(task.id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all shrink-0 active:scale-95 z-20 bg-inherit"
                        >
                          <ChevronRight 
                            className={cn(
                              "w-3.5 h-3.5 transform transition-transform duration-200 ease-in-out",
                              expanded ? "rotate-90 text-indigo-650" : "text-slate-400"
                            )} 
                          />
                        </button>
                      ) : (
                        // Spacer to align icons if there is no chevron trigger
                        <div className="w-[22px] shrink-0" />
                      )}

                      {/* Task type icon */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isEpic ? (
                          <div className="p-1 rounded-md bg-purple-50 text-purple-600 shadow-sm border border-purple-100">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-md bg-indigo-50 text-indigo-500 border border-indigo-100/40">
                            <ListTodo className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn(
                          "text-[11px] truncate leading-tight tracking-tight select-none",
                          isChild ? "font-semibold text-slate-600" : "font-black text-slate-900"
                        )}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedTaskForDetail(task); 
                              setIsTaskDetailModalOpen(true); 
                            }} 
                            className="text-[9px] font-black text-indigo-650 hover:text-indigo-800 hover:underline tracking-tight text-left uppercase"
                          >
                            {task.key}
                          </button>
                          <span className="text-[7px] text-slate-300">•</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider",
                            task.status === 'Done' ? "text-emerald-600" : task.status === 'In Progress' ? "text-blue-600" : "text-slate-500"
                          )}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
          <div 
            className={`flex-1 flex flex-col overflow-auto relative bg-[#fcfcfc] ${isDraggingToPan ? 'cursor-grabbing' : 'cursor-grab'}`} 
            ref={timelineMainRef} 
            onScroll={handleTimelineVerticalScroll}
            onMouseDown={handleDragPanMouseDown}
          >
            <motion.div 
              key={timelineZoom}
              initial={{ opacity: 0.3, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="min-w-max relative" 
              style={{ width: `${totalDays * pixelsPerDay}px`, minHeight: '100%', willChange: "transform, opacity" }}
            >
              <div className="sticky top-0 z-30 h-[73px] bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 shadow-sm box-border flex flex-col">
                <div className="flex h-8 border-b border-slate-200/50">
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
                  <div key={'grid-'+d.toISOString()} className={`shrink-0 border-r ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-100/40 border-slate-200/50' : 'border-gray-100/50'}`} style={{ width: `${pixelsPerDay}px` }} />
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
              <div className="relative pt-4 z-20 pb-10 border-t border-slate-200">
                <AnimatePresence initial={false}>
                  {renderedRows.map(({ task, isChild }) => {
                    const dates = tempDates[task.id] || { startDate: task.startDate, endDate: task.endDate };
                    if (!dates.startDate || !dates.endDate) {
                      return (
                        <motion.div 
                          key={task.id} 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 56, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="h-14 relative border-b border-gray-100 bg-transparent flex items-center group/row hover:bg-slate-50/50 transition-colors overflow-hidden"
                          style={{ willChange: "transform, opacity, height" }}
                        >
                          <motion.button
                            whileHover={{ 
                              scale: 1.04, 
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" 
                            }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            onClick={() => { setSelectedTaskForDetail(task); setIsTaskDetailModalOpen(true); }}
                            className="absolute left-6 h-8 px-4 rounded-xl flex items-center bg-slate-50/60 border border-slate-200 border-dashed hover:border-indigo-400 hover:bg-white group-hover/row:bg-white text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:shadow-sm transition-all cursor-pointer gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover/row:bg-indigo-500 animate-pulse transition-colors" />
                            Belum diplot. Klik untuk config.
                          </motion.button>
                        </motion.div>
                      );
                    }
                    const start = ensureDate(dates.startDate);
                    const end = ensureDate(dates.endDate);
                    const left = (differenceInDays(start, minDate) / (totalDays || 1)) * 100;
                    const width = Math.max(0.5, ((differenceInDays(end, start) + 1) / (totalDays || 1)) * 100);
                    const isEpic = (task.type || '').toLowerCase() === 'epic';

                    return (
                      <motion.div 
                        key={task.id} 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 56, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="h-14 relative border-b border-gray-100 bg-transparent flex items-center group/row hover:bg-slate-50/50 transition-colors overflow-hidden"
                        style={{ willChange: "transform, opacity, height" }}
                      >
                        <motion.div
                          whileHover={{ 
                            scale: 1.02, 
                            y: "-50%",
                            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
                          }}
                          transition={timelineInteraction?.taskId === task.id ? { type: "tween", duration: 0 } : { type: "spring", stiffness: 350, damping: 25 }}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm flex items-center border overflow-hidden",
                            getStatusColors(task.status, isEpic).bg,
                            getStatusColors(task.status, isEpic).border,
                            getStatusColors(task.status, isEpic).text,
                            getPriorityColor(task.priority),
                            !isEpic && "border-l-[3.5px]",
                            isEpic && "border-l-[3.5px]",
                            "group/bar",
                            timelineInteraction?.taskId === task.id ? cn("scale-[1.01] shadow-md z-30", getStatusColors(task.status, isEpic).activeBg) : "transition-all"
                          )}
                          style={{ left: `${left}%`, width: `${width}%`, minWidth: '24px', willChange: "transform, left, width" }}
                        >
                          {/* Dynamic Floating Tooltip */}
                          <div className={cn(
                            "absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl pointer-events-none z-50 flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 origin-bottom scale-90 opacity-0",
                            "group-hover/bar:opacity-100 group-hover/bar:scale-100",
                            timelineInteraction?.taskId === task.id ? "opacity-100 scale-100 ring-2" : ""
                          )}>
                            <span className={cn("font-bold", getStatusColors(task.status, isEpic).tooltipText)}>{format(start, 'dd MMM yyyy')}</span>
                            <span className="text-slate-400">→</span>
                            <span className={cn("font-bold", getStatusColors(task.status, isEpic).tooltipText)}>{format(end, 'dd MMM yyyy')}</span>
                            <span className={cn(
                              "font-bold px-1.5 py-0.5 rounded text-[9px] ml-1", 
                              getStatusColors(task.status, isEpic).tooltipBadge
                            )}>
                              {differenceInDays(end, start) + 1} hari
                            </span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                          </div>

                          {/* Visually Rich Left Resize Handle */}
                          <div 
                            className={cn(
                              "absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25",
                              "transition-colors",
                              getStatusColors(task.status, isEpic).handle
                            )}
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              setTimelineInteraction({ 
                                taskId: task.id, 
                                type: 'resize-start', 
                                startX: e.clientX, 
                                initialStart: start, 
                                initialEnd: end 
                              }); 
                            }}
                            title="Tarik ujung kiri untuk mengubah tanggal mulai"
                          >
                            <div className={cn(
                              "w-[3px] h-3.5 border-l border-r rounded-full transition-colors shadow-sm",
                              getStatusColors(task.status, isEpic).handleBar
                            )} />
                          </div>

                          {/* Drag and Move Row Area */}
                          <div 
                            className="flex-1 h-full px-4 flex items-center min-w-0 cursor-grab active:cursor-grabbing overflow-hidden" 
                            onMouseDown={(e) => {
                              // Only trigger move if clicked outside the resize handles
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              if (clickX > 12 && clickX < rect.width - 12) {
                                e.stopPropagation();
                                setTimelineInteraction({ 
                                  taskId: task.id, 
                                  type: 'move', 
                                  startX: e.clientX, 
                                  initialStart: start, 
                                  initialEnd: end 
                                });
                              }
                            }}
                          >
                            <span className={cn(
                              "text-[10.5px] font-bold truncate tracking-tight select-none pr-1",
                              getStatusColors(task.status, isEpic).text
                            )}>
                              {task.title}
                            </span>
                          </div>

                          {/* Visually Rich Right Resize Handle */}
                          <div 
                            className={cn(
                              "absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-ew-resize z-25 rounded-r-lg",
                              "transition-colors",
                              getStatusColors(task.status, isEpic).handleR
                            )}
                            onMouseDown={(e) => { 
                              e.stopPropagation(); 
                              setTimelineInteraction({ 
                                taskId: task.id, 
                                type: 'resize-end', 
                                startX: e.clientX, 
                                initialStart: start, 
                                initialEnd: end 
                              }); 
                            }}
                            title="Tarik ujung kanan untuk mengubah tanggal selesai"
                          >
                            <div className={cn(
                              "w-[3px] h-3.5 border-l border-r rounded-full transition-colors shadow-sm",
                              getStatusColors(task.status, isEpic).handleBarR
                            )} />
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              {todayLeft >= 0 && todayLeft <= 100 && (
                <div className="absolute top-0 bottom-0 z-20 border-l-2 border-red-500 border-dashed pointer-events-none" style={{ left: `${todayLeft}%` }}>
                  <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm absolute top-1 -translate-x-1/2 shadow-md flex items-center gap-1 z-30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>
                    TODAY
                  </div>
                  {/* Glowing pulsing indicator dot right below sticky header */}
                  <div className="absolute top-[73px] -translate-x-1/2 flex items-center justify-center w-4 h-4 z-30">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-sm"></span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
