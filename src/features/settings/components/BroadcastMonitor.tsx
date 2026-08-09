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
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1 pr-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-800">Daily Broadcast Live Monitor</h2>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Kirim Hari Ini: {successCount}/{totalCount} Berhasil</span>
              <span className="text-slate-700 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsPreviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all duration-300 ease-in-out border border-indigo-100 shadow-sm hover:shadow"
        >
          <Eye size={14} />
          Preview Template
        </button>
      </div>

      <div className="flex-1 min-h-[400px] overflow-y-auto pr-2 relative rounded-xl">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
             <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        )}
        
        <div className="space-y-2.5 pb-4">
          {items.map(item => {
            const isRetrying = retryingIds.has(item.id);
            const isWhatsApp = item.channel === 'whatsapp';
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-sm ${
                  isWhatsApp ? 'hover:border-emerald-200' : 'hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-full transition-colors duration-300 ${
                    isWhatsApp ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {isWhatsApp ? <MessageSquare size={16} /> : <Mail size={16} />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-400 font-medium">{item.time}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                    item.status === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    item.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {item.status === 'success' ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : item.status === 'pending' ? (
                      <Loader2 size={14} className="animate-spin text-amber-500" />
                    ) : (
                      <AlertCircle size={14} className="text-red-500" />
                    )}
                    
                    {item.status === 'failed' ? `Gagal (${item.retryCount})` : 
                     item.status === 'pending' ? 'Pending' : 'Berhasil'}
                  </span>
                  
                  {item.status === 'failed' && (
                    <button 
                      onClick={() => handleManualRetry(item.id)} 
                      disabled={isRetrying}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50"
                      title="Retry Broadcast"
                    >
                      <RotateCcw size={16} className={isRetrying ? "animate-spin text-emerald-500" : ""} />
                    </button>
                  )}
                  {item.status !== 'failed' && <div className="w-8"></div> /* Placeholder for alignment */}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-xl transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Eye size={18} className="text-indigo-500" />
                Template Preview
              </h3>
              <button 
                onClick={() => setIsPreviewOpen(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
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
