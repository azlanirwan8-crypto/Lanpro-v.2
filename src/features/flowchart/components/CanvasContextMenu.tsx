import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Plus, Square, Diamond, Circle, StickyNote, CreditCard, 
  FileText, Database, ZoomIn, ZoomOut, RotateCcw, Undo, Redo, Trash2, MapPin
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddNode: (type: string, label: string, color: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddNode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep menu on screen bounds
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 440);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("keydown", handleKeyDown);
    
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const shapeCategories = [
    { type: "oval", label: "Mulai / Selesai", icon: Circle, color: "emerald", text: "Start/End" },
    { type: "rect", label: "Langkah Proses", icon: Square, color: "indigo", text: "Proses" },
    { type: "diamond", label: "Keputusan Alur", icon: Diamond, color: "amber", text: "Keputusan" },
    { type: "sticky", label: "Catatan Tempel", icon: StickyNote, color: "yellow", text: "Memo/Sticky" },
    { type: "card", label: "Kartu Informasi", icon: CreditCard, color: "slate", text: "Kartu" },
    { type: "document", label: "Dokumen Cetak", icon: FileText, color: "sky", text: "Dokumen" },
    { type: "database", label: "Basis Data", icon: Database, color: "violet", text: "Database" },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      className="fixed z-50 w-56 bg-white/95 backdrop-blur-md border border-slate-200/55 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.15)] p-1.5 select-none text-slate-800"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Title */}
      <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
        <span>Aksi Kanvas</span>
        <span className="text-indigo-600 font-mono text-[8px] flex items-center gap-0.5">
          <MapPin className="w-2 h-2 text-indigo-400" />
          KANVAS AKTIF
        </span>
      </div>

      {/* Shapes Subheader */}
      <div className="px-3 py-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-450 text-slate-400">
        <Plus className="w-3 h-3 text-slate-400" />
        <span>Tambah Komponen Baru</span>
      </div>

      {/* Shapes List */}
      <div className="space-y-0.5 max-h-[180px] overflow-y-auto custom-scrollbar my-1 p-0.5 bg-slate-50/50 rounded-xl border border-slate-100">
        {shapeCategories.map((shape) => {
          const Icon = shape.icon;
          return (
            <button
              key={shape.type}
              onClick={() => {
                onAddNode(shape.type, shape.label, shape.color);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-650 hover:text-indigo-600 hover:bg-white hover:shadow-sm hover:border-slate-150 transition-all text-left border border-transparent"
            >
              <Icon className={cn("w-3.5 h-3.5 text-slate-400", `text-${shape.color}-500`)} />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-700 hover:text-indigo-600">{shape.text}</span>
                <span className="text-[9px] text-slate-400 font-normal">{shape.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-slate-150/70 my-1" />

      {/* Canvas Zoom Section */}
      <div className="grid grid-cols-3 gap-1 px-1.5 my-1">
        <button
          onClick={() => {
            onZoomIn();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-[9px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
          title="Perbesar Tampilan (+10%)"
        >
          <ZoomIn className="w-3.5 h-3.5 text-slate-450 text-slate-500" />
          <span>Zoom In</span>
        </button>
        <button
          onClick={() => {
            onZoomOut();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-[9px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
          title="Perkecil Tampilan (-10%)"
        >
          <ZoomOut className="w-3.5 h-3.5 text-slate-450 text-slate-500" />
          <span>Zoom Out</span>
        </button>
        <button
          onClick={() => {
            onResetZoom();
            onClose();
          }}
          className="flex flex-col items-center gap-1 p-1.5 rounded-lg text-[9px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
          title="Fokus Ulang Kanvas (100%)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-450 text-slate-500" />
          <span>Reset</span>
        </button>
      </div>

      <div className="h-px bg-slate-150/70 my-1" />

      {/* Undo / Redo Row */}
      <div className="flex gap-1 px-1 my-1">
        <button
          onClick={() => {
            onUndo();
            onClose();
          }}
          disabled={!canUndo}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
            canUndo 
              ? "text-slate-650 hover:bg-slate-50 hover:text-violet-600 border-slate-100/80 cursor-pointer" 
              : "text-slate-300 border-transparent cursor-not-allowed"
          )}
        >
          <Undo className="w-3 h-3" />
          <span>Undo</span>
        </button>

        <button
          onClick={() => {
            onRedo();
            onClose();
          }}
          disabled={!canRedo}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
            canRedo 
              ? "text-slate-650 hover:bg-slate-50 hover:text-violet-600 border-slate-100/80 cursor-pointer" 
              : "text-slate-300 border-transparent cursor-not-allowed"
          )}
        >
          <Redo className="w-3 h-3" />
          <span>Redo</span>
        </button>
      </div>

      <div className="h-px bg-slate-150/70 my-1" />

      {/* Clear Workspace button */}
      <button
        onClick={() => {
          onClear();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 transition-colors text-left"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        <span>Bersihkan Kanvas</span>
      </button>
    </motion.div>
  );
};
