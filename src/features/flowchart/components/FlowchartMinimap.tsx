import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, ChevronDown, ChevronUp, Compass, Move } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Using exact types from Flowchart editor for native compatibility
interface FlowNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  color?: string;
}

interface FlowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

interface FlowchartMinimapProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  panOffset: { x: number; y: number };
  zoomLevel: number;
  setPanOffset: (offset: { x: number; y: number }) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasTheme: 'miro' | 'blueprint';
}

export const FlowchartMinimap: React.FC<FlowchartMinimapProps> = ({
  nodes,
  edges,
  panOffset,
  zoomLevel,
  setPanOffset,
  canvasContainerRef,
  canvasTheme,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Canvas bounds as declared in the editor
  const CANVAS_WIDTH = 3500;
  const CANVAS_HEIGHT = 2800;

  // Minimap dimensions (5:4 aspect ratio to match 3500:2800)
  const MINIMAP_WIDTH = 180;
  const MINIMAP_HEIGHT = 144;

  const SCALE_X = MINIMAP_WIDTH / CANVAS_WIDTH;
  const SCALE_Y = MINIMAP_HEIGHT / CANVAS_HEIGHT;

  // Track container dimensions
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const updateSize = () => {
      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width || window.innerWidth,
          height: rect.height || window.innerHeight,
        });
      }
    };

    updateSize();

    // Setup ResizeObserver for precise container monitoring
    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(canvasContainerRef.current);

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [canvasContainerRef]);

  // Viewport calculation in canvas space
  // visible_left = -panOffset.x / zoomLevel
  // visible_top = -panOffset.y / zoomLevel
  // visible_width = containerWidth / zoomLevel
  // visible_height = containerHeight / zoomLevel
  const viewportX = -panOffset.x / zoomLevel;
  const viewportY = -panOffset.y / zoomLevel;
  const viewportW = containerSize.width / zoomLevel;
  const viewportH = containerSize.height / zoomLevel;

  // Scaled to minimap space
  const miniViewportX = Math.max(0, Math.min(MINIMAP_WIDTH, viewportX * SCALE_X));
  const miniViewportY = Math.max(0, Math.min(MINIMAP_HEIGHT, viewportY * SCALE_Y));
  const miniViewportW = Math.min(MINIMAP_WIDTH - miniViewportX, viewportW * SCALE_X);
  const miniViewportH = Math.min(MINIMAP_HEIGHT - miniViewportY, viewportH * SCALE_Y);

  // Handle click or drag interaction on the minimap
  const handleInteraction = (clientX: number, clientY: number) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    // Position inside the minimap box
    const mx = Math.max(0, Math.min(MINIMAP_WIDTH, clientX - rect.left));
    const my = Math.max(0, Math.min(MINIMAP_HEIGHT, clientY - rect.top));

    // Convert back to canvas coordinate space
    const canvasX = mx / SCALE_X;
    const canvasY = my / SCALE_Y;

    // Center the viewport on this clicked point
    const newPanX = containerSize.width / 2 - canvasX * zoomLevel;
    const newPanY = containerSize.height / 2 - canvasY * zoomLevel;

    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleInteraction(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoomLevel, containerSize]);

  // Color theme helpers
  const isMiro = canvasTheme === 'miro';

  return (
    <div className="absolute bottom-4 left-4 z-30 flex flex-col items-start select-none">
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={cn(
              "p-2 rounded-2xl border mb-2 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 relative overflow-hidden",
              isMiro 
                ? "bg-white/80 border-slate-200/40 backdrop-blur-md text-slate-800" 
                : "bg-slate-950/80 border-slate-880/60 backdrop-blur-md text-slate-100"
            )}
          >
            {/* Ambient Background Glow matching selected theme */}
            <div className={cn(
              "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-30",
              isMiro ? "bg-indigo-300" : "bg-blue-500"
            )} />

            {/* Minimap Inner Box Container */}
            <div
              ref={minimapRef}
              onMouseDown={handleMouseDown}
              style={{
                width: `${MINIMAP_WIDTH}px`,
                height: `${MINIMAP_HEIGHT}px`,
              }}
              className={cn(
                "relative rounded-xl overflow-hidden cursor-crosshair border transition-colors duration-300",
                isMiro 
                  ? "bg-slate-50/70 border-slate-200/50" 
                  : "bg-slate-900/50 border-slate-850"
              )}
            >
              {/* Grid Dots / Grid Mesh in Minimap */}
              <div 
                className="absolute inset-0 opacity-15 pointer-events-none" 
                style={{
                  backgroundImage: isMiro
                    ? 'radial-gradient(circle, #94a3b8 1px, transparent 1px)'
                    : 'linear-gradient(to right, #1e3a8a 1px, transparent 1px), linear-gradient(to bottom, #1e3a8a 1px, transparent 1px)',
                  backgroundSize: isMiro ? '8px 8px' : '12px 12px'
                }}
              />

              {/* Render Nodes as miniatures */}
              {nodes.map((node) => {
                const nodeWidth = node.width || 120;
                const nodeHeight = node.height || 60;
                const miniX = node.x * SCALE_X;
                const miniY = node.y * SCALE_Y;
                const miniW = nodeWidth * SCALE_X;
                const miniH = nodeHeight * SCALE_Y;

                // Color mapping for node types
                let bgClass = "bg-slate-400";
                if (node.type === 'start') bgClass = "bg-emerald-500";
                else if (node.type === 'end') bgClass = "bg-rose-500";
                else if (node.type === 'decision') bgClass = "bg-amber-500";
                else if (node.type === 'process') bgClass = "bg-indigo-500";
                else if (node.type === 'sticky') bgClass = "bg-yellow-450 bg-yellow-400";
                else if (node.type === 'card' || node.type === 'doc') bgClass = "bg-sky-500";

                return (
                  <div
                    key={node.id}
                    className={cn(
                      "absolute rounded-[2px] transition-all duration-300",
                      bgClass,
                      node.type === 'decision' ? "rotate-45" : ""
                    )}
                    style={{
                      left: `${miniX}px`,
                      top: `${miniY}px`,
                      width: `${Math.max(3, miniW)}px`,
                      height: `${Math.max(3, miniH)}px`,
                      opacity: 0.85,
                      boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)'
                    }}
                    title={node.label || 'Node'}
                  />
                );
              })}

              {/* Render Viewport Bounds Frame overlay */}
              <div
                className={cn(
                  "absolute border-[1.5px] rounded-md pointer-events-none transition-shadow duration-300",
                  isMiro 
                    ? "border-indigo-650 border-indigo-600 bg-indigo-500/10 shadow-[0_0_8px_rgba(99,102,241,0.2)]" 
                    : "border-blue-500 bg-blue-500/15 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                )}
                style={{
                  left: `${miniViewportX}px`,
                  top: `${miniViewportY}px`,
                  width: `${Math.max(8, miniViewportW)}px`,
                  height: `${Math.max(8, miniViewportH)}px`,
                }}
              />
            </div>

            {/* Bottom mini status bar */}
            <div className="flex justify-between items-center mt-1 px-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Move className="w-2.5 h-2.5 text-indigo-500" />
                <span>Drag to pan</span>
              </span>
              <span>{nodes.length} Items</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimap toggle pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-[9px] uppercase tracking-wider transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.04)] cursor-pointer active:scale-95",
          isMiro 
            ? "bg-white/80 hover:bg-white/95 border-slate-200/40 text-slate-650 hover:text-indigo-600" 
            : "bg-slate-900/80 hover:bg-slate-850/95 border-slate-800/60 text-slate-350 hover:text-blue-400"
        )}
      >
        <Map className={cn("w-3.5 h-3.5", isOpen ? "text-indigo-500 animate-pulse" : "text-slate-400")} />
        <span>Minimap</span>
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
    </div>
  );
};
