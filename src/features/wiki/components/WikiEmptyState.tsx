import React from 'react';
import { motion } from 'motion/react';
import { Plus, SearchX, BookOpen, Sparkles, RefreshCw } from 'lucide-react';

interface WikiEmptyStateProps {
  onCreateClick: () => void;
  searchQuery: string;
  selectedCategory: string;
  onResetFilters: () => void;
}

export const WikiEmptyState: React.FC<WikiEmptyStateProps> = ({
  onCreateClick,
  searchQuery,
  selectedCategory,
  onResetFilters
}) => {
  const isFiltered = searchQuery || selectedCategory !== 'SEMUA';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-white/45 backdrop-blur-xl rounded-xl border border-slate-200/50 p-8 sm:p-14 text-center max-w-xl mx-auto mt-8 shadow-[0_8px_32px_0_rgba(99,102,241,0.04),inset_0_1.5px_1.5px_rgba(255,255,255,0.8)] select-none relative overflow-hidden"
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-violet-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Modern Animated Illustration */}
      <div className="relative flex justify-center mb-8">
        <motion.div 
          animate={{ 
            y: [0, -8, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-32 h-32 flex items-center justify-center"
        >
          {/* Circular backdrop rings with gradient & blur */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-100/40 to-violet-100/40 border border-indigo-200/20 blur-md scale-95" />
          <div className="absolute w-24 h-24 rounded-full bg-white/70 shadow-lg shadow-indigo-600/5 border border-indigo-100/50 flex items-center justify-center" />
          
          {/* Floating sparks & decorative mini-icons */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.6, 1, 0.6],
              rotate: [0, 45, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-2 right-2 text-indigo-500"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>

          <motion.div
            animate={{ 
              y: [0, 6, 0],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-3 left-1 text-violet-400"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </motion.div>

          {/* Interactive Core Icon change depending on state */}
          <div className="z-10 text-indigo-600">
            {isFiltered ? (
              <SearchX className="w-11 h-11 text-indigo-500/90" />
            ) : (
              <BookOpen className="w-11 h-11 text-indigo-600/90" />
            )}
          </div>

          {/* Abstract Floating Document SVGs */}
          {!isFiltered && (
            <>
              <motion.svg
                animate={{
                  x: [0, -12, 0],
                  y: [0, -6, 0],
                  rotate: [-8, -15, -8],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-0 top-6 w-8 h-10 text-indigo-400/70 drop-shadow"
                viewBox="0 0 24 30"
                fill="currentColor"
              >
                <rect x="2" y="2" width="20" height="26" rx="3" fill="white" stroke="currentColor" strokeWidth="1.5" />
                <line x1="6" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </motion.svg>

              <motion.svg
                animate={{
                  x: [0, 12, 0],
                  y: [0, 6, 0],
                  rotate: [12, 20, 12],
                }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute right-0 top-8 w-8 h-10 text-violet-400/70 drop-shadow"
                viewBox="0 0 24 30"
                fill="currentColor"
              >
                <rect x="2" y="2" width="20" height="26" rx="3" fill="white" stroke="currentColor" strokeWidth="1.5" />
                <line x1="6" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="6" y1="20" x2="12" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </motion.svg>
            </>
          )}
        </motion.div>
      </div>

      {/* Heading & Sub-paragraph */}
      <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug">
        {isFiltered ? 'Dokumen Tidak Ditemukan' : 'Mulai Tulis Dokumentasi Proyek'}
      </h3>
      
      <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto mt-2 leading-relaxed">
        {isFiltered 
          ? `Tidak menemukan hasil untuk kata kunci "${searchQuery}" atau kategori "${selectedCategory}". Coba bersihkan filter pencarian.`
          : 'Belum ada panduan SOP, spesifikasi produk, atau laporan untuk proyek ini. Abadikan pengetahuan tim Anda sekarang.'}
      </p>

      {/* Primary Action Button / Reset Button Row */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Bersihkan Pencarian</span>
          </button>
        )}

        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCreateClick}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer relative overflow-hidden group"
        >
          {/* Dynamic shimmer gloss on button hover */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:animate-shimmer pointer-events-none" />
          <Plus className="w-4 h-4 text-white" />
          <span>{isFiltered ? 'Buat Dokumen Baru' : 'Tambah Dokumen Pertama'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
};
