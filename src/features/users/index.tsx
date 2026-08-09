import React from 'react';
import {
  Users, UserPlus, Search, Edit2, Trash2, CheckCircle, XCircle, Clock, Save,
  ShieldAlert, Server, ChevronLeft, ChevronRight, Layout, ChevronDown, Copy,
  ShieldCheck, Award, UserCog, Eye, Info, HelpCircle, Lock, Shield, Download, Key
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { AppRole, UserPermissions } from '../../types';
import { AdminUserPanelProps, DEFAULT_PERMISSIONS } from './types';
import { DEFAULT_PERMISSIONS as ROLE_DEFAULT_PERMISSIONS } from '../../lib/permissions';
import { useAdminUsers } from './hooks';
import { Button, Modal, UserAvatar } from './styles';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';

const MODULE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  dashboard: {
    label: "Dashboard",
    desc: "Provides a birds-eye summary of active work streams, sprint tasks, progress metrics, and general workspace health."
  },
  meetingNotes: {
    label: "Meeting Notes",
    desc: "Collaborative hub for meeting notes, registering structural discussion points, allocating actions, and tracking choices."
  },
  wiki: {
    label: "Dokumentasi",
    desc: "Collaborative hub for project documentation and knowledge sharing."
  },
  notebooklm: {
    label: "NotebookLM",
    desc: "Grounded AI research assistant, document synthesis, and audio overview powered by Gemini."
  },
  flowchart: {
    label: "Flowchart Editor",
    desc: "Interactive tool for creating, editing, and mapping project workflows and process diagrams."
  },
  list: {
    label: "Issue List",
    desc: "The primary registry for filing bugs, writing user stories, planning tasks, and filtering the complete target workspace."
  },
  sprints: {
    label: "Planning",
    desc: "Used by managers to manage sprint backlogs, schedule targets, adjust milestones, and run planning ceremonies."
  },
  board: {
    label: "Kanban Board",
    desc: "Visual, interactive columns for the active sprint where members pull tasks across In-Progress, Review, and Done stages."
  },
  qa: {
    label: "QA Testing",
    desc: "Manages test scenarios, test cases, and quality assurance workflows for project modules."
  },
  timeline: {
    label: "Roadmap",
    desc: "Interactive Gantt-style planning showing epic schedules, dependencies, and chronological product launches."
  },
  access: {
    label: "Team",
    desc: "Gives managers clear insights into engineer workload factors, role matrices, skill charts, and team member capacity."
  },
  userManagement: {
    label: "User Management",
    desc: "Manages user access, roles, and permissions."
  },
  masterData: {
    label: "Master Data",
    desc: "Manages core system data."
  },
  auditLog: {
    label: "Enterprise Audit",
    desc: "Highly-granular security recording tracking all structural modifications, deletions, updates, and database actions."
  },
  dbExplorer: {
    label: "DB Explorer",
    desc: "Direct database access and exploration tool."
  },
  settings: {
    label: "Integration Settings",
    desc: "Manages Email and WhatsApp integration configurations."
  }
};

const ROLE_DESCRIPTIONS: Record<AppRole, { label: string; badgeColor: string; icon: React.ReactNode; desc: string }> = {
  admin: {
    label: "Administrator",
    badgeColor: "bg-rose-50 border-rose-200 text-rose-700",
    icon: <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />,
    desc: "Bypasses all control gates. Granted complete read, create, update, and delete access in all modules, settings, and team workspaces."
  },
  head: {
    label: "Department Head",
    badgeColor: "bg-purple-50 border-purple-200 text-purple-700",
    icon: <Award className="w-4 h-4 text-purple-600 shrink-0" />,
    desc: "Supervises whole business units. Can browse metrics, collaborate on documentation, review audit screens, and inspect operations."
  },
  manager: {
    label: "Project Manager",
    badgeColor: "bg-blue-50 border-blue-200 text-blue-700",
    icon: <UserCog className="w-4 h-4 text-blue-600 shrink-0" />,
    desc: "Orchestrated to run specific project fields, draft task specs, spin up sprints, review PR checklists, and direct developer assignments."
  },
  user: {
    label: "Standard User",
    badgeColor: "bg-indigo-50 border-indigo-200 text-indigo-700",
    icon: <Users className="w-4 h-4 text-indigo-600 shrink-0" />,
    desc: "The core collaborator. Empowered to write issues, move card lanes, collaborate on discussion points, and assign items to their plate."
  },
  viewer: {
    label: "Observer",
    badgeColor: "bg-slate-100 border-slate-300 text-slate-700",
    icon: <Eye className="w-4 h-4 text-slate-600 shrink-0" />,
    desc: "Read-only workspace access. Best suited for clients, corporate stakeholders, or general auditors who need high visibility into work items."
  }
};

const ACTION_DESCRIPTIONS = {
  read: "Read: View permission to browse, search, and load module entries.",
  create: "Create: Modification privilege to write and add new records.",
  update: "Update: Modification privilege to edit and refine existing entries.",
  delete: "Delete: Destructive privilege to permanently purge data or archive entities."
};

const STATUS_DESCRIPTIONS = {
  approved: "Approved: Account is active and clearance permissions are fully enabled.",
  pending: "Pending: Awaiting Administrator verification review and clearance setup.",
  rejected: "Rejected: Inactive account. Access is restricted and features are locked."
};

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

export const AdminUserPanel: React.FC<AdminUserPanelProps> = (props) => {
  const { projects, tasks, masterData } = props;
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [isInviteSuccessModalOpen, setIsInviteSuccessModalOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'settings'>('overview');

  // Project Assignment State
  const [selectedAssignProjectId, setSelectedAssignProjectId] = React.useState('');
  const [selectedAssignProjectRole, setSelectedAssignProjectRole] = React.useState('member');
  const [isAssigningProject, setIsAssigningProject] = React.useState(false);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = React.useState<string[]>([]);

  // Custom confirmation modal state to avoid iframe window.confirm block
  const [confirmModal, setConfirmModal] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Tooltip Mouse Event Handler State
  const [hoveredTooltip, setHoveredTooltip] = React.useState<{ text: string; x: number; y: number } | null>(null);

  const handleMouseEnter = (text: string, e: React.MouseEvent) => {
    const tooltipWidth = 260; // max-w-xs approximate
    const tooltipHeight = 70;

    let x = e.clientX;
    let y = e.clientY;

    // Safety boundaries to avoid viewport overflow
    if (x + tooltipWidth > window.innerWidth) {
      x = window.innerWidth - tooltipWidth - 20;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - 20;
    }

    setHoveredTooltip({
      text,
      x,
      y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredTooltip) {
      const tooltipWidth = 260;
      const tooltipHeight = 70;
      let x = e.clientX;
      let y = e.clientY;

      if (x + tooltipWidth > window.innerWidth) {
        x = window.innerWidth - tooltipWidth - 20;
      }
      if (y + tooltipHeight > window.innerHeight) {
        y = window.innerHeight - tooltipHeight - 20;
      }

      setHoveredTooltip({
        text: hoveredTooltip.text,
        x,
        y
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  const handleAssignProject = async (userId: string) => {
    if (!selectedAssignProjectId) {
      toast.error('Pilih project terlebih dahulu');
      return;
    }
    setIsAssigningProject(true);
    try {
      const payload: any = {
        newMemberId: userId,
        newMemberRole: selectedAssignProjectRole
      };
      if (selectedAssignProjectRole === 'admin') {
        payload.teamMemberIds = selectedTeamMemberIds;
      }

      const data = await apiRequest(`/api/projects/${selectedAssignProjectId}/members`, {
        method: 'PUT',
        headers: {
          'x-user-id': props.currentUserId || 'guest'
        },
        body: payload
      });
      if (data.status === 'success') {
        toast.success('User berhasil ditambahkan ke Project!');
        setSelectedAssignProjectId('');
        setSelectedAssignProjectRole('member');
        setSelectedTeamMemberIds([]);
        if (props.onRefreshProjects) {
          props.onRefreshProjects();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 800);
        }
      } else {
        toast.error(data.message || 'Gagal menambahkan ke project');
      }
    } catch (e) {
      console.error(e);
      toast.error('Terjadi kesalahan saat menambahkan ke project');
    } finally {
      setIsAssigningProject(false);
    }
  };

  const handleRemoveProject = (projectId: string, userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Keluarkan dari Project',
      message: 'Apakah Anda yakin ingin mengeluarkan user dari project ini?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        try {
          const data = await apiRequest(`/api/projects/${projectId}/members/${userId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': props.currentUserId || 'guest' }
          });
          if (data.status === 'success') {
            toast.success('User berhasil dihapus dari Project');
            if (props.onRefreshProjects) {
              props.onRefreshProjects();
            } else {
              setTimeout(() => {
                window.location.reload();
              }, 800);
            }
          } else {
            toast.error(data.message || 'Gagal menghapus user dari project');
          }
        } catch (e) {
          console.error(e);
          toast.error('Terjadi kesalahan saat menghapus user dari project');
        }
      }
    });
  };

  const [addPeopleUsername, setAddPeopleUsername] = React.useState('');
  const [addPeopleFullName, setAddPeopleFullName] = React.useState('');
  const [addPeopleEmail, setAddPeopleEmail] = React.useState('');
  const [addPeoplePassword, setAddPeoplePassword] = React.useState('');
  const [addPeoplePhone, setAddPeoplePhone] = React.useState('');
  const [addPeopleDepartment, setAddPeopleDepartment] = React.useState('');
  const [addPeopleJabatan, setAddPeopleJabatan] = React.useState('');
  const [addPeopleRole, setAddPeopleRole] = React.useState<AppRole>('user');
  const [addPeopleStatus, setAddPeopleStatus] = React.useState<'approved' | 'pending' | 'rejected'>('approved');
  const [successEmail, setSuccessEmail] = React.useState('');

  const handleAddPeople = async () => {
    if (!addPeopleUsername || !addPeopleFullName || !addPeopleEmail || !addPeoplePassword) {
      toast.error('Semua kolom wajib diisi');
      return;
    }

    try {
      const normalizedUsername = addPeopleUsername.trim().toLowerCase().replace(/\s+/g, '_');
      const selectedRolePermissions = ROLE_DEFAULT_PERMISSIONS[addPeopleRole] || ROLE_DEFAULT_PERMISSIONS.viewer;

      const data = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          username: normalizedUsername,
          password: addPeoplePassword,
          displayName: addPeopleFullName,
          email: addPeopleEmail,
          department: addPeopleDepartment,
          position: addPeopleJabatan,
          status: addPeopleStatus,
          role: addPeopleRole,
          permissions: selectedRolePermissions,
          phone: addPeoplePhone
        }
      });

      if (data.status !== 'success') {
         toast.error(data.message || 'Username sudah digunakan atau register gagal');
         return;
      }

      setSuccessEmail(addPeopleEmail);
      setIsInviteModalOpen(false);
      setIsInviteSuccessModalOpen(true);

      setAddPeopleUsername('');
      setAddPeopleFullName('');
      setAddPeopleEmail('');
      setAddPeoplePassword('');
      setAddPeoplePhone('');
      setAddPeopleDepartment('');
      setAddPeopleJabatan('');
      setAddPeopleRole('user');
      setAddPeopleStatus('approved');

    } catch (e) {
      console.error('Error adding user:', e);
      toast.error('Failed to add user');
    }
  };

  const {
    users,
    searchTerm,
    setSearchTerm,
    loading,
    selectedUser,
    isEditModalOpen,
    setIsEditModalOpen,
    isViewModalOpen,
    setIsViewModalOpen,
    editRole,
    setEditRole,
    editStatus,
    setEditStatus,
    editPermissions,
    setEditPermissions,
    editDepartment,
    setEditDepartment,
    editPosition,
    setEditPosition,
    editFullName,
    setEditFullName,
    editEmail,
    setEditEmail,
    editPassword,
    setEditPassword,
    editPhone,
    setEditPhone,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    handleUpdateUser,
    handleDeleteUser,
    openEditModal,
    openViewModal,
    togglePermission,
    filteredUsers,
    totalPages,
    paginatedUsers,
    fetchUsers
  } = useAdminUsers();

  // Point 1: Bulk Actions State
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [isBulkActionPending, setIsBulkActionPending] = React.useState(false);

  // Point 5: Real-time validation errors & Password Strength Indicator
  const [usernameError, setUsernameError] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [passwordStrength, setPasswordStrength] = React.useState<'weak' | 'medium' | 'strong' | ''>('');

  // Clean-up selections on filters change
  React.useEffect(() => {
    setSelectedUserIds([]);
  }, [searchTerm, filterRole, filterStatus]);

  // Username validation helper
  const handleUsernameChange = (val: string) => {
    setAddPeopleUsername(val);
    if (!val) {
      setUsernameError('Username wajib diisi');
      return;
    }
    const clean = val.trim().toLowerCase();
    if (clean !== val) {
      setUsernameError('Username harus huruf kecil semua, tanpa spasi');
      return;
    }
    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(val)) {
      setUsernameError('Hanya huruf kecil, angka, dan underscore (3-20 karakter)');
    } else {
      setUsernameError('');
    }
  };

  // Email validation helper
  const handleEmailChange = (val: string) => {
    setAddPeopleEmail(val);
    if (!val) {
      setEmailError('Email wajib diisi');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Format email tidak valid (contoh: nama@domain.com)');
    } else {
      setEmailError('');
    }
  };

  // Password Strength check helper
  const handlePasswordChange = (val: string) => {
    setAddPeoplePassword(val);
    if (!val) {
      setPasswordStrength('');
      return;
    }
    if (val.length < 6) {
      setPasswordStrength('weak');
    } else if (val.length < 10) {
      const hasNumbers = /\d/.test(val);
      const hasSps = /[^a-zA-Z0-9]/.test(val);
      if (hasNumbers || hasSps) {
        setPasswordStrength('medium');
      } else {
        setPasswordStrength('weak');
      }
    } else {
      const hasNumbers = /\d/.test(val);
      const hasSps = /[^a-zA-Z0-9]/.test(val);
      if (hasNumbers && hasSps) {
        setPasswordStrength('strong');
      } else {
        setPasswordStrength('medium');
      }
    }
  };

  // Point 2: Export currently filtered users to CSV file
  const handleExportCSV = () => {
    try {
      if (filteredUsers.length === 0) {
        toast.error('Tidak ada data user untuk di-export');
        return;
      }

      const headers = ['ID', 'Username', 'Nama Lengkap', 'Email', 'No HP/WA', 'Role', 'Status', 'Departemen', 'Jabatan', 'Dibuat Pada'];
      const rows = filteredUsers.map(u => [
        u.id,
        u?.username || '',
        u?.displayName || '',
        u?.email || '',
        u.phone || '',
        u.role || '',
        u.status || '',
        u.department ? getDepartmentName(u.department) : '',
        u.position ? getPositionName(u.position) : '',
        (u as any).createdAt || ''
      ]);

      const csvContent = "data:text/csv;charset=utf-8,"
        + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `user_list_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Berhasil meng-export ${filteredUsers.length} user ke CSV!`);
    } catch (e) {
      console.error(e);
      toast.error('Gagal meng-export CSV');
    }
  };

  // Point 1: Bulk Action executor calling existing backend PUT/DELETE
  const handleBulkAction = async (action: 'approve' | 'reject' | 'delete' | AppRole) => {
    if (selectedUserIds.length === 0) {
      toast.error('Pilih setidaknya satu user');
      return;
    }

    if (action === 'delete') {
      const hasAdmins = filteredUsers.some(u => selectedUserIds.includes(u.id) && u.role === 'admin');
      if (hasAdmins) {
        toast.error('Tidak dapat menghapus user dengan role Admin secara massal');
        return;
      }
      const hasSelf = selectedUserIds.includes(props.currentUserId || '');
      if (hasSelf) {
        toast.error('Tidak dapat menghapus akun Anda sendiri secara massal');
        return;
      }
    }

    setIsBulkActionPending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      await Promise.all(selectedUserIds.map(async (userId) => {
        try {
          if (action === 'delete') {
            const data = await apiRequest(`/api/users/${userId}`, { method: 'DELETE' });
            if (data.status === 'success') successCount++;
            else failCount++;
          } else if (action === 'approve' || action === 'reject') {
            const data = await apiRequest(`/api/users/${userId}`, {
              method: 'PUT',
              body: { status: action === 'approve' ? 'approved' : 'rejected' }
            });
            if (data.status === 'success') successCount++;
            else failCount++;
          } else {
            const data = await apiRequest(`/api/users/${userId}`, {
              method: 'PUT',
              body: { role: action }
            });
            if (data.status === 'success') successCount++;
            else failCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Error bulk action on user ${userId}:`, err);
        }
      }));

      toast.success(`Aksi Massal Selesai! Berhasil: ${successCount}, Gagal: ${failCount}`);
      setSelectedUserIds([]);
      fetchUsers();
    } catch (e) {
      console.error(e);
      toast.error('Gagal menjalankan aksi massal');
    } finally {
      setIsBulkActionPending(false);
    }
  };

  const getDepartmentName = (id: string) => masterData.find(d => d.type === 'department' && d.id === id)?.label || id;
  const getPositionName = (id: string) => masterData.find(d => d.type === 'jabatan' && d.id === id)?.label || id;

  const totalUsersCount = users.length;
  const approvedUsersCount = users.filter(u => u.status === 'approved').length;
  const pendingUsersCount = users.filter(u => u.status === 'pending').length;
  const adminUsersCount = users.filter(u => u.role === 'admin').length;

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading users...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 w-full h-full">
      <div className="flex-1 overflow-y-auto p-3 md:p-6 w-full animate-in fade-in duration-700">
        <div className="flex flex-col space-y-6 min-h-full">
          {/* Header & Controls */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/50 p-8 shrink-0">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">User Management</h3>
                        <p className="text-slate-500 font-medium text-sm">Manage user access, roles, and permissions.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleExportCSV}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 hover:border-indigo-300 font-bold py-2.5 px-6 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                    >
                        <Download className="w-4 h-4 text-indigo-650" /> Export CSV
                    </Button>
                    <Button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20"
                    >
                        <UserPlus className="w-4 h-4 mr-2" /> Add User
                    </Button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, username, or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    />
                </div>
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 font-medium"
                >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="head">Head</option>
                    <option value="manager">Manager</option>
                    <option value="user">User</option>
                    <option value="viewer">Viewer</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-slate-700 font-medium"
                >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Users className="w-6 h-6" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total User</div>
                      <div className="text-2xl font-black text-slate-800 leading-none mt-1">{totalUsersCount}</div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disetujui</div>
                      <div className="text-2xl font-black text-slate-800 leading-none mt-1">{approvedUsersCount}</div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Menunggu</div>
                      <div className="text-2xl font-black text-slate-800 leading-none mt-1">{pendingUsersCount}</div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6" />
                  </div>
                  <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrator</div>
                      <div className="text-2xl font-black text-slate-800 leading-none mt-1">{adminUsersCount}</div>
                  </div>
              </div>
          </div>

          {/* User List */}
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/50 overflow-hidden flex-1 flex flex-col">
            {selectedUserIds.length > 0 && (
            <div className="bg-indigo-50/80 border-b border-indigo-100 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {selectedUserIds.length}
                </span>
                <span className="text-sm font-bold text-indigo-950">pengguna terpilih untuk Aksi Massal</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkAction('approve')}
                  disabled={isBulkActionPending}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Setujui
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  disabled={isBulkActionPending}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Pending/Tolak
                </button>

                <div className="relative inline-block text-left">
                  <select
                    disabled={isBulkActionPending}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkAction(e.target.value as AppRole);
                        e.target.value = "";
                      }
                    }}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-750 text-xs font-bold rounded-lg shadow-2xs focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                  >
                    <option value="">Ubah Role Massal...</option>
                    <option value="admin">Administrator</option>
                    <option value="head">Department Head</option>
                    <option value="manager">Project Manager</option>
                    <option value="user">Standard User</option>
                    <option value="viewer">Observer</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Hapus Pengguna Massal',
                      message: `Apakah Anda yakin ingin menghapus ${selectedUserIds.length} pengguna terpilih secara massal? Tindakan ini tidak dapat dibatalkan.`,
                      onConfirm: () => handleBulkAction('delete')
                    });
                  }}
                  disabled={isBulkActionPending}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Massal
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  disabled={isBulkActionPending}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-705 text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="py-5 px-4 text-center w-12">
                    <input
                      type="checkbox"
                      checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUserIds.includes(u.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newIds = [...selectedUserIds];
                          paginatedUsers.forEach(u => {
                            if (!newIds.includes(u.id)) newIds.push(u.id);
                          });
                          setSelectedUserIds(newIds);
                        } else {
                          const paginatedIds = paginatedUsers.map(u => u.id);
                          setSelectedUserIds(selectedUserIds.filter(id => !paginatedIds.includes(id)));
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">User</th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Department / Position</th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Proyek & Tugas</th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500">Role</th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 text-center">Status</th>
                  <th className="py-5 px-6 font-bold text-xs uppercase tracking-wider text-slate-500 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {paginatedUsers.map((user) => {
                  const userProjectsCount = (projects || []).filter(p =>
                    (p.members && (p.members.includes(user.id) || p.members.includes(user.uid))) ||
                    p.ownerId === user.id ||
                    p.ownerId === user.uid
                  ).length;

                  const userTasksCount = (tasks || []).filter(t =>
                    t.assigneeId === user.id ||
                    t.assigneeId === user.uid ||
                    (t.assignees && (t.assignees.includes(user.id) || t.assignees.includes(user.uid))) ||
                    t.assigneeEmail === user?.email
                  ).length;

                  return (
                    <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6 cursor-pointer" onClick={() => { if (props.onSelectUserForDetail) props.onSelectUserForDetail(user); }}>
                        <div className="flex items-center gap-4">
                          <UserAvatar user={user} className="w-10 h-10 text-base" />
                          <div>
                            <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                              {user?.displayName || user?.username}
                            </div>
                            <div className="text-xs text-slate-500">{user?.email || 'Email tidak tersedia'}</div>
                            {user.phone && (
                              <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                                <span>WA/HP:</span>
                                <span>{user.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                          <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700">
                                  {user.department ? getDepartmentName(user.department) : '-'}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                                  {user.position ? getPositionName(user.position) : '-'}
                              </span>
                          </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border transition-colors",
                              userProjectsCount > 0
                                ? "bg-indigo-50/65 text-indigo-700 border-indigo-100/70"
                                : "bg-slate-50/50 text-slate-400 border-slate-100"
                            )}>
                              <Layout className="w-3 h-3 text-indigo-500" />
                              <span>{userProjectsCount} Proyek</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border transition-colors",
                              userTasksCount > 0
                                ? "bg-violet-50/65 text-violet-700 border-violet-100/70"
                                : "bg-slate-50/50 text-slate-400 border-slate-100"
                            )}>
                              <CheckCircle className="w-3 h-3 text-violet-500" />
                              <span>{userTasksCount} Tugas</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "inline-flex font-black text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-lg border",
                          user.role === 'admin' ? "bg-rose-50 text-rose-600 border-rose-200" :
                          user.role === 'head' ? "bg-purple-50 text-purple-600 border-purple-200" :
                          user.role === 'manager' ? "bg-blue-50 text-blue-600 border-blue-200" :
                          "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {user.role}
                        </span>
                      </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        {user.status === 'approved' ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500" title="Disetujui">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        ) : user.status === 'pending' ? (
                          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 animate-pulse" title="Menunggu">
                            <Clock className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500" title="Ditolak">
                            <XCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            if (props.onSelectUserForDetail) {
                              props.onSelectUserForDetail(user);
                            } else {
                              setActiveTab('overview');
                              openEditModal(user);
                            }
                          }}
                          className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer font-bold flex items-center justify-center gap-1"
                          title="Detail Pengguna"
                        >
                          <UserCog className="w-4 h-4 shrink-0" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Hapus Pengguna',
                              message: `Apakah Anda yakin ingin menghapus pengguna ${user?.displayName || user?.username} secara permanen?`,
                              onConfirm: async () => {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                try {
                                  const data = await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' });
                                  if (data.status !== 'success') throw new Error(data.message);
                                  toast.success('User deleted successfully');
                                  fetchUsers(); // Refresh
                                } catch (error: any) {
                                  toast.error('Failed to delete user: ' + (error.message || 'Error'));
                                  console.error(error);
                                }
                              }
                            });
                          }}
                          disabled={user.role === 'admin'}
                          className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed font-bold flex items-center justify-center gap-1"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
                {paginatedUsers.length === 0 && (
                   <tr>
                       <td colSpan={7} className="py-12 text-center text-slate-500">
                           No users found matching your criteria.
                       </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>

           {/* Pagination */}
           {totalPages > 1 && (
            <div className="border-t border-slate-100 p-4 flex items-center justify-between bg-slate-50/50 mt-auto">
              <span className="text-sm font-medium text-slate-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn(
                            "w-8 h-8 rounded-lg text-sm font-bold transition-colors",
                            currentPage === i + 1 ? "bg-indigo-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {i + 1}
                    </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
           )}
        </div>
        </div>
      </div>

      <AnimatePresence>
        {/* Edit/Manage User Modal */}
        {isEditModalOpen && (
          <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Detail & Kelola Pengguna" maxWidth="max-w-7xl">
            {selectedUser && (
              <div className="space-y-6">

                {/* Header Profile Info Card */}
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-300">
                  <UserAvatar user={selectedUser} className="w-20 h-20 text-3xl shadow-md border-4 border-white ring-4 ring-indigo-50 shrink-0" />
                  <div className="flex-1 text-center sm:text-left space-y-3">
                      <div>
                          <h2 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">{selectedUser?.displayName || selectedUser?.username}</h2>
                          <p className="text-xs font-semibold text-slate-400 mt-1">@{selectedUser?.username}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                           {/* Custom Role Badge with icon */}
                           <span className={cn(
                             "inline-flex items-center gap-1.5 font-extrabold text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border shadow-2xs",
                             selectedUser.role === 'admin' ? "bg-rose-50 text-rose-600 border-rose-200" :
                             selectedUser.role === 'head' ? "bg-purple-50 text-purple-600 border-purple-200" :
                             selectedUser.role === 'manager' ? "bg-blue-50 text-blue-600 border-blue-200" :
                             selectedUser.role === 'user' ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                             "bg-slate-50 text-slate-600 border-slate-200"
                           )}>
                             {selectedUser.role === 'admin' && <ShieldCheck className="w-3 h-3 shrink-0" />}
                             {selectedUser.role === 'head' && <Award className="w-3 h-3 shrink-0" />}
                             {selectedUser.role === 'manager' && <UserCog className="w-3 h-3 shrink-0" />}
                             {selectedUser.role === 'user' && <Users className="w-3 h-3 shrink-0" />}
                             {selectedUser.role === 'viewer' && <Eye className="w-3 h-3 shrink-0" />}
                             {selectedUser.role}
                           </span>

                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-650 rounded-full text-xs font-bold shadow-2xs mr-1">
                               {selectedUser?.email || 'Email tidak tersedia'}
                           </span>

                           <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold shadow-2xs mr-1">
                               WA/HP: {selectedUser.phone || 'Tidak tersedia'}
                           </span>

                           {/* Custom Account Status Badge */}
                           <span className={cn(
                             "inline-flex items-center gap-1.5 font-extrabold text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full border shadow-2xs",
                             selectedUser.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                             selectedUser.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" :
                             "bg-rose-50 text-rose-600 border-rose-200"
                           )}>
                             {selectedUser.status}
                           </span>
                      </div>

                      {(selectedUser.department || selectedUser.position) && (
                        <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-1.5 text-xs text-slate-500 font-semibold border-t border-slate-200/40 w-full">
                          {selectedUser.department && (
                            <div className="text-left">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Department</span>
                              <span className="text-slate-700 font-bold">{getDepartmentName(selectedUser.department)}</span>
                            </div>
                          )}
                          {selectedUser.position && (
                            <div className="text-left">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-widest">Position</span>
                              <span className="text-slate-700 font-bold">{getPositionName(selectedUser.position)}</span>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* COMBINED ONE-PANEL USER MANAGEMENT AND ENGAGEMENT */}
                {(() => {
                  const userProjects = projects.filter(p => {
                    const r = p.memberRoles || {};
                    return Object.keys(r).includes(selectedUser.id) || Object.keys(r).includes(selectedUser.uid);
                  });
                  const userTasks = tasks.filter(t => t.assigneeId === selectedUser.id || t.assignees?.includes(selectedUser.id));
                  const otherTasks = userTasks.filter(t => !userProjects.some(p => p.id === t.projectId));

                  return (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">

                      {/* LEFT COLUMN: Account, Access controls & System Permissions Grid (5 cols) */}
                      <div className="xl:col-span-5 space-y-6">
                        {/* Status & Organisation Card */}
                        <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-5 space-y-4">
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest border-b border-slate-200/60 pb-2 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-indigo-500" />
                            Pengaturan Akun & Organisasi
                          </h4>

                          <div className="space-y-4">
                            {/* System Role Selection */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Role</label>
                                <select
                                    value={editRole}
                                    onChange={(e) => {
                                      const newRole = e.target.value as AppRole;
                                      setEditRole(newRole);
                                      // Synchronize checked permissions directly with role defaults!
                                      setEditPermissions(ROLE_DEFAULT_PERMISSIONS[newRole] || ROLE_DEFAULT_PERMISSIONS.user);
                                    }}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-black text-slate-700 cursor-pointer"
                                >
                                    <option value="admin">Administrator (Full Access)</option>
                                    <option value="head">Department Head (Head)</option>
                                    <option value="manager">Project Manager (Manager)</option>
                                    <option value="user">Standard User (User)</option>
                                    <option value="viewer">Observer (Viewer - Read Only)</option>

                                    {/* Dynamic custom system roles from master data */}
                                    {masterData
                                      .filter(d => d.type === 'project_role' && (d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM'))
                                      .map(role => {
                                        const roleValue = (role.label || '').toLowerCase();
                                        if (['admin', 'head', 'manager', 'user', 'viewer', 'administrator', 'department head', 'project manager', 'standard user', 'observer'].includes(roleValue)) {
                                          return null;
                                        }
                                        return (
                                          <option key={role.id} value={role.label}>
                                            {role.label}
                                          </option>
                                        );
                                      })
                                    }
                                </select>
                            </div>

                            {/* Beautiful dynamic helper/description card under the System Role selector */}
                            {editRole && (
                              ROLE_DESCRIPTIONS[editRole] ? (
                                <div className={cn(
                                  "p-3 rounded-2xl border text-[11px] leading-relaxed transition-all flex gap-3 animate-in fade-in duration-200",
                                  editRole === 'admin' ? "bg-rose-50/55 border-rose-100/65 text-rose-800" :
                                  editRole === 'head' ? "bg-purple-50/55 border-purple-100/65 text-purple-800" :
                                  editRole === 'manager' ? "bg-blue-50/55 border-blue-100/65 text-blue-800" :
                                  editRole === 'user' ? "bg-indigo-50/55 border-indigo-100/65 text-indigo-800" :
                                  "bg-slate-50 border-slate-200/50 text-slate-700"
                                )}>
                                  <div className="shrink-0 mt-0.5">
                                    {ROLE_DESCRIPTIONS[editRole].icon}
                                  </div>
                                  <div className="space-y-0.5">
                                      <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800">
                                         {ROLE_DESCRIPTIONS[editRole].label} Authorization
                                      </p>
                                      <p className="font-medium text-[11px] text-slate-500 leading-snug">
                                         {ROLE_DESCRIPTIONS[editRole].desc}
                                      </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 rounded-2xl border text-[11px] leading-relaxed transition-all flex gap-3 animate-in fade-in duration-200 bg-indigo-50/55 border-indigo-100/65 text-indigo-800">
                                  <div className="shrink-0 mt-0.5">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                  </div>
                                  <div className="space-y-0.5">
                                      <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-800">
                                         {editRole} Authorization
                                      </p>
                                      <p className="font-medium text-[11px] text-slate-500 leading-snug">
                                         Custom system role defined in master data. Configure permissions manually using the overrides grid below.
                                      </p>
                                  </div>
                                </div>
                              )
                            )}

                            {/* Account Status */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Status</label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-black text-slate-700 cursor-pointer"
                                >
                                    <option value="approved">Active / Approved</option>
                                    <option value="pending">Waiting for Approval</option>
                                    <option value="rejected">Suspended / Rejected</option>
                                </select>
                            </div>

                            {/* Department */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                                <select
                                    value={editDepartment}
                                    onChange={(e) => setEditDepartment(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                >
                                    <option value="">Select Department</option>
                                    {masterData.filter(d => d.type === 'department').map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Position */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Position</label>
                                <select
                                    value={editPosition}
                                    onChange={(e) => setEditPosition(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                >
                                    <option value="">Select Position</option>
                                    {masterData.filter(d => d.type === 'jabatan').map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Full Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <Input
                                    value={editFullName}
                                    onChange={(e: any) => setEditFullName(e.target.value)}
                                    placeholder="Enter full name"
                                    className="!py-2.5 !text-xs !bg-white"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                <Input
                                    value={editEmail}
                                    onChange={(e: any) => setEditEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="!py-2.5 !text-xs !bg-white"
                                />
                            </div>

                            {/* Nomor HP / WhatsApp */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nomor HP / WhatsApp</label>
                                <Input
                                    value={editPhone}
                                    onChange={(e: any) => setEditPhone(e.target.value)}
                                    placeholder="Contoh: 081234567890"
                                    className="!py-2.5 !text-xs !bg-white"
                                />
                            </div>

                            {/* Update Password */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Password</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                                            let pass = "";
                                            for (let i = 0; i < 12; i++) {
                                                pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                            }
                                            setEditPassword(pass);
                                            navigator.clipboard.writeText(pass);
                                            toast.success(`Password acak dibuat: "${pass}". Berhasil disalin ke clipboard!`);
                                        }}
                                        className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 bg-indigo-50/85 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                                    >
                                        <Key className="w-2.5 h-2.5" /> Buat Password Acak
                                    </button>
                                </div>
                                <Input
                                    type="text"
                                    value={editPassword}
                                    onChange={(e: any) => setEditPassword(e.target.value)}
                                    placeholder="Masukkan password baru untuk mengubah (kosongkan jika tidak)"
                                    className="!py-2.5 !text-xs !bg-white"
                                />
                                <span className="text-[10px] text-slate-400 font-medium italic block mt-0.5">
                                  Kosongkan jika tidak ingin mengubah password.
                                </span>
                            </div>
                          </div>
                        </div>

                        {/* Custom Permissions Grid */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-3xs">
                            <div className="border-b border-slate-100 pb-3">
                                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest">Active System Permissions & Overrides</h4>
                                <p className="text-[11px] text-slate-500 font-medium leading-normal mt-1">Configure explicit permission overrides for this user account. Hover headers or modules for detailed permission insights.</p>
                            </div>

                            {editRole === 'admin' && (
                                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50/50 border border-amber-100/65 px-3 py-2.5 rounded-xl text-xs font-bold leading-normal">
                                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                                    <span><strong>Administrator Role</strong> defaults to full access, but explicitly customized module permissions and overrides will be strictly enforced.</span>
                                </div>
                            )}

                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs max-w-full overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2 px-3 font-extrabold text-[9px] text-slate-400 uppercase tracking-widest">Module</th>
                                            {(['read', 'create', 'update', 'delete'] as const).map(action => (
                                              <th
                                                key={action}
                                                onMouseEnter={(e) => handleMouseEnter(ACTION_DESCRIPTIONS[action], e)}
                                                onMouseMove={handleMouseMove}
                                                onMouseLeave={handleMouseLeave}
                                                className="py-2 px-1 font-extrabold text-[9px] text-slate-400 uppercase tracking-widest text-center w-14 cursor-help hover:text-indigo-650 transition-colors"
                                              >
                                                <span className="border-b border-dashed border-slate-350 pb-0.5">{action}</span>
                                              </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {(Object.keys(DEFAULT_PERMISSIONS) as Array<keyof UserPermissions>).map(module => {
                                            const moduleInfo = MODULE_DESCRIPTIONS[module] || { label: module, desc: "" };
                                            return (
                                                <tr key={module} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="py-2 px-3 font-medium text-slate-700 font-semibold text-[11px]">
                                                        <div
                                                            onMouseEnter={(e) => handleMouseEnter(moduleInfo.desc, e)}
                                                            onMouseMove={handleMouseMove}
                                                            onMouseLeave={handleMouseLeave}
                                                            className="inline-flex items-center gap-1 cursor-help hover:text-indigo-650 transition-colors"
                                                        >
                                                            <span>{moduleInfo.label}</span>
                                                            <HelpCircle className="w-3 h-3 text-slate-300 shrink-0 select-none" />
                                                        </div>
                                                    </td>
                                                    {(['read', 'create', 'update', 'delete'] as const).map(action => {
                                                        const isChecked = editPermissions[module]?.[action];
                                                        const actionLabel = action === 'read' ? 'view' : action === 'create' ? 'write key' : action === 'update' ? 'edit' : 'delete';
                                                        const isDefaultGranted = ROLE_DEFAULT_PERMISSIONS[editRole]?.[module]?.[action];
                                                        const isOverride = isChecked !== isDefaultGranted;

                                                        const tooltipText = isChecked
                                                          ? `Custom Granted${isOverride ? " (Explicit Override)" : ""}: Click to revoke ${actionLabel} access for ${moduleInfo.label}`
                                                          : `Custom Suspended${isOverride ? " (Explicit Override)" : ""}: Click to grant ${actionLabel} access for ${moduleInfo.label}`;

                                                        return (
                                                            <td key={action} className="py-2 px-1 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => togglePermission(module, action)}
                                                                    onMouseEnter={(e) => handleMouseEnter(tooltipText, e)}
                                                                    onMouseMove={handleMouseMove}
                                                                    onMouseLeave={handleMouseLeave}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all duration-200 cursor-pointer border relative",
                                                                        isChecked
                                                                            ? "bg-indigo-600 text-white border-indigo-500 scale-105 active:scale-95"
                                                                            : "bg-slate-50 text-slate-300 border-slate-200 hover:bg-slate-100 active:scale-95",
                                                                        isOverride && "ring-2 ring-amber-400 ring-offset-1"
                                                                    )}
                                                                >
                                                                    <CheckCircle className={cn("w-3.5 h-3.5 shrink-0 text-current", isChecked ? "opacity-100" : "opacity-0")} />
                                                                    {isOverride && (
                                                                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full ring-1 ring-white" title="Explicit Override" />
                                                                    )}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Project Involvement, Assigned Tasks & Delegation Form (7 cols) */}
                      <div className="xl:col-span-7 space-y-6">

                        {/* Work Overview Stats Bar */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50/60 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                              <Server className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Total Project</span>
                              <span className="text-lg font-black text-slate-800 leading-none">{userProjects.length}</span>
                            </div>
                          </div>
                          <div className="bg-slate-50/60 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Tugas Terdelegasi</span>
                              <span className="text-lg font-black text-slate-800 leading-none">{userTasks.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Projects & Tasks Rows */}
                        <div className="space-y-4">
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                            <Server className="w-4 h-4 text-indigo-500 shrink-0" />
                            Project Involvement & Assigned Tasks
                          </h4>

                          {userProjects.length === 0 ? (
                            <div className="text-center py-10 px-6 bg-slate-50/40 border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center">
                              <Server className="w-10 h-10 text-slate-300 mb-2.5 animate-pulse" />
                              <h5 className="font-bold text-slate-700 text-sm">Tidak Tergabung dalam Project</h5>
                              <p className="text-xs text-slate-455 font-semibold max-w-sm mt-1 leading-relaxed text-center font-medium">
                                Pengguna ini belum ditugaskan ke project apa pun saat ini. Silakan gunakan panel pendelegasian di bawah untuk memberikan akses.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {userProjects.map(p => {
                                const userRoleInProject = p.memberRoles?.[selectedUser.id] || p.memberRoles?.[selectedUser.uid] || 'viewer';
                                const projectTasks = userTasks.filter(t => t.projectId === p.id);

                                return (
                                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-3xs hover:border-slate-300 transition-all flex flex-col gap-4">
                                    {/* Project Header Row */}
                                    <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-650 flex items-center justify-center font-black text-xs border border-indigo-100 uppercase shrink-0">
                                          {p.key || p.name.substring(0, 3).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="font-extrabold text-slate-800 text-sm leading-tight">{p.name}</div>
                                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Project Key: <span className="font-mono">{p.key}</span></div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100/60 text-indigo-600 shadow-3xs">
                                          <UserCog className="w-3.5 h-3.5 shrink-0" />
                                          {userRoleInProject}
                                        </span>

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveProject(p.id, selectedUser.uid || selectedUser.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="Keluarkan dari project"
                                        >
                                          <Trash2 className="w-4 h-4 shrink-0" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Tasks Grouped inside Project (strictly per baris) */}
                                    <div className="space-y-2">
                                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                                        <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                                        Daftar Tugas Terdelegasi ({projectTasks.length})
                                      </div>

                                      {projectTasks.length > 0 ? (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white">
                                          {/* Table Header for Tasks on desktop */}
                                          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60">
                                            <div className="col-span-6">Tugas</div>
                                            <div className="col-span-2 text-center">Prioritas</div>
                                            <div className="col-span-2 text-center">Tipe</div>
                                            <div className="col-span-2 text-center">Status</div>
                                          </div>
                                          {projectTasks.map(t => {
                                            const statusLower = (t.status || '').toLowerCase();
                                            const isDone = statusLower === 'done' || statusLower === 'completed' || statusLower === 'selesai';
                                            const isInProgress = statusLower === 'in progress' || statusLower === 'active' || statusLower === 'sedang dikerjakan';
                                            const isReview = statusLower === 'review' || statusLower === 'ditinjau';

                                            return (
                                              <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-slate-50/50 transition-all group/task text-xs bg-white">
                                                {/* Key & Title */}
                                                <div className="col-span-1 md:col-span-6 flex items-center gap-2.5 min-w-0">
                                                  <span className="font-mono text-[9px] font-extrabold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 select-none">
                                                    {t.key}
                                                  </span>
                                                  <span className="font-bold text-slate-700 truncate group-hover/task:text-indigo-600 transition-colors">
                                                    {t.title}
                                                  </span>
                                                </div>

                                                {/* Priority Code */}
                                                <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                                  <span className={cn(
                                                    "text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[75px] border shadow-3xs",
                                                    t.priority === 'High' || t.priority === 'Tinggi' ? "text-rose-600 bg-rose-50 border-rose-200" :
                                                    t.priority === 'Medium' || t.priority === 'Sedang' ? "text-amber-600 bg-amber-50 border-amber-200" :
                                                    "text-slate-500 bg-slate-50 border-slate-250"
                                                  )}>
                                                    {t.priority}
                                                  </span>
                                                </div>

                                                {/* Task Type */}
                                                <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                                  <span className="text-[9.5px] font-extrabold uppercase flex items-center justify-center gap-1 bg-slate-50/80 px-2.5 py-0.5 rounded-full border border-slate-200 min-w-[75px] text-center shadow-3xs text-slate-500">
                                                    {t.type || 'task'}
                                                  </span>
                                                </div>

                                                {/* Task Status */}
                                                <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                                  <span className={cn(
                                                    "text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[90px] border shadow-3xs",
                                                    isDone ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                    isInProgress ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                    isReview ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                    "bg-slate-50 text-slate-500 border-slate-250"
                                                  )}>
                                                    {t.status}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 px-4 bg-slate-50/30 border border-slate-200 border-dashed rounded-xl">
                                          <p className="text-xs text-slate-400 font-semibold italic">Semua Beres! Tidak ada tugas terdelegasi pada project ini.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Detached/Other Tasks */}
                        {otherTasks.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-3xs flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-sm border border-amber-100 uppercase shrink-0">
                                MISC
                              </div>
                              <div>
                                <div className="font-extrabold text-slate-800 text-sm leading-tight">Tugas Mandiri / Project Lainnya</div>
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Tugas yang ditugaskan di luar project terdaftar</div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white">
                                {/* Table Header for Tasks on desktop */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 font-sans">
                                  <div className="col-span-6">Tugas</div>
                                  <div className="col-span-2 text-center">Prioritas</div>
                                  <div className="col-span-2 text-center">Tipe</div>
                                  <div className="col-span-2 text-center">Status</div>
                                </div>
                                {otherTasks.map(t => {
                                  const statusLower = (t.status || '').toLowerCase();
                                  const isDone = statusLower === 'done' || statusLower === 'completed' || statusLower === 'selesai';
                                  const isInProgress = statusLower === 'in progress' || statusLower === 'active' || statusLower === 'sedang dikerjakan';
                                  const isReview = statusLower === 'review' || statusLower === 'ditinjau';

                                  return (
                                    <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-slate-50/50 transition-all group/task text-xs bg-white">
                                      {/* Key & Title */}
                                      <div className="col-span-1 md:col-span-6 flex items-center gap-2.5 min-w-0">
                                        <span className="font-mono text-[9px] font-extrabold text-indigo-600 bg-indigo-50/80 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 select-none">
                                          {t.key}
                                        </span>
                                        <span className="font-bold text-slate-700 truncate group-hover/task:text-indigo-600 transition-colors">
                                          {t.title}
                                        </span>
                                      </div>

                                      {/* Priority Code */}
                                      <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                        <span className={cn(
                                          "text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[75px] border shadow-3xs",
                                          t.priority === 'High' || t.priority === 'Tinggi' ? "text-rose-600 bg-rose-50 border-rose-200" :
                                          t.priority === 'Medium' || t.priority === 'Sedang' ? "text-amber-600 bg-amber-50 border-amber-200" :
                                          "text-slate-500 bg-slate-50 border-slate-250"
                                        )}>
                                          {t.priority}
                                        </span>
                                      </div>

                                      {/* Task Type */}
                                      <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                        <span className="text-[9.5px] font-extrabold uppercase flex items-center justify-center gap-1 bg-slate-50/80 px-2.5 py-0.5 rounded-full border border-slate-200 min-w-[75px] text-center shadow-3xs text-slate-500">
                                          {t.type || 'task'}
                                        </span>
                                      </div>

                                      {/* Task Status */}
                                      <div className="col-span-1 md:col-span-2 flex md:justify-center">
                                        <span className={cn(
                                          "text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[90px] border shadow-3xs",
                                          isDone ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                          isInProgress ? "bg-blue-50 text-blue-600 border-blue-200" :
                                          isReview ? "bg-amber-50 text-amber-600 border-amber-200" :
                                          "bg-slate-50 text-slate-500 border-slate-250"
                                        )}>
                                          {t.status}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Design-Reviewed Assign Form for Adding a Project Assignment */}
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 hover:border-indigo-200 transition-all shadow-3xs duration-350">
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <UserPlus className="w-4 h-4 text-indigo-600 shrink-0" />
                                Delegasikan ke Project Baru
                              </h4>
                              <p className="text-[11px] text-indigo-900 font-semibold leading-normal">Berikan akses project tambahan dan tentukan peran pengguna ini di dalam tim.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                              <div className="md:col-span-5">
                                <select
                                  value={selectedAssignProjectId}
                                  onChange={(e) => setSelectedAssignProjectId(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all truncate"
                                >
                                  <option value="">-- select project --</option>
                                  {projects.filter(p => {
                                    const r = p.memberRoles || {};
                                    return !Object.keys(r).includes(selectedUser.id) && !Object.keys(r).includes(selectedUser.uid);
                                  }).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-4">
                                <select
                                  value={selectedAssignProjectRole}
                                  onChange={(e) => setSelectedAssignProjectRole(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                                >
                                  <option value="viewer">Viewer</option>
                                  <option value="member">Member</option>
                                  <option value="developer">Developer</option>
                                  <option value="ui/ux">UI/UX Designer</option>
                                  <option value="qa">QA Engineer</option>
                                  <option value="dba">Database Admin (DBA)</option>
                                  <option value="arsitektur">Architecture</option>
                                  <option value="system analyst">System Analyst</option>
                                  <option value="bisnis analyst">Business Analyst</option>
                                  <option value="admin">Project Admin</option>

                                  {/* Custom project roles from master data */}
                                  {masterData
                                    .filter(d => d.type === 'project_role' && (d.roleType === 'PROJECT' || d.role_type === 'PROJECT' || (!d.roleType && !d.role_type)))
                                    .map(role => {
                                      const roleValue = (role.label || '').toLowerCase();
                                      if (['viewer', 'member', 'developer', 'ui/ux', 'ui/ux designer', 'qa', 'qa engineer', 'dba', 'database admin', 'database admin (dba)', 'arsitektur', 'architecture', 'system analyst', 'bisnis analyst', 'business analyst', 'admin', 'project admin'].includes(roleValue)) {
                                        return null;
                                      }
                                      return (
                                        <option key={role.id} value={role.label}>
                                          {role.label}
                                        </option>
                                      );
                                    })
                                  }
                                </select>
                              </div>

                              <div className="md:col-span-3">
                                <button
                                  type="button"
                                  onClick={() => handleAssignProject(selectedUser.id)}
                                  disabled={isAssigningProject || !selectedAssignProjectId}
                                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-xl text-xs font-extrabold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                                >
                                  {isAssigningProject ? 'Adding...' : 'Assign'}
                                </button>
                              </div>
                            </div>

                            {/* Conditional hierarchy assignment section for Project Admin */}
                            {selectedAssignProjectRole === 'admin' && (
                              <div className="p-3.5 bg-white border border-slate-200/85 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div>
                                  <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block">
                                    Pilih Anggota Tim Terbimbing (Project Admin Hierarchy)
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5 leading-tight">
                                    Pilih anggota tim (Developer, QA, SA, dll) yang akan dibimbing oleh Project Admin ini. Mereka akan secara otomatis didelegasikan ke project ini dan dihubungkan di bawah hierarki Project Admin.
                                  </span>
                                </div>
                                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1.5 divide-y divide-slate-50 bg-slate-50/50">
                                  {users.filter(u => u.id !== selectedUser.id && u.uid !== selectedUser.uid).map((u) => {
                                    const isChecked = selectedTeamMemberIds.includes(u.id);
                                    const userDept = getDepartmentName(u.department || '');
                                    const userPos = getPositionName(u.position || '');
                                    return (
                                      <label key={u.id} className="flex items-center justify-between py-2 px-2 hover:bg-white rounded-lg transition-all cursor-pointer select-none">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              if (isChecked) {
                                                setSelectedTeamMemberIds(selectedTeamMemberIds.filter(id => id !== u.id));
                                              } else {
                                                setSelectedTeamMemberIds([...selectedTeamMemberIds, u.id]);
                                              }
                                            }}
                                            className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                          />
                                          <div className="text-xs">
                                            <p className="font-extrabold text-slate-800 leading-tight truncate">{u?.displayName || u?.username}</p>
                                            <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">
                                              {userPos ? `${userPos}` : ''} {userDept ? `• ${userDept}` : ''}
                                            </p>
                                          </div>
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-3xs">
                                          {u.role}
                                        </span>
                                      </label>
                                    );
                                  })}
                                  {users.filter(u => u.id !== selectedUser.id && u.uid !== selectedUser.uid).length === 0 && (
                                    <div className="text-center py-4 text-xs font-semibold text-slate-400 italic">
                                      Tidak ada anggota tim lain yang dapat dipilih.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t font-semibold">
                  <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel & Close</Button>
                  <Button onClick={handleUpdateUser} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Save className="w-4 h-4 mr-2" /> Save Settings & Close
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Add New User"
      >
        <div className="space-y-4">
          <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 mb-2">
            <p className="text-sm font-semibold text-violet-900">Registrasi Pengguna</p>
            <p className="text-xs text-violet-700 mt-1">Register new user to the system.</p>
          </div>

           <div className="space-y-3">
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Username</label>
               <Input
                 value={addPeopleUsername}
                 onChange={(e: any) => handleUsernameChange(e.target.value)}
                 placeholder="e.g. john_doe"
                 className={usernameError ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : ""}
               />
               {usernameError && (
                 <p className="text-[10px] font-semibold text-rose-500 mt-1">{usernameError}</p>
               )}
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Nama Lengkap</label>
               <Input
                 value={addPeopleFullName}
                 onChange={(e: any) => setAddPeopleFullName(e.target.value)}
                 placeholder="e.g. John Doe"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Email</label>
               <Input
                 value={addPeopleEmail}
                 onChange={(e: any) => handleEmailChange(e.target.value)}
                 placeholder="john@example.com"
                 className={emailError ? "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500" : ""}
               />
               {emailError && (
                 <p className="text-[10px] font-semibold text-rose-500 mt-1">{emailError}</p>
               )}
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Nomor HP / WhatsApp</label>
               <Input
                 value={addPeoplePhone}
                 onChange={(e: any) => setAddPeoplePhone(e.target.value)}
                 placeholder="e.g. 081234567890"
               />
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Password</label>
               <Input
                 type="password"
                 value={addPeoplePassword}
                 onChange={(e: any) => handlePasswordChange(e.target.value)}
                 placeholder="••••••••"
               />
               {passwordStrength && (
                 <div className="mt-1.5 space-y-1">
                   <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className={cn(
                       "h-full rounded-full transition-all",
                       passwordStrength === 'weak' ? "bg-rose-500 w-1/3" :
                       passwordStrength === 'medium' ? "bg-amber-500 w-2/3" :
                       "bg-emerald-500 w-full"
                     )} />
                   </div>
                   <p className={cn(
                     "text-[10px] font-bold uppercase tracking-wider",
                     passwordStrength === 'weak' ? "text-rose-500" :
                     passwordStrength === 'medium' ? "text-amber-500" :
                     "text-emerald-500"
                   )}>
                     Kekuatan Password: {passwordStrength === 'weak' ? 'Lemah' : passwordStrength === 'medium' ? 'Sedang' : 'Kuat'}
                   </p>
                 </div>
               )}
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Departemen</label>
               <div className="relative group/select">
                 <select
                   value={addPeopleDepartment}
                   onChange={(e) => setAddPeopleDepartment(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 focus:bg-white outline-none transition-all"
                 >
                   <option value="">Pilih Departemen...</option>
                   {masterData.filter(d => d.type === 'department').map((dep) => (
                     <option key={dep.id} value={dep.id}>{dep.label}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Jabatan</label>
               <div className="relative group/select">
                 <select
                   value={addPeopleJabatan}
                   onChange={(e) => setAddPeopleJabatan(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 focus:bg-white outline-none transition-all"
                 >
                   <option value="">Pilih Jabatan...</option>
                   {masterData.filter(d => d.type === 'jabatan').map((j) => (
                     <option key={j.id} value={j.id}>{j.label}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1">System Role</label>
               <div className="relative group/select">
                 <select
                   value={addPeopleRole}
                   onChange={(e) => setAddPeopleRole(e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 focus:bg-white outline-none transition-all"
                 >
                   <option value="admin">Administrator (Full Access)</option>
                   <option value="head">Department Head (Head)</option>
                   <option value="manager">Project Manager (Manager)</option>
                   <option value="user">Standard User (User)</option>
                   <option value="viewer">Observer (Viewer - Read Only)</option>
                   {masterData
                     .filter(d => d.type === 'project_role' && (d.roleType === 'SYSTEM' || d.role_type === 'SYSTEM'))
                     .map(role => {
                       const roleValue = (role.label || '').toLowerCase();
                       if (['admin', 'head', 'manager', 'user', 'viewer', 'administrator', 'department head', 'project manager', 'standard user', 'observer'].includes(roleValue)) {
                         return null;
                       }
                       return (
                         <option key={role.id} value={role.label}>
                           {role.label}
                         </option>
                       );
                     })
                   }
                 </select>
                 <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
               </div>
             </div>
           </div>

           <div className="pt-4 flex gap-3">
             <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="flex-1 justify-center">
               Cancel
             </Button>
             <Button
               onClick={handleAddPeople}
               disabled={!!usernameError || !!emailError || !addPeopleUsername || !addPeopleFullName || !addPeopleEmail || !addPeoplePassword}
               className="flex-1 justify-center bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
             >
               <UserPlus className="w-4 h-4" /> Add Person
             </Button>
           </div>
        </div>
      </Modal>

      <Modal
        isOpen={isInviteSuccessModalOpen}
        onClose={() => {
            setIsInviteSuccessModalOpen(false);
            fetchUsers();
        }}
        title="Username Registration Successful"
      >
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
          <div>
             <h3 className="text-lg font-bold text-gray-900">Username Tercatat!</h3>
             <p className="text-sm text-gray-500 mt-2">
             Username <span className="font-semibold text-gray-900">{addPeopleEmail}</span> has been saved in the system.
           </p>
         </div>

         <div className="space-y-3 pt-4">
           <Button
             variant="secondary"
             onClick={() => {
               navigator.clipboard.writeText(window.location.origin);
               toast.success('Link successfully copied!');
             }}
             className="w-full justify-center py-3"
           >
             <Copy className="w-4 h-4" /> Salin Link Bergabung
           </Button>
         </div>

           <button
             onClick={() => {
                 setIsInviteSuccessModalOpen(false);
                 fetchUsers();
             }}
             className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
           >
             Tutup
           </button>
         </div>
      </Modal>

      {confirmModal.isOpen && (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          maxWidth="max-w-md"
        >
          <div className="space-y-6 py-2">
            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm"
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Senior Portal-Style Hover Tooltip overlay */}
      {hoveredTooltip && (
        <div
          className="fixed z-9999 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white text-xs font-semibold rounded-2xl px-3.5 py-2.5 max-w-xs shadow-2xl transition-all duration-100 ease-out animate-in fade-in zoom-in-95"
          style={{
            left: `${hoveredTooltip.x + 14}px`,
            top: `${hoveredTooltip.y + 14}px`,
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          <div className="flex items-start gap-2 max-w-[210px]">
            <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium text-[11px] text-slate-255">{hoveredTooltip.text}</span>
          </div>
        </div>
      )}

    </div>
  );
};
