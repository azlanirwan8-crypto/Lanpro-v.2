import React, { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { EmailConfigForm } from './components/EmailConfigForm';
import { WhatsAppConfigForm } from './components/WhatsAppConfigForm';
import { BroadcastMonitor } from './components/BroadcastMonitor';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');

  const [emailConfig, setEmailConfig] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    encryption: 'SSL',
    senderName: '',
    subjectTemplate: '[LanPro] Task Assignment: {{task_key}}',
    bodyTemplate: 'Hi {{user_name}},\n\nYou have been assigned to task {{task_key}}: {{task_title}}.\nStatus: {{status}}\nProject: {{project_name}}\n\nPlease check the dashboard for details.'
  });

  const [waConfig, setWaConfig] = useState({
    provider: 'Local',
    endpoint: '',
    token: '',
    deviceId: '',
    senderNumber: '',
    messageTemplate: '*[LanPro] Task Assignment*\n\nHi {{user_name}},\n\nYou have been assigned to task *{{task_key}}*: {{task_title}}.\n_Status_: {{status}}\n_Project_: {{project_name}}\n\nPlease check the dashboard for details.'
  });

  return (
    <div className="w-full flex-1 flex flex-col p-3 md:p-6 min-h-0 overflow-hidden bg-[#f4f7f9] text-left">
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm shrink-0">
          <h1 className="text-xl font-bold text-slate-800">System Configuration</h1>
        </div>
        
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 px-6">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-2 px-4 py-4 font-semibold transition-all border-b-2 ${
                  activeTab === 'email' 
                  ? 'text-emerald-600 border-emerald-500' 
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <Mail size={18} />
              Email Configuration
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-4 py-4 font-semibold transition-all border-b-2 ${
                  activeTab === 'whatsapp' 
                  ? 'text-emerald-600 border-emerald-500' 
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <MessageSquare size={18} />
              WhatsApp Gateway
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
            <div className="lg:col-span-5">
              {activeTab === 'email' ? (
                <EmailConfigForm formData={emailConfig} setFormData={setEmailConfig} />
              ) : (
                <WhatsAppConfigForm formData={waConfig} setFormData={setWaConfig} />
              )}
            </div>
            <div className="lg:col-span-7 border-l border-slate-100 dark:border-slate-800 pl-6">
              <BroadcastMonitor 
                emailTemplate={{ subject: emailConfig.subjectTemplate, body: emailConfig.bodyTemplate }}
                waTemplate={waConfig.messageTemplate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
