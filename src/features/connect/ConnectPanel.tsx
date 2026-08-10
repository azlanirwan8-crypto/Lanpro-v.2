import React, { useState, useEffect } from 'react';
import { Server, CheckCircle2, Wifi, Loader2, Database, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';

export const ConnectPanel = () => {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'app_user',
    password: 'app_password',
    database: 'app_database'
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle'|'success'|'error', message: string }>({ status: 'idle', message: '' });

  useEffect(() => {
    const fetchActiveConfig = async () => {
      try {
        const json = await apiRequest('/api/system/db-config');
        if (json.status === 'success' && json.data) {
          setConfig({
            host: json.data.host || 'localhost',
            port: String(json.data.port || '3306'),
            user: json.data.user || 'app_user',
            password: json.data.password || 'app_password',
            database: json.data.database || 'app_database'
          });
        }
      } catch (err) {
        console.error('Failed to load active database config:', err);
      }
    };
    fetchActiveConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult({ status: 'idle', message: '' });
    
    try {
      const data = await apiRequest('/api/system/db-config', {
        method: 'POST',
        body: config
      });
      
      if (data.status === 'success') {
        setTestResult({ status: 'success', message: 'Koneksi Berhasil tersambung ke MySQL!' });
        toast.success('Kredensial database valid.');
      } else {
        throw new Error(data.message || 'Koneksi gagal.');
      }
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message });
      toast.error('Gagal menghubungkan dengan kofigurasi yang dimasukkan');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    setSaveLoading(true);
    setTestResult({ status: 'idle', message: '' });
    
    try {
      const data = await apiRequest('/api/system/db-config/save', {
        method: 'POST',
        body: config
      });
      
      if (data.status === 'success') {
        setTestResult({ status: 'success', message: 'Konfigurasi database berhasil disimpan & diubah secara Live!' });
        toast.success('Kredensial berhasil disimpan dan diaplikasikan ke server.');
      } else {
        throw new Error(data.message || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      setTestResult({ status: 'error', message: err.message });
      toast.error('Gagal menyimpan konfigurasi: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">        
        <div className="flex-1 overflow-auto p-6 lg:p-8 relative z-10 w-full">
           <div className="w-full mx-auto space-y-6">
             <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-xl shadow-emerald-500/5 mb-8">
                 <div className="flex items-start gap-4">
                   <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl mt-1 shrink-0">
                     <CheckCircle2 className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold text-slate-800 tracking-tight">Active MySQL Connection Help</h3>
                      <p className="text-slate-500 mt-2 text-[15px] leading-relaxed max-w-2xl">
                        Aplikasi ini terhubung aktif ke backend MySQL. Anda dapat menguji (Test)
                        maupun menyimpan dan mengaktifkan (Save & Apply Live) konfigurasi database baru secara live tanpa restart manual.
                      </p>
                   </div>
                 </div>
              </div>

              <div className="bg-white shadow-md shadow-slate-200/40 rounded-lg border border-slate-200/60 overflow-hidden">
                 <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                       <Database className="w-5 h-5 text-indigo-500" />
                       Konfigurasi Database MySQL
                    </h2>
                 </div>
                 <form onSubmit={handleTestConnection} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Database Host (DB_HOST)</label>
                          <input 
                             name="host" 
                             value={config.host} 
                             onChange={handleChange} 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Database Port (DB_PORT)</label>
                          <input 
                             name="port" 
                             value={config.port} 
                             onChange={handleChange} 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Database Name (DB_NAME)</label>
                          <input 
                             name="database" 
                             value={config.database} 
                             onChange={handleChange} 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-2 flex gap-3 text-amber-800">
                             <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                             <div className="text-sm space-y-1">
                                <p className="font-semibold text-amber-900">⚠️ Solusi Penting: Mengatasi "Unknown database" / ER_BAD_DB_ERROR</p>
                                <p className="leading-relaxed">
                                   Error ini terjadi karena salah ketik (typo) nama database. Konfigurasi default MySQL di Google Cloud / Aiven biasanya menggunakan nama database <strong className="font-bold underline text-amber-900 bg-amber-100/70 px-1 py-0.5 rounded">defaultdb</strong>.
                                </p>
                                <p className="text-slate-600 mt-1">
                                   Silakan periksa kembali dan pastikan Anda <span className="text-red-600 font-semibold line-through">tidak mengetik "defaultdbj" atau "defaultd"</span> di atas. Ubahlah kembali menjadi <strong className="font-bold text-emerald-700">defaultdb</strong> lalu klik tombol <strong>Save & Apply Live</strong>.
                                </p>
                             </div>
                          </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Username (DB_USER)</label>
                          <input 
                             name="user" 
                             value={config.user} 
                             onChange={handleChange} 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Password (DB_PASSWORD)</label>
                          <input 
                             type="password"
                             name="password" 
                             value={config.password} 
                             onChange={handleChange} 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                          />
                       </div>
                    </div>

                    {testResult.status !== 'idle' && (
                       <div className={`p-4 rounded-xl text-sm font-semibold border ${testResult.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                          {testResult.message}
                       </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 justify-end">
                       <button 
                          type="submit" 
                          disabled={loading || saveLoading}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center min-w-[160px] cursor-pointer disabled:opacity-50"
                       >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                             <>
                                <Wifi className="w-5 h-5 mr-2" />
                                Test Connection
                             </>
                          )}
                       </button>

                       <button 
                          type="button"
                          onClick={handleSaveConnection}
                          disabled={loading || saveLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center min-w-[200px] cursor-pointer disabled:opacity-50"
                       >
                          {saveLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                             <>
                                <Save className="w-5 h-5 mr-2" />
                                Save & Apply Live
                             </>
                          )}
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
    </div>
  );
};
