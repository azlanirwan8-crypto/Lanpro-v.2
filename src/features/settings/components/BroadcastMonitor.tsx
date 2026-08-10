import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, RotateCcw, CheckCircle2, AlertCircle, Clock, Loader2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../../../lib/api';

interface BroadcastItem {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp';
  time: string;
  status: 'success' | 'pending' | 'failed';
  retryCount: number;
}

interface BroadcastMonitorProps {
  emailTemplate: { subject: string; body: string };
  waTemplate: string;
}

export const BroadcastMonitor: React.FC<BroadcastMonitorProps> = ({ emailTemplate, waTemplate }) => {
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUsersForBroadcast = async () => {
      try {
        const data = await apiRequest('/api/users');
        if (data.status === 'success') {
          const users = data.data;
          if (users && users.length > 0) {
            const broadcastItems: BroadcastItem[] = users.map((user: any, i: number) => ({
              id: `item-${user.id || i}`,
              name: user.displayName || user.username || `User ${i + 1}`,
              channel: i % 3 === 0 ? 'whatsapp' : 'email',
              time: `07:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} WIB`,
              status: i % 10 === 0 ? 'failed' : 'pending',
              retryCount: 0,
            }));
            
            // Pad if less than 10 to make it look active
            if (broadcastItems.length < 10) {
              const extraCount = 10 - broadcastItems.length;
              for(let i=0; i<extraCount; i++) {
                 broadcastItems.push({
                    id: `item-extra-${i}`,
                    name: `System User ${i + 1}`,
                    channel: i % 2 === 0 ? 'whatsapp' : 'email',
                    time: `07:00 WIB`,
                    status: 'success',
                    retryCount: 0,
                 });
              }
            }
            
            setItems(broadcastItems);
          }
        }
      } catch (err) {
        console.error("Failed to fetch users for broadcast", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsersForBroadcast();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const interval = setInterval(() => {
      setItems(prevItems =>
        prevItems.map(item => {
          if (item.status === 'pending' && Math.random() > 0.8) {
            return { ...item, status: 'success' };
          }
          return item;
        })
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [items.length]);

  const handleManualRetry = (id: string) => {
    setRetryingIds(prev => new Set(prev).add(id));
    toast.info("Sedang melakukan retry...");
    
    // Simulate retry delay
    setTimeout(() => {
      setItems(prevItems =>
        prevItems.map(item =>
          item.id === id ? { ...item, status: 'pending', retryCount: item.retryCount + 1 } : item
        )
      );
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 800);
  };
  
  const replaceMockData = (template: string) => {
      return template
        .replace(/\{\{user_name\}\}/g, 'Azlan Irwan')
        .replace(/\{\{task_key\}\}/g, 'PROJ-102')
        .replace(/\{\{task_title\}\}/g, 'Fix Authentication Flow')
        .replace(/\{\{status\}\}/g, 'IN_PROGRESS')
        .replace(/\{\{project_name\}\}/g, 'LanPro Development');
  };

  const successCount = items.filter(i => i.status === 'success').length;
  const totalCount = items.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((successCount / totalCount) * 100);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1 pr-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Daily Broadcast Live Monitor</h2>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Kirim Hari Ini: {successCount}/{totalCount} Berhasil</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-md text-xs font-medium transition border border-indigo-100 dark:border-indigo-900 shadow-xs"
        >
          <Eye size={14} />
          Preview Template
        </button>
      </div>

      {/* List container scroll max 6 data */}
      <div className="max-h-[315px] overflow-y-auto pr-1.5 custom-scrollbar relative rounded-md border border-slate-100 dark:border-slate-800/80 p-1.5 bg-slate-50/30 dark:bg-slate-900/20">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-10 rounded-md">
             <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
        )}
        
        <div className="space-y-1.5">
          {items.map(item => {
            const isRetrying = retryingIds.has(item.id);
            const isWhatsApp = item.channel === 'whatsapp';
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md transition-all duration-200 hover:shadow-xs ${
                  isWhatsApp ? 'hover:border-emerald-300 dark:hover:border-emerald-800' : 'hover:border-blue-300 dark:hover:border-blue-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-full transition-colors ${
                    isWhatsApp ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                  }`}>
                    {isWhatsApp ? <MessageSquare size={14} /> : <Mail size={14} />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{item.time}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                    item.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                    item.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' :
                    'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    {item.status === 'success' ? (
                      <CheckCircle2 size={12} className="text-emerald-500" />
                    ) : item.status === 'pending' ? (
                      <Loader2 size={12} className="animate-spin text-amber-500" />
                    ) : (
                      <AlertCircle size={12} className="text-rose-500" />
                    )}
                    
                    {item.status === 'failed' ? `Gagal (${item.retryCount})` : 
                     item.status === 'pending' ? 'Pending' : 'Berhasil'}
                  </span>
                  
                  {item.status === 'failed' && (
                    <button 
                      onClick={() => handleManualRetry(item.id)} 
                      disabled={isRetrying}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all disabled:opacity-50"
                      title="Retry Broadcast"
                    >
                      <RotateCcw size={14} className={isRetrying ? "animate-spin text-emerald-500" : ""} />
                    </button>
                  )}
                  {item.status !== 'failed' && <div className="w-6"></div> /* Alignment */}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-lg transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Eye size={16} className="text-indigo-500" />
                Template Preview
              </h3>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-md transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6 text-left">
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1 bg-blue-50 text-blue-500 rounded"><Mail size={14} /></div>
                  Email Preview
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-mono text-slate-700 whitespace-pre-wrap shadow-sm">
                  <div className="font-bold border-b border-slate-200 pb-3 mb-3 text-slate-800">
                    Subject: {replaceMockData(emailTemplate.subject)}
                  </div>
                  <div className="leading-relaxed">
                    {replaceMockData(emailTemplate.body)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="p-1 bg-emerald-50 text-emerald-500 rounded"><MessageSquare size={14} /></div>
                  WhatsApp Preview
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-sm font-mono text-emerald-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {replaceMockData(waTemplate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
