import React, { useState } from 'react';
import { TestTube, Loader2, Save, X, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput } from './PasswordInput';
import { TemplateEditorModal } from './TemplateEditorModal';

interface WhatsAppConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const WhatsAppConfigForm: React.FC<WhatsAppConfigFormProps> = ({ formData, setFormData }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetNumber, setTestTargetNumber] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleTestWhatsApp = async (targetNumber: string) => {
    setIsTesting(true);
    setIsTestModalOpen(false);
    // Mock API Call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(`Koneksi WA Gateway Berhasil! Pesan simulasi sukses dikirim ke ${targetNumber}.`);
  };

  const handleSaveTemplate = (subject: string, body: string) => {
    setFormData((prev: any) => ({
      ...prev,
      messageTemplate: body
    }));
    setIsTemplateModalOpen(false);
    toast.success("Template WhatsApp berhasil disimpan sementara.");
  };

  const inputStyle = "w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100";
  
  return (
    <div className="space-y-4 relative">
      <div className="space-y-2.5">
        <div className="space-y-0.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">API Gateway Provider</label>
            <select 
                 value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                className={inputStyle}
            >
                <option>Local Open-Source (WAHA/Localhost)</option>
                <option>FlowKirim</option>
                <option>Custom HTTP POST</option>
            </select>
        </div>
        
        <div className="space-y-0.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">API Base URL Endpoint</label>
            <input 
                 value={formData.endpoint} 
                 onChange={(e) => setFormData({...formData, endpoint: e.target.value})}
                placeholder="https://api.gateway.com"
                className={inputStyle} 
             />
        </div>

        <div>
            <PasswordInput 
                label="API Token / Auth Key"
                value={formData.token}
                onChange={(val) => setFormData({...formData, token: val})}
            />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Sender WhatsApp Number</label>
              <input 
                   value={formData.senderNumber} 
                   onChange={(e) => setFormData({...formData, senderNumber: e.target.value})}
                  placeholder="628xxxxxxxxx"
                  className={inputStyle} 
               />
          </div>
          <div className="space-y-0.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Device ID (Optional)</label>
              <input 
                   value={formData.deviceId} 
                   onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  className={inputStyle} 
               />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-medium transition mr-auto shadow-xs"
        >
          <FileEdit size={14} />
          Edit Broadcast Template
        </button>

        <button
          onClick={() => setIsTestModalOpen(true)}
          disabled={isTesting}
          className="flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 transition"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
          Test Connection
        </button>
        
        <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-md text-xs font-medium transition shadow-xs">
          <Save size={14} />
          Save Config
        </button>
      </div>

      {isTestModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-lg">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-xl max-w-sm w-full space-y-3 border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">Uji Coba Koneksi</h3>
            <div className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">Nomor Tujuan (Format: 628xxx)</label>
                <input
                    value={testTargetNumber}
                    onChange={(e) => setTestTargetNumber(e.target.value)}
                    placeholder="628123456789"
                    className={inputStyle}
                />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsTestModalOpen(false)} className="px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Batal</button>
              <button onClick={() => handleTestWhatsApp(testTargetNumber)} className="px-3.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 shadow-xs transition-colors">Kirim</button>
            </div>
          </div>
        </div>
      )}

      <TemplateEditorModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        mode="whatsapp"
        initialBody={formData.messageTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
