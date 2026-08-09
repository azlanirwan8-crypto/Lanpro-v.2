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

  const inputStyle = "w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";
  
  return (
    <div className="space-y-4 relative flex flex-col h-full">
      <div className="space-y-2 flex-1">
        <div className="space-y-0.5">
            <label className="text-sm font-medium text-slate-700">API Gateway Provider</label>
            <select 
                 value={formData.provider}
                onChange={(e) => setFormData({...formData, provider: e.target.value})}
                className={inputStyle + " bg-white"}
            >
                <option>Local Open-Source (WAHA/Localhost)</option>
                <option>FlowKirim</option>
                <option>Custom HTTP POST</option>
            </select>
        </div>
        
        <div className="space-y-0.5">
            <label className="text-sm font-medium text-slate-700">API Base URL Endpoint</label>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
              <label className="text-sm font-medium text-slate-700">Sender WhatsApp Number</label>
              <input 
                   value={formData.senderNumber} 
                   onChange={(e) => setFormData({...formData, senderNumber: e.target.value})}
                  placeholder="628xxxxxxxxx"
                  className={inputStyle} 
               />
          </div>
          <div className="space-y-0.5">
              <label className="text-sm font-medium text-slate-700">Device ID (Optional)</label>
              <input 
                   value={formData.deviceId} 
                   onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  className={inputStyle} 
               />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 px-4 py-2 rounded-xl text-sm font-bold transition h-10 mr-auto shadow-sm"
        >
          <FileEdit size={16} />
          Edit Broadcast Template
        </button>

        <button
          onClick={() => setIsTestModalOpen(true)}
          disabled={isTesting}
          className="flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition h-10"
        >
          {isTesting ? <Loader2 size={16} className="animate-spin" /> : <TestTube size={16} />}
          Test Connection
        </button>
        
        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition h-10 shadow-sm">
          <Save size={16} />
          Save Config
        </button>
      </div>

      {isTestModalOpen && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 rounded-2xl">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-slate-800">Uji Coba Koneksi</h3>
            <div className="space-y-1">
                <label className="text-xs text-slate-500">Nomor Tujuan (Format: 628xxx)</label>
                <input
                    value={testTargetNumber}
                    onChange={(e) => setTestTargetNumber(e.target.value)}
                    placeholder="628123456789"
                    className={inputStyle}
                />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsTestModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">Batal</button>
              <button onClick={() => handleTestWhatsApp(testTargetNumber)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-colors">Kirim</button>
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
