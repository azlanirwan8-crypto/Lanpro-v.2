import React from 'react';
import { X, Grid, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ConfigureColumnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueTableColumns: any[];
  setIssueTableColumns: React.Dispatch<React.SetStateAction<any[]>>;
  handleReorderColumns: (result: any) => void;
}

export const ConfigureColumnsModal: React.FC<ConfigureColumnsModalProps> = ({
  isOpen,
  onClose,
  issueTableColumns,
  setIssueTableColumns,
  handleReorderColumns
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-xl w-full max-w-lg shadow-2xl relative my-auto overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800">Konfigurasi Kolom</h2>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Drag to reorder and toggle visibility of columns.</p>
              <DragDropContext onDragEnd={handleReorderColumns}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 max-h-[400px] overflow-y-auto px-1"
                    >
                      {issueTableColumns.map((col, index) => (
                        <Draggable key={col.id} draggableId={col.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group border border-transparent hover:border-indigo-100",
                                snapshot.isDragging ? "shadow-lg bg-white border-indigo-200 z-[70]" : ""
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-400">
                                   <Grid className="w-4 h-4" />
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <div 
                                    onClick={() => {
                                      setIssueTableColumns(prev => prev.map(c => c.id === col.id ? { ...c, visible: !c.visible } : c));
                                    }}
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                      col.visible ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300"
                                    )}
                                  >
                                    {col.visible && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{col.label}</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
          
          <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
            <button 
              onClick={onClose}
              className="px-4 py-2 font-semibold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all text-sm"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
