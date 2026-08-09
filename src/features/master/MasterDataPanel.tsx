import React from 'react';
import { 
  Settings, Plus, Trash2, Edit, Search, Layers, GripVertical, CheckCircle2, ShieldAlert, Sparkles, Tag
} from 'lucide-react';
import { motion } from 'motion/react';
import { DragDropContext, Droppable as _Droppable, Draggable as _Draggable } from '@hello-pangea/dnd';

const Droppable = _Droppable as any;
const Draggable = _Draggable as any;
import { toast } from 'sonner';
import { MasterData, AppRole, UserProfile } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { RenderIcon, AVAILABLE_ICONS } from '../../components/RenderIcon';
import { cn } from '../../lib/utils';
import { apiRequest } from '../../lib/api';

const Input = ({ value, onChange, placeholder, type = 'text', className = '', ...props }: any) => (
  <input 
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all ${className}`}
    {...props}
  />
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, size = 'md' }: any) => {
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none";
  let variantStyle = "";
  if (variant === 'primary') variantStyle = "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-600/20";
  if (variant === 'secondary') variantStyle = "bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95";
  if (variant === 'outline') variantStyle = "border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95";
  if (variant === 'danger') variantStyle = "bg-rose-500 text-white hover:bg-rose-600 active:scale-95 shadow-md shadow-rose-500/20";
  if (variant === 'ghost') variantStyle = "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95";
  
  let sizeStyle = "";
  if (size === 'sm') sizeStyle = "px-3 py-1.5 text-xs rounded-lg";
  if (size === 'md') sizeStyle = "px-4 py-2 text-sm rounded-xl";
  if (size === 'lg') sizeStyle = "px-6 py-3 text-base rounded-2xl";

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}>
      {children}
    </button>
  );
};

export const MasterDataPanel = ({ 
  projects = [],
  tasks = [],
  masterData, 
  userRole, 
  currentUserProfile,
  hasPermission,
  onRefresh
}: { 
  projects?: any[];
  tasks?: any[];
  masterData: MasterData[]; 
  userRole: AppRole | null;
  currentUserProfile: UserProfile | null;
  hasPermission: (...args: any[]) => boolean;
  onRefresh: () => void;
}) => {
  const [selectedType, setSelectedType] = React.useState<string>('priority');
  const [isNewMasterModalOpen, setIsNewMasterModalOpen] = React.useState(false);
  const [editingMaster, setEditingMaster] = React.useState<MasterData | null>(null);
  const [isEditMasterModalOpen, setIsEditMasterModalOpen] = React.useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = React.useState<{ isOpen: boolean; id: string; label: string } | null>(null);
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const [newMasterType, setNewMasterType] = React.useState<string>('status');
  const [newMasterLabel, setNewMasterLabel] = React.useState('');
  const [newMasterColor, setNewMasterColor] = React.useState('#3b82f6');
  const [newMasterIcon, setNewMasterIcon] = React.useState('CircleDot');
  const [newMasterShortCode, setNewMasterShortCode] = React.useState('');
  const [newMasterHierarchy, setNewMasterHierarchy] = React.useState('Standard');
  const [newMasterStatusGroup, setNewMasterStatusGroup] = React.useState('To Do');
  const [newMasterBaseUrl, setNewMasterBaseUrl] = React.useState('');
  const [newMasterRoleType, setNewMasterRoleType] = React.useState<'PROJECT' | 'SYSTEM'>('PROJECT');
  const [roleTabFilter, setRoleTabFilter] = React.useState<'ALL' | 'PROJECT' | 'SYSTEM'>('ALL');

  React.useEffect(() => {
    setRoleTabFilter('ALL');
  }, [selectedType]);
  
  const [iconSearch, setIconSearch] = React.useState('');
  const [editIconSearch, setEditIconSearch] = React.useState('');

  // Modul / Aplikasi custom states
  const [projectModules, setProjectModules] = React.useState<any[]>([]);
  const [loadingModules, setLoadingModules] = React.useState(false);
  
  const [localMasterData, setLocalMasterData] = React.useState<MasterData[]>(masterData);

  React.useEffect(() => {
    setLocalMasterData(masterData);
  }, [masterData]);
  
  const [isNewModuleModalOpen, setIsNewModuleModalOpen] = React.useState(false);
  const [newModuleProjectId, setNewModuleProjectId] = React.useState('');
  const [newModuleNamaModul, setNewModuleNamaModul] = React.useState('');
  const [newModuleKeterangan, setNewModuleKeterangan] = React.useState('');

  const [isEditModuleModalOpen, setIsEditModuleModalOpen] = React.useState(false);
  const [editingModuleId, setEditingModuleId] = React.useState('');
  const [editingModuleProjectId, setEditingModuleProjectId] = React.useState('');
  const [editingModuleNamaModul, setEditingModuleNamaModul] = React.useState('');
  const [editingModuleKeterangan, setEditingModuleKeterangan] = React.useState('');

  const fetchProjectModules = async () => {
    setLoadingModules(true);
    try {
      const res = await apiRequest('/api/project-modules');
      if (res.status === 'success') {
        setProjectModules(res.data || []);
      }
    } catch (e) {
      console.error("Gagal mengambil data modul", e);
    } finally {
      setLoadingModules(false);
    }
  };

  React.useEffect(() => {
    fetchProjectModules();
  }, []);

  const getUsageCount = (item: MasterData) => {
    if (!tasks || tasks.length === 0) return 0;
    const labelLower = (item.label || '').toLowerCase();
    return tasks.filter((t: any) => 
      (t.status && t.status.toLowerCase() === labelLower) ||
      (t.priority && t.priority.toLowerCase() === labelLower) ||
      (t.type && t.type.toLowerCase() === labelLower) ||
      (t.environment && t.environment.toLowerCase() === labelLower) ||
      (t.category && t.category.toLowerCase() === labelLower)
    ).length;
  };

  const handleCreateModule = async () => {
    if (!newModuleProjectId) {
      toast.error('Pilih project terlebih dahulu');
      return;
    }
    if (!newModuleNamaModul.trim()) {
      toast.error('Nama modul tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: newModuleProjectId,
        namaModul: newModuleNamaModul.trim(),
        keterangan: newModuleKeterangan.trim()
      };
      const res = await apiRequest('/api/project-modules', {
        method: 'POST',
        body: payload
      });
      if (res.status !== 'success') throw new Error(res.message);
      toast.success('Modul berhasil ditambahkan');
      setIsNewModuleModalOpen(false);
      setNewModuleNamaModul('');
      setNewModuleKeterangan('');
      fetchProjectModules();
    } catch (e: any) {
      toast.error('Gagal menambahkan modul: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModuleProjectId) {
      toast.error('Pilih project terlebih dahulu');
      return;
    }
    if (!editingModuleNamaModul.trim()) {
      toast.error('Nama modul tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        projectId: editingModuleProjectId,
        namaModul: editingModuleNamaModul.trim(),
        keterangan: editingModuleKeterangan.trim()
      };
      const res = await apiRequest(`/api/project-modules/${editingModuleId}`, {
        method: 'PUT',
        body: payload
      });
      if (res.status !== 'success') throw new Error(res.message);
      toast.success('Modul berhasil diperbarui');
      setIsEditModuleModalOpen(false);
      fetchProjectModules();
    } catch (e: any) {
      toast.error('Gagal memperbarui modul: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredNewIcons = React.useMemo(() => {
    return AVAILABLE_ICONS.filter(i => 
      i.label.toLowerCase().includes(iconSearch.toLowerCase()) || 
      i.id.toLowerCase().includes(iconSearch.toLowerCase())
    );
  }, [iconSearch]);

  const filteredEditIcons = React.useMemo(() => {
    return AVAILABLE_ICONS.filter(i => 
      i.label.toLowerCase().includes(editIconSearch.toLowerCase()) || 
      i.id.toLowerCase().includes(editIconSearch.toLowerCase())
    );
  }, [editIconSearch]);

  const masterDataTypes = [
    { type: 'priority', label: 'Priority' },
    { type: 'status', label: 'Status' },
    { type: 'category', label: 'Category' },
    { type: 'project_role', label: 'Project Role' },
    { type: 'issue_type', label: 'Issue Type' },
    { type: 'environment', label: 'Environment' },
    { type: 'department', label: 'Department' },
    { type: 'jabatan', label: 'Position' },
    { type: 'release', label: 'Release' },
    { type: 'fitur', label: 'Feature' },
    { type: 'system', label: 'System' },
    { type: 'surrounding', label: 'Surrounding' },
    { type: 'jenis_dokumen', label: 'Jenis Dokumen' },
    { type: 'modul_aplikasi', label: 'Modul / Aplikasi' }
  ];

  const handleCreateMasterData = async () => {
    if (!newMasterLabel) {
      toast.error('Label Master Data tidak boleh kosong');
      return;
    }

    if (newMasterType === 'project_role') {
      const trimmedLabel = newMasterLabel.trim();
      if (trimmedLabel.length < 3) {
        toast.error('Nama Role minimal harus 3 karakter');
        return;
      }
      if (/^(.)\1+$/i.test(trimmedLabel)) {
        toast.error('Nama Role tidak boleh berisi karakter sampah atau berulang');
        return;
      }
      const lowerLabel = trimmedLabel.toLowerCase();
      if (lowerLabel === 'asdf' || lowerLabel === 'qwer' || lowerLabel === 'zxcv' || lowerLabel === 'junk' || lowerLabel === 'test' || lowerLabel === 'testing' || lowerLabel === 'dd') {
        toast.error('Nama Role tidak boleh berupa karakter sampah atau acak');
        return;
      }
    }

    setIsSaving(true);
    try {
      const typeItems = masterData.filter(d => d.type === newMasterType);
      const nextOrder = typeItems.length > 0 ? Math.max(...typeItems.map(d => d.order || 0)) + 1 : 0;
      
      let description = '';
      if (selectedType === 'priority' && newMasterShortCode) description = `Code: ${newMasterShortCode}`;
      if (selectedType === 'issue_type' && newMasterHierarchy) description = `Hierarchy: ${newMasterHierarchy}`;
      if (selectedType === 'status' && newMasterStatusGroup) description = `Group: ${newMasterStatusGroup}`;
      if (selectedType === 'environment' && newMasterBaseUrl) description = `URL: ${newMasterBaseUrl}`;

      const payload = {
        type: newMasterType,
        label: newMasterLabel,
        color: newMasterColor,
        icon: newMasterIcon,
        order: nextOrder,
        description,
        role_type: newMasterType === 'project_role' ? newMasterRoleType : null,
        createdBy: currentUserProfile?.uid || 'system'
      };
      
      const data = await apiRequest('/api/master-data', {
        method: 'POST',
        body: payload
      });
      if (data.status !== 'success') throw new Error(data.message);

      toast.success('Master Data Berhasil Ditambahkan');
      setIsNewMasterModalOpen(false);
      setNewMasterLabel('');
      setNewMasterShortCode('');
      setNewMasterBaseUrl('');
      onRefresh();
    } catch(e: any) {
      console.error(e);
      toast.error('Gagal menambahkan master data: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMasterData = async () => {
    if (!editingMaster) return;

    if (editingMaster.type === 'project_role') {
      const trimmedLabel = (editingMaster.label || "").trim();
      if (trimmedLabel.length < 3) {
        toast.error('Nama Role minimal harus 3 karakter');
        return;
      }
      if (/^(.)\1+$/i.test(trimmedLabel)) {
        toast.error('Nama Role tidak boleh berisi karakter sampah atau berulang');
        return;
      }
      const lowerLabel = trimmedLabel.toLowerCase();
      if (lowerLabel === 'asdf' || lowerLabel === 'qwer' || lowerLabel === 'zxcv' || lowerLabel === 'junk' || lowerLabel === 'test' || lowerLabel === 'testing' || lowerLabel === 'dd') {
        toast.error('Nama Role tidak boleh berupa karakter sampah atau acak');
        return;
      }
    }

    setIsSaving(true);
    try {
      const data = await apiRequest(`/api/master-data/${editingMaster.id}`, {
        method: 'PUT',
        body: {
          label: editingMaster.label,
          color: editingMaster.color,
          icon: editingMaster.icon,
          description: editingMaster.description,
          role_type: editingMaster.type === 'project_role' ? (editingMaster.roleType || editingMaster.role_type || 'PROJECT') : null
        }
      });
      if (data.status !== 'success') throw new Error(data.message);

      toast.success('Master Data Berhasil Diperbarui');
      setIsEditMasterModalOpen(false);
      setEditingMaster(null);
      onRefresh();
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal memperbarui master data: ' + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMasterData = async (id: string) => {
    setIsDeleting(true);
    try {
      if (deleteConfirmState?.label.includes('(Modul)')) {
        const data = await apiRequest(`/api/project-modules/${id}`, { method: 'DELETE' });
        if (data.status !== 'success') throw new Error(data.message);
        toast.success('Modul berhasil dihapus');
        fetchProjectModules();
      } else {
        const data = await apiRequest(`/api/master-data/${id}`, { method: 'DELETE' });
        if (data.status !== 'success') throw new Error(data.message);
        toast.success('Master data berhasil dihapus');
        onRefresh();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal menghapus master data.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmState(null);
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col w-full h-full animate-in fade-in duration-700">
        <div className="flex flex-1 gap-6 w-full h-full p-4 md:p-6">
          {/* Sidebar for Master Data Types */}
          <div className="w-[300px] shrink-0 flex flex-col h-full bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="font-black text-slate-800 text-sm tracking-tight">Master Database</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">System configuration</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Settings className="w-4 h-4" />
                </div>
            </div>
            <div className="flex-1 py-2 flex flex-col gap-1 px-3 overflow-y-auto relative custom-scrollbar">
              {masterDataTypes.map(t => {
                const count = t.type === 'modul_aplikasi' ? projectModules.length : masterData.filter(d => d.type === t.type).length;
                const isActive = selectedType === t.type;
                return (
                  <button 
                    key={t.type} 
                    onClick={() => setSelectedType(t.type)}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group relative z-10",
                      isActive 
                        ? "text-white shadow-lg shadow-indigo-600/25" 
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeMasterTab"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-md -z-10"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2 truncate">
                      <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-white animate-pulse" : "bg-slate-300 group-hover:bg-indigo-400")} />
                      {t.label}
                    </span>
                    <span className={cn(
                        "relative z-10 text-[10px] font-black px-2 py-0.5 rounded-full transition-all shadow-sm", 
                        isActive ? "bg-white/20 text-white backdrop-blur-sm" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 mb-6 flex justify-between items-center shadow-sm shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">System Master</span>
                      <span className="text-xs text-slate-400 font-semibold">• Enterprise Control Center</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{masterDataTypes.find(t => t.type === selectedType)?.label}</h2>
                    <p className="text-slate-500 text-xs font-semibold mt-1">
                      {selectedType === 'modul_aplikasi' 
                        ? "Kelola master data modul / aplikasi yang dipetakan ke project aktif enterprise." 
                        : `Kelola konfigurasi standar untuk ${masterDataTypes.find(t => t.type === selectedType)?.label.toLowerCase()} dengan penguncian integritas data.`}
                    </p>
                </div>
                {hasPermission(userRole as AppRole, 'configuration', 'update', false, currentUserProfile?.permissions) && (
                <Button 
                    onClick={() => {
                      if (selectedType === 'modul_aplikasi') {
                        setNewModuleProjectId(projects?.[0]?.id || '');
                        setNewModuleNamaModul('');
                        setNewModuleKeterangan('');
                        setIsNewModuleModalOpen(true);
                      } else {
                        setNewMasterType(selectedType); 
                        setNewMasterLabel('');
                        setNewMasterShortCode('');
                        setNewMasterBaseUrl('');
                        setIsNewMasterModalOpen(true);
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white px-5 py-3 rounded-2xl text-xs shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add {masterDataTypes.find(t => t.type === selectedType)?.label}
                </Button>
                )}
            </div>
            
            {selectedType === 'modul_aplikasi' ? (
                <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-6 flex-1 overflow-y-auto">
                    {loadingModules ? (
                        <div className="flex justify-center items-center h-48">
                            <span className="text-sm font-semibold text-slate-500 animate-pulse">Memuat modul aplikasi...</span>
                        </div>
                    ) : projectModules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Layers className="w-14 h-14 mb-3 text-slate-300 animate-pulse" />
                            <p className="text-sm font-bold text-slate-700">Belum ada modul / aplikasi</p>
                            <p className="text-xs mt-1 text-slate-400">Klik tombol 'Add Modul / Aplikasi' di atas untuk membuat modul master pertama.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {projectModules.map((mod: any) => {
                                const p = projects?.find(proj => proj.id === mod.projectId);
                                return (
                                    <div key={mod.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                                MOD
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900">{mod.namaModul}</span>
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                                                        {p ? p.name : mod.projectId}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                    {mod.keterangan || <span className="text-slate-300 italic">Tidak ada keterangan</span>}
                                                </p>
                                            </div>
                                        </div>
                                        {hasPermission(userRole as AppRole, 'configuration', 'update', false, currentUserProfile?.permissions) && (
                                            <div className="flex gap-2 items-center">
                                                <button 
                                                    onClick={() => {
                                                        setEditingModuleId(mod.id);
                                                        setEditingModuleProjectId(mod.projectId);
                                                        setEditingModuleNamaModul(mod.namaModul);
                                                        setEditingModuleKeterangan(mod.keterangan || '');
                                                        setIsEditModuleModalOpen(true);
                                                    }}
                                                    className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center"
                                                    title="Edit Modul"
                                                >
                                                    <Edit className="w-4 h-4 shrink-0" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setDeleteConfirmState({ 
                                                            isOpen: true, 
                                                            id: mod.id, 
                                                            label: `${mod.namaModul} (Modul)` 
                                                        });
                                                    }}
                                                    className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center"
                                                    title="Hapus Modul"
                                                >
                                                    <Trash2 className="w-4 h-4 shrink-0" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* TOP SEGMENTED CONTROL / TAB FILTER */}
                    {selectedType === 'project_role' && (
                        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Scope Filter</span>
                                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Filter berdasarkan jenis jangkauan peran</span>
                            </div>
                            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
                                <button
                                    type="button"
                                    onClick={() => setRoleTabFilter('ALL')}
                                    className={cn(
                                        "py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap",
                                        roleTabFilter === 'ALL' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-950"
                                    )}
                                >
                                    <span>Semua Role</span>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", roleTabFilter === 'ALL' ? "bg-indigo-50 text-indigo-700" : "bg-slate-200/65 text-slate-600")}>
                                        {localMasterData.filter(d => d.type === 'project_role').length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRoleTabFilter('PROJECT')}
                                    className={cn(
                                        "py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap",
                                        roleTabFilter === 'PROJECT' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-950"
                                    )}
                                >
                                    <span>Project Roles</span>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", roleTabFilter === 'PROJECT' ? "bg-blue-50 text-blue-700" : "bg-slate-200/65 text-slate-600")}>
                                        {localMasterData.filter(d => d.type === 'project_role' && (d.roleType === 'PROJECT' || d.role_type === 'PROJECT' || (!d.roleType && !d.role_type))).length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRoleTabFilter('SYSTEM')}
                                    className={cn(
                                        "py-2 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap",
                                        roleTabFilter === 'SYSTEM' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-950"
                                    )}
                                >
                                    <span>System Roles</span>
                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", roleTabFilter === 'SYSTEM' ? "bg-purple-50 text-purple-700" : "bg-slate-200/65 text-slate-600")}>
                                        {localMasterData.filter(d => d.type === 'project_role' && (d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM')).length}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <DragDropContext 
                        onDragEnd={async (result) => {
                            if (!result.destination) return;
                            const currentList = localMasterData.filter(d => {
                                if (d.type !== selectedType) return false;
                                if (selectedType === 'project_role') {
                                    if (roleTabFilter === 'PROJECT') {
                                        return d.roleType === 'PROJECT' || d.role_type === 'PROJECT' || (!d.roleType && !d.role_type);
                                    }
                                    if (roleTabFilter === 'SYSTEM') {
                                        return d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM';
                                    }
                                }
                                return true;
                            }).sort((a,b) => (a.order||0) - (b.order||0));
                            const [reorderedItem] = currentList.splice(result.source.index, 1);
                            currentList.splice(result.destination.index, 0, reorderedItem);
                            
                            const updatedAll = localMasterData.map(item => {
                              if (item.type !== selectedType) return item;
                              const foundIdx = currentList.findIndex(c => c.id === item.id);
                              if (foundIdx !== -1) {
                                return { ...item, order: foundIdx };
                              }
                              return item;
                            });
                            setLocalMasterData(updatedAll);

                            try {
                                await Promise.all(currentList.map((item, index) => 
                                apiRequest(`/api/master-data/${item.id}`, {
                                    method: 'PUT',
                                    body: { order: index, label: item.label, color: item.color, icon: item.icon, description: item.description }
                                })
                                ));
                                onRefresh();
                                toast.success('Urutan berhasil diperbarui');
                            } catch (error) {
                                console.error('Reorder error', error);
                                toast.error('Gagal menyimpan urutan');
                                setLocalMasterData(masterData);
                            }
                        }}
                    >
                        <Droppable droppableId={`master-${selectedType}`}>
                            {(provided: any, snapshot: any) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={cn("space-y-2.5 min-h-[400px] transition-colors p-2", snapshot.isDraggingOver ? 'bg-indigo-50/20 rounded-2xl' : '')}
                            >
                                {localMasterData
                                .filter(d => {
                                    if (d.type !== selectedType) return false;
                                    if (selectedType === 'project_role') {
                                        if (roleTabFilter === 'PROJECT') {
                                            return d.roleType === 'PROJECT' || d.role_type === 'PROJECT' || (!d.roleType && !d.role_type);
                                        }
                                        if (roleTabFilter === 'SYSTEM') {
                                            return d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM';
                                        }
                                    }
                                    return true;
                                })
                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                .map((item, index) => {
                                    const usageCount = getUsageCount(item);
                                    return (
                                        <Draggable key={item.id} draggableId={item.id} index={index}>
                                        {(provided: any, snapshot: any) => (
                                            <div 
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                                "flex justify-between items-center p-4 bg-white border border-slate-200/70 rounded-2xl transition-all group hover:border-indigo-200 hover:shadow-md",
                                                snapshot.isDragging ? 'shadow-2xl border-indigo-500 bg-indigo-50/50 cursor-grabbing z-50' : ''
                                            )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-slate-300 group-hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing p-1">
                                                        <GripVertical className="w-5 h-5" />
                                                    </div>
                                                    
                                                    {item.icon ? (
                                                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm" style={{ backgroundColor: (item.color || '#3b82f6') + '15', color: item.color || '#3b82f6' }}>
                                                            <RenderIcon iconName={item.icon} className="w-5 h-5" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full shrink-0 shadow-inner border border-black/10" style={{ backgroundColor: item.color || '#ccc' }} />
                                                    )}

                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2.5 flex-wrap">
                                                            <span className="text-sm font-bold text-slate-900">{item.label}</span>
                                                            
                                                            {selectedType === 'project_role' && (() => {
                                                                const rType = item.roleType || item.role_type || 'PROJECT';
                                                                const isSystemReserved = item.is_system_default || ['admin', 'member', 'viewer', 'developer', 'ui/ux', 'qa', 'dba', 'arsitektur', 'system analyst', 'bisnis analyst'].some(def => (item.label || '').toLowerCase().includes(def));
                                                                return (
                                                                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                                                                        {rType === 'PROJECT' ? (
                                                                            <span className="text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 uppercase">
                                                                                PROJECT ROLE
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/50 uppercase">
                                                                                SYSTEM ROLE
                                                                            </span>
                                                                        )}
                                                                        {isSystemReserved && (
                                                                            <span className="text-xs" title="Reserved System Role" role="img" aria-label="lock">🔒</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {usageCount > 0 && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                                                    <Tag className="w-3 h-3" /> {usageCount} Task aktif
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <span className="text-xs text-slate-400 font-semibold mt-0.5">{item.description}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    {hasPermission(userRole as AppRole, 'configuration', 'update', false, currentUserProfile?.permissions) && (
                                                        <div className="flex gap-2 items-center">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingMaster(item);
                                                                    setIsEditMasterModalOpen(true);
                                                                }}
                                                                className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center"
                                                                title="Edit Master Data"
                                                            >
                                                                <Edit className="w-4 h-4 shrink-0" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setDeleteConfirmState({ isOpen: true, id: item.id, label: item.label })}
                                                                className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center"
                                                                title="Hapus Master Data"
                                                            >
                                                                <Trash2 className="w-4 h-4 shrink-0" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
                </div>
            )}
          </div>
        </div>
        
        {/* Modal Tambah Master Data (Dynamic Contextual) */}
        <Modal 
            isOpen={isNewMasterModalOpen} 
            onClose={() => { setIsNewMasterModalOpen(false); setIconSearch(''); }}
            title={`Tambah ${masterDataTypes.find(t => t.type === selectedType)?.label}`}
            maxWidth="max-w-xl"
        >
        <div className="space-y-6">
          {/* Live Preview Badge Component */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 shadow-inner" style={{ color: newMasterColor }}>
                <RenderIcon iconName={newMasterIcon} className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black text-white">{newMasterLabel || 'Label Master Data'}</span>
                {selectedType === 'project_role' && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-0.5">
                    {newMasterRoleType === 'PROJECT' ? 'Project Role (Tim Proyek)' : 'System Role (Akses Platform)'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {selectedType === 'project_role' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TIPE ROLE / SCOPE</label>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewMasterRoleType('PROJECT')}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer",
                    newMasterRoleType === 'PROJECT' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>Project Role</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewMasterRoleType('SYSTEM')}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer",
                    newMasterRoleType === 'SYSTEM' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/60" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>System Role</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-medium ml-1">
                {newMasterRoleType === 'PROJECT' ? 'Peran anggota dalam tim proyek (cth: BA, Lead, QA, Developer)' : 'Hak akses global level aplikasi (cth: Administrator, Auditor, Guest)'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Label Name</label>
              <Input 
                value={newMasterLabel} 
                onChange={(e: any) => setNewMasterLabel(e.target.value)}
                placeholder={selectedType === 'project_role' ? "cth: Business Analyst, Project Lead, QA Specialist, Senior Developer" : "misal: Critical, Done, Staging"}
                className="!bg-white border-slate-200"
              />
            </div>
            
            {/* Dynamic Contextual Fields */}
            {selectedType === 'priority' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Short Code</label>
                <Input 
                  value={newMasterShortCode}
                  onChange={(e: any) => setNewMasterShortCode(e.target.value)}
                  placeholder="misal: P0, P1, CRIT"
                  className="!bg-white border-slate-200"
                />
              </div>
            )}

            {selectedType === 'issue_type' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hierarchy Level</label>
                <select
                  value={newMasterHierarchy}
                  onChange={(e) => setNewMasterHierarchy(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="Epic">Epic</option>
                  <option value="Standard">Standard</option>
                  <option value="Subtask">Subtask</option>
                </select>
              </div>
            )}

            {selectedType === 'status' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status Group</label>
                <select
                  value={newMasterStatusGroup}
                  onChange={(e) => setNewMasterStatusGroup(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            )}

            {selectedType === 'environment' && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Endpoint / Base URL</label>
                <Input 
                  value={newMasterBaseUrl}
                  onChange={(e: any) => setNewMasterBaseUrl(e.target.value)}
                  placeholder="https://staging.enterprise.com"
                  className="!bg-white border-slate-200"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Warna / Color Accent</label>
              <div className="flex gap-2">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white flex items-center justify-center">
                  <input 
                    type="color"
                    value={newMasterColor} 
                    onChange={(e: any) => setNewMasterColor(e.target.value)}
                    className="absolute inset-x-0 inset-y-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <div className="w-6 h-6 rounded-md pointer-events-none shadow-sm" style={{ backgroundColor: newMasterColor }} />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMasterColor}
                    onChange={(e: any) => {
                      const val = e.target.value;
                      if (val.startsWith('#') && val.length <= 7) {
                        setNewMasterColor(val);
                      } else if (!val.startsWith('#') && val.length <= 6) {
                        setNewMasterColor('#' + val);
                      }
                    }}
                    className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all uppercase"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Palet Warna</label>
            <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {[
                { hex: '#ef4444', label: 'Merah' },
                { hex: '#f97316', label: 'Oranye' },
                { hex: '#eab308', label: 'Kuning' },
                { hex: '#22c55e', label: 'Hijau' },
                { hex: '#06b6d4', label: 'Cyan' },
                { hex: '#3b82f6', label: 'Biru' },
                { hex: '#6366f1', label: 'Indigo' },
                { hex: '#a855f7', label: 'Ungu' },
                { hex: '#ec4899', label: 'Pink' },
                { hex: '#64748b', label: 'Slate' },
                { hex: '#0f172a', label: 'Gelap' }
              ].map(p => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => setNewMasterColor(p.hex)}
                  className={cn(
                    "w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-95 duration-100 hover:scale-110",
                    newMasterColor.toLowerCase() === p.hex.toLowerCase() ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:border-slate-400"
                  )}
                  style={{ backgroundColor: p.hex }}
                  title={p.label}
                />
              ))}
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5 ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Ikon ({filteredNewIcons.length} tersedia)</label>
            </div>

            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Cari ikon... (cth: bug, target, timer, check, activity, file, user, db, lock)"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full px-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all pl-10"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="grid grid-cols-8 md:grid-cols-10 gap-1.5 p-2.5 border border-slate-200 rounded-xl bg-slate-50 max-h-52 overflow-y-auto custom-scrollbar">
              {filteredNewIcons.length > 0 ? (
                filteredNewIcons.map(i => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setNewMasterIcon(i.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                      newMasterIcon === i.id ? "bg-indigo-600 text-white shadow-md scale-105" : "hover:bg-white text-slate-500 hover:text-slate-800"
                    )}
                    title={i.label}
                  >
                    <RenderIcon iconName={i.id} className="w-5 h-5" />
                  </button>
                ))
              ) : (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 font-semibold">
                  Tidak ada ikon yang cocok dengan kata kunci "{iconSearch}"
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-2 flex gap-3">
            <Button variant="outline" onClick={() => { setIsNewMasterModalOpen(false); setIconSearch(''); }} className="flex-1 justify-center py-3">
              Batal
            </Button>
            <Button onClick={handleCreateMasterData} disabled={isSaving} className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSaving ? 'Menyimpan...' : 'Simpan Master Data'}
            </Button>
          </div>
        </div>
        </Modal>

        {/* Modal Edit Master Data */}
        <Modal 
            isOpen={isEditMasterModalOpen} 
            onClose={() => { setIsEditMasterModalOpen(false); setEditIconSearch(''); }}
            title="Edit Master Data"
            maxWidth="max-w-xl"
        >
            {editingMaster && (
            <div className="space-y-6">
              {/* Live Preview Badge */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-lg border border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/10 shadow-inner" style={{ color: editingMaster.color || '#3b82f6' }}>
                    <RenderIcon iconName={editingMaster.icon || 'CircleDot'} className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-base font-black text-white">{editingMaster.label || 'Label Master Data'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Label Name</label>
                  <Input 
                    value={editingMaster.label} 
                    onChange={(e: any) => setEditingMaster({...editingMaster, label: e.target.value})}
                    className="!bg-white border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Warna / Color Accent</label>
                  <div className="flex gap-2">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white flex items-center justify-center">
                      <input 
                        type="color"
                        value={editingMaster.color || '#000000'} 
                        onChange={(e: any) => setEditingMaster({...editingMaster, color: e.target.value})}
                        className="absolute inset-x-0 inset-y-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <div className="w-6 h-6 rounded-md pointer-events-none shadow-sm" style={{ backgroundColor: editingMaster.color || '#000000' }} />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editingMaster.color || ''}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          if (val.startsWith('#') && val.length <= 7) {
                            setEditingMaster({...editingMaster, color: val});
                          } else if (!val.startsWith('#') && val.length <= 6) {
                            setEditingMaster({...editingMaster, color: '#' + val});
                          }
                        }}
                        className="w-full h-12 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all uppercase"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Palet Warna</label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {[
                    { hex: '#ef4444', label: 'Merah' },
                    { hex: '#f97316', label: 'Oranye' },
                    { hex: '#eab308', label: 'Kuning' },
                    { hex: '#22c55e', label: 'Hijau' },
                    { hex: '#06b6d4', label: 'Cyan' },
                    { hex: '#3b82f6', label: 'Biru' },
                    { hex: '#6366f1', label: 'Indigo' },
                    { hex: '#a855f7', label: 'Ungu' },
                    { hex: '#ec4899', label: 'Pink' },
                    { hex: '#64748b', label: 'Slate' },
                    { hex: '#0f172a', label: 'Gelap' }
                  ].map(p => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setEditingMaster({...editingMaster, color: p.hex})}
                      className={cn(
                        "w-6 h-6 rounded-full border border-black/10 transition-transform active:scale-95 duration-100 hover:scale-110",
                        (editingMaster.color || '').toLowerCase() === p.hex.toLowerCase() ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:border-slate-400"
                      )}
                      style={{ backgroundColor: p.hex }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ikon ({filteredEditIcons.length} tersedia)</label>
                </div>

                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Cari ikon... (cth: bug, target, timer, check, activity, file, user, db, lock)"
                    value={editIconSearch}
                    onChange={(e) => setEditIconSearch(e.target.value)}
                    className="w-full px-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all pl-10"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="grid grid-cols-8 md:grid-cols-10 gap-1.5 p-2.5 border border-slate-200 rounded-xl bg-slate-50 max-h-52 overflow-y-auto custom-scrollbar">
                  {filteredEditIcons.length > 0 ? (
                    filteredEditIcons.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setEditingMaster({...editingMaster, icon: i.id})}
                        className={cn(
                          "flex flex-col items-center justify-center p-2 rounded-lg transition-all",
                          editingMaster.icon === i.id ? "bg-indigo-600 text-white shadow-md scale-105" : "hover:bg-white text-slate-500 hover:text-slate-800"
                        )}
                        title={i.label}
                      >
                        <RenderIcon iconName={i.id} className="w-5 h-5" />
                      </button>
                    ))
                  ) : (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 font-semibold">
                      Tidak ada ikon yang cocok dengan kata kunci "{editIconSearch}"
                    </div>
                  )}
                </div>
              </div>
                
              <div className="pt-2 flex gap-3">
                <Button variant="outline" onClick={() => { setIsEditMasterModalOpen(false); setEditIconSearch(''); }} className="flex-1 justify-center py-3">
                  Batal
                </Button>
                <Button onClick={handleUpdateMasterData} disabled={isSaving} className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
            )}
        </Modal>

        {/* Modal Tambah Modul Baru */}
        <Modal 
            isOpen={isNewModuleModalOpen} 
            onClose={() => setIsNewModuleModalOpen(false)}
            title="Tambah Modul / Aplikasi Baru"
            maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Project</label>
              <select
                value={newModuleProjectId}
                onChange={(e) => setNewModuleProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all"
              >
                <option value="">-- Pilih Project --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Modul / Aplikasi</label>
              <Input 
                value={newModuleNamaModul} 
                onChange={(e: any) => setNewModuleNamaModul(e.target.value)}
                placeholder="misal: Front Office, Settlement, Auth Service"
                className="!bg-white border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan</label>
              <textarea
                value={newModuleKeterangan}
                onChange={(e) => setNewModuleKeterangan(e.target.value)}
                placeholder="Deskripsi singkat modul/aplikasi..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button variant="outline" onClick={() => setIsNewModuleModalOpen(false)} className="flex-1 justify-center py-3">
                Batal
              </Button>
              <Button onClick={handleCreateModule} disabled={isSaving} className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSaving ? 'Menyimpan...' : 'Tambah Modul'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Edit Modul */}
        <Modal 
            isOpen={isEditModuleModalOpen} 
            onClose={() => setIsEditModuleModalOpen(false)}
            title="Edit Modul / Aplikasi"
            maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Project</label>
              <select
                value={editingModuleProjectId}
                onChange={(e) => setEditingModuleProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all"
              >
                <option value="">-- Pilih Project --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Modul / Aplikasi</label>
              <Input 
                value={editingModuleNamaModul} 
                onChange={(e: any) => setEditingModuleNamaModul(e.target.value)}
                placeholder="misal: Front Office, Settlement, Auth Service"
                className="!bg-white border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan</label>
              <textarea
                value={editingModuleKeterangan}
                onChange={(e) => setEditingModuleKeterangan(e.target.value)}
                placeholder="Deskripsi singkat modul/aplikasi..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button variant="outline" onClick={() => setIsEditModuleModalOpen(false)} className="flex-1 justify-center py-3">
                Batal
              </Button>
              <Button onClick={handleUpdateModule} disabled={isSaving} className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </Modal>

        {deleteConfirmState?.isOpen && (
          <ConfirmationModal
            isOpen={deleteConfirmState?.isOpen || false}
            onClose={() => !isDeleting && setDeleteConfirmState(null)}
            title="Konfirmasi Penghapusan Master Data"
            message={`Apakah Anda yakin ingin menghapus "${deleteConfirmState?.label}"? Sistem akan memeriksa apakah data master ini sedang digunakan oleh task aktif.`}
            onConfirm={() => {
              if (deleteConfirmState) {
                deleteMasterData(deleteConfirmState.id);
              }
            }}
            confirmText="Ya, Hapus Permanen"
            cancelText="Batal"
            variant="danger"
            isLoading={isDeleting}
          />
        )}
    </div>
  );
};
