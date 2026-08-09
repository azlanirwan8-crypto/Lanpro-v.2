import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserProfile, AppRole, UserPermissions } from '../../types';
import { DEFAULT_PERMISSIONS } from './types';
import { apiRequest } from '../../lib/api';
import { cleanUserPermissions } from '../../lib/permissions';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Edit State
  const [editRole, setEditRole] = useState<AppRole>('user');
  const [editStatus, setEditStatus] = useState<UserProfile['status']>('pending');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [saving, setSaving] = useState(false);

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/users');
      if (data.status === 'success') {
        // Parse permissions if they are string (MySQL JSON type might return as JSON or string)
        const parsedUsers = data.data.map((u: any) => ({
          ...u,
          permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions
        }));
        setUsers(parsedUsers as UserProfile[]);
      }
    } catch (error: any) {
      console.error("Failed to fetch users", error);
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const payload: any = {
        role: editRole,
        status: editStatus,
        permissions: cleanUserPermissions(editPermissions),
        department: editDepartment,
        position: editPosition,
        displayName: editFullName,
        email: editEmail,
        phone: editPhone
      };

      if (editPassword.trim()) {
        payload.passwordHash = editPassword.trim();
      }

      const data = await apiRequest(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        body: payload
      });
      if (data.status !== 'success') throw new Error(data.message);
      
      toast.success('User updated successfully');
      setIsEditModalOpen(false);

      const updatedProfile = {
        ...selectedUser,
        ...payload,
        id: selectedUser.id,
        uid: selectedUser.uid || selectedUser.id,
      };
      window.dispatchEvent(new CustomEvent('user_profile_updated', { detail: updatedProfile }));

      setSelectedUser(null);
      fetchUsers(); // Refresh
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.role === 'admin') {
      toast.error('Cannot delete admin users');
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' });
      if (data.status !== 'success') throw new Error(data.message);
      
      toast.success('User deleted successfully');
      fetchUsers(); // Refresh
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditDepartment(user.department || '');
    setEditPosition(user.position || '');
    setEditFullName(user?.displayName || '');
    setEditEmail(user?.email || '');
    setEditPhone(user.phone || '');
    setEditPassword('');
    setEditPermissions(user.permissions ? { ...DEFAULT_PERMISSIONS, ...user.permissions } : DEFAULT_PERMISSIONS);
    setIsEditModalOpen(true);
  };

  const openViewModal = (user: UserProfile) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const togglePermission = (moduleName: keyof UserPermissions, action: 'create' | 'read' | 'update' | 'delete') => {
    setEditPermissions(prev => {
      const currentModule = prev[moduleName] || { create: false, read: false, update: false, delete: false };
      return {
        ...prev,
        [moduleName]: {
          ...currentModule,
          [action]: !currentModule[action]
        }
      };
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return {
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
    fetchUsers,
    saving
  };
};
