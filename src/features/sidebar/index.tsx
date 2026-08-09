import React, { useState } from 'react';
import { 
  ChevronRight, ChevronLeft, ChevronDown, Kanban, Plus, LogOut 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { SidebarProps } from './types';
import { useSidebar } from './hooks';
import { styles } from './styles';
import { sidebarSections, SidebarItemConfig } from './config';
import { getUserPermissions, normalizeModuleKey } from '../../lib/permissions';

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const {
    isMobileMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setIsNewProjectModalOpen,
    projects,
    selectedProject,
    setSelectedProject,
    userRole,
    currentView,
    setCurrentView,
    currentUserProfile,
    currentUser,
    user,
    setIsProfileModalOpen,
    handleLogout
  } = props;

  const { canCreateProject } = useSidebar(props);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const renderBadge = (badge?: string, badgeColor?: string) => {
    if (!badge) return null;
    let colorClasses = "bg-[#f06548] text-white"; // default Hot orange-red
    if (badgeColor === 'emerald' || badge === 'New') colorClasses = "bg-[#0ab39c] text-white";
    if (badgeColor === 'blue') colorClasses = "bg-[#3577f1] text-white";
    if (badgeColor === 'purple') colorClasses = "bg-[#878a99] text-white";

    return (
      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider shrink-0", colorClasses)}>
        {badge}
      </span>
    );
  };

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        styles.aside,
        isMobileMenuOpen ? styles.asideMobileOpen : styles.asideMobileClosed,
        isSidebarCollapsed ? styles.asideCollapsed : styles.asideExpanded
      )}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className={styles.collapseButton}
        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </motion.button>
      
      {/* Brand Header */}
      <div className={cn(styles.logoWrapper, isSidebarCollapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 8, scale: 1.05 }}
            className={styles.logoIcon}
          >
            <Kanban className="text-white w-5 h-5" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col"
              >
                <span className={styles.logoText}>LANPRO</span>
                <span className="text-[9px] font-semibold text-[#878a99] tracking-widest uppercase -mt-1">Project Management</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className={styles.nav}>
        {/* Active Projects Section */}
        {!isSidebarCollapsed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.sectionLabelWrapper}
          >
            <div className={styles.sectionLabel}>PROYEK AKTIF</div>
            {canCreateProject && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsNewProjectModalOpen(true)}
                className={styles.newButton}
                title="Buat Proyek Baru"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase text-amber-300">Baru</span>
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Project List Buttons */}
        {projects.map((p, idx) => (
          <motion.div 
            key={p.id} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.02 }}
            className="group relative my-0.5"
          >
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProject(p)}
              className={cn(
                styles.projectButton,
                isSidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-2.5 px-3 py-1.5',
                selectedProject?.id === p.id ? styles.projectButtonSelected : styles.projectButtonDefault
              )}
              title={isSidebarCollapsed ? p.name : undefined}
            >
              <div className={cn(styles.indicator, selectedProject?.id === p.id ? "bg-amber-400 scale-125 shadow-xs" : "bg-[#878a99]")} />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate flex-1 text-left text-xs font-medium">{p.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/20 text-[#abb9e8]">{p.key}</span>
                </>
              )}
            </motion.button>
          </motion.div>
        ))}

        {/* Sidebar Categories & Navigation Items */}
        {sidebarSections.map(section => {
          const permittedItems = section.items.filter(item => {
            const normRole = (userRole ? String(userRole).toLowerCase().trim() : 'viewer') as any;
            const uName = String(currentUserProfile?.username || currentUser?.username || user?.username || '').toLowerCase().trim();
            const uRole = String(currentUserProfile?.role || currentUser?.role || '').toLowerCase().trim();
            
            const isAdmin = normRole === 'admin' || normRole === 'administrator' || normRole === 'superadmin' || 
                            uRole === 'admin' || uRole === 'administrator' || uRole === 'superadmin' ||
                            uName === 'admin';
            if (isAdmin) return true;

            const perms = getUserPermissions(normRole, currentUserProfile?.permissions);
            const normModule = normalizeModuleKey(item.module);
            const modulePerm = perms[normModule as keyof typeof perms];
            
            const hasRead = Boolean(modulePerm?.read);
            const hasCreate = Boolean(modulePerm?.create);
            const hasUpdate = Boolean(modulePerm?.update);
            const hasDelete = Boolean(modulePerm?.delete);
            
            const hasAnyPermission = hasRead || hasCreate || hasUpdate || hasDelete;
            return hasAnyPermission && hasRead;
          });

          if (permittedItems.length === 0) return null;

          return (
            <React.Fragment key={section.id}>
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between px-3 mt-5 mb-1.5">
                  <div className="text-[11px] font-semibold text-[#878a99] uppercase tracking-wider">{section.title}</div>
                </div>
              )}
              {permittedItems.map((item) => {
                const isActive = currentView === item.id;
                const hasChildren = Boolean(item.children && item.children.length > 0);
                const isExpanded = Boolean(expandedItems[item.id]);

                return (
                  <div key={item.id} className="my-0.5">
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCurrentView(item.id as any);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-xs relative overflow-hidden group",
                        isActive 
                          ? 'bg-[#364574] text-white font-semibold border-l-3 border-amber-400 shadow-sm' 
                          : 'text-[#abb9e8] hover:bg-white/5 hover:text-white'
                      )}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <div className="shrink-0 text-slate-300 group-hover:text-white transition-colors">{item.icon}</div>
                      {!isSidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left font-medium truncate">{item.label}</span>
                          {item.badge && renderBadge(item.badge, item.badgeColor)}
                          {hasChildren && (
                            <div 
                              onClick={(e) => toggleExpand(item.id, e)}
                              className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors ml-1"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </div>
                          )}
                        </>
                      )}
                    </motion.button>

                    {/* Render Sub-items in Velzon hyphen style */}
                    {hasChildren && isExpanded && !isSidebarCollapsed && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pl-7 pr-2 py-1 space-y-1"
                      >
                        {item.children?.map(subItem => {
                          const isSubActive = currentView === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => setCurrentView(subItem.id as any)}
                              className={cn(
                                "w-full flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors text-left",
                                isSubActive 
                                  ? 'text-white font-bold bg-white/10' 
                                  : 'text-[#878a99] hover:text-white hover:bg-white/5'
                              )}
                            >
                              <span className="text-slate-400 text-[10px]">—</span>
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Velzon Bottom User Profile Footer */}
      <div className="p-3 border-t border-[#364574] bg-[#364574]/40 mt-auto">
        <motion.div 
           whileHover={{ scale: 1.01 }}
           onClick={() => {
              if(currentUser && currentUser.uid !== 'admin') {
                 setIsProfileModalOpen(true);
              } else {
                 toast.error('Akun local admin tidak memiliki profil untuk diedit.');
              }
           }}
           className={cn(
             "flex items-center p-2 rounded-lg hover:bg-white/10 transition-all cursor-pointer group",
             isSidebarCollapsed ? 'justify-center' : 'gap-3'
           )}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} className="w-8 h-8 rounded-full shrink-0 border border-amber-400/50" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/20 shadow-xs">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          {!isSidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.displayName || currentUser?.displayName || currentUser?.username || 'User'}</div>
                <div className="text-[10px] text-[#878a99] truncate font-mono">{currentUser?.username || 'admin'}</div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
                className="text-slate-300 hover:text-red-400 transition-colors p-1" 
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </>
          )}
        </motion.div>
        {isSidebarCollapsed && (
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleLogout} 
            className="w-full mt-2 flex justify-center p-2 text-slate-300 hover:text-red-400 transition-colors" 
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.aside>
  );
};

export default Sidebar;
