import React, { useState } from 'react';
import { TestTube, Loader2, Save, X, FileEdit } from 'lucide-react';
import { toast } from 'sonner';
import { PasswordInput } from './PasswordInput';
import { TemplateEditorModal } from './TemplateEditorModal';

interface EmailConfigFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export const EmailConfigForm: React.FC<EmailConfigFormProps> = ({ formData, setFormData }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleTestEmail = async (targetEmail: string) => {
    setIsTesting(true);
    setIsTestModalOpen(false);
    // Mock API Call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTesting(false);
    toast.success(`Koneksi SMTP Berhasil! Email simulasi telah dikirim ke ${targetEmail}.`);
  };

  const handleSaveTemplate = (subject: string, body: string) => {
    setFormData((prev: any) => ({
      ...prev,
      subjectTemplate: subject,
      bodyTemplate: body
    }));
    setIsTemplateModalOpen(false);
    toast.success("Template email berhasil disimpan sementara.");
  };

  const inputStyle = "w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all";
  
  return (
    <div className="space-y-4 relative flex flex-col h-full">
      <div className="space-y-2 flex-1">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-slate-700">SMTP Host</label>
          <input 
             value={formData.host} 
             onChange={(e) => setFormData({...formData, host: e.target.value})}
            placeholder="smtp.gmail.com"
            className={inputStyle} 
           />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-slate-700">SMTP Port</label>
            <input 
               value={formData.port} 
               onChange={(e) => setFormData({...formData, port: e.target.value})}
              placeholder="465"
              className={inputStyle} 
             />
          </div>
          <div className="space-y-0.5">
            <label className="text-sm font-medium text-slate-700">Encryption Type</label>
            <select 
               value={formData.encryption}
              onChange={(e) => setFormData({...formData, encryption: e.target.value})}
              className={inputStyle + " bg-white"}
            >
              <option>SSL</option>
              <option>TLS</option>
              <option>None</option>
            </select>
          </div>
        </div>

        <div className="space-y-0.5">
          <label className="text-sm font-medium text-slate-700">Sender Email</label>
          <input 
             value={formData.username} 
             onChange={(e) => setFormData({...formData, username: e.target.value})}
            className={inputStyle} 
           />
        </div>

        <div className="space-y-0.5">
          <label className="text-sm font-medium text-slate-700">Sender Name</label>
          <input 
             value={formData.senderName} 
             onChange={(e) => setFormData({...formData, senderName: e.target.value})}
            placeholder="LanPro System"
            className={inputStyle} 
           />
        </div>

        <div>
            <PasswordInput 
                label="Sender Password / App Password"
                value={formData.password}
                onChange={(val) => setFormData({...formData, password: val})}
            />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 px-4 py-2 rounded-xl text-sm font-bold transition h-10 mr-auto shadow-sm"
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
                <label className="text-xs text-slate-500">Email Tujuan</label>
                <input
                    value={testTargetEmail}
                    onChange={(e) => setTestTargetEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className={inputStyle}
                />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setIsTestModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">Batal</button>
              <button onClick={() => handleTestEmail(testTargetEmail)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-colors">Kirim</button>
            </div>
          </div>
        </div>
      )}

      <TemplateEditorModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        mode="email"
        initialSubject={formData.subjectTemplate}
        initialBody={formData.bodyTemplate}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};
