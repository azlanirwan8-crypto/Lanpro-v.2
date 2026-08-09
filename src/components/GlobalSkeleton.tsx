import React from "react";

export const GlobalSkeleton = () => {
  return (
    <div className="min-h-screen flex h-screen bg-slate-50">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-slate-900 flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-800 animate-pulse" />
          <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="p-4 flex-1 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-full bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="flex items-center justify-between w-full px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          </div>
        </header>
        
        <div className="p-6 flex-1 overflow-auto">
           <div className="flex justify-between items-center mb-6">
               <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
               <div className="flex gap-2">
                   <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
                   <div className="h-9 w-24 bg-slate-200 rounded animate-pulse" />
               </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm min-h-[500px]">
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                  </div>
               </div>
               <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm min-h-[500px]">
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                  </div>
               </div>
               <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm min-h-[500px]">
                  <div className="h-5 w-24 bg-slate-200 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                     <div className="h-24 w-full bg-slate-100 rounded-lg animate-pulse" />
                  </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};
