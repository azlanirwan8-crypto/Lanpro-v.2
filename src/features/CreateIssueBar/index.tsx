import React from 'react';
import { ChevronDown, Plus, Zap, CheckCircle2 } from 'lucide-react';
import { RenderIcon } from '../../components/RenderIcon';
import { cn } from '../../lib/utils';
import { CreateIssueBarProps } from './types';
import { useCreateIssue } from './hooks';
import { styles } from './styles';

export const CreateIssueBar: React.FC<CreateIssueBarProps> = ({ 
  masterData, 
  onQuickCreate,
  className 
}) => {
  const {
    quickCreateType,
    quickCreateTitle,
    setQuickCreateTitle,
    isQuickTypeOpen,
    handleCreate,
    toggleDropdown,
    closeDropdown,
    selectType
  } = useCreateIssue({ onQuickCreate });

  const mArr = Array.isArray(masterData) ? masterData : [];
  const typeData = mArr.find(m => m.type === 'issue_type' && m.label?.toLowerCase() === quickCreateType?.toLowerCase());

  return (
    <div className={cn(styles.container, className)}>
      <div className={styles.innerWrapper}>
        <div className="relative">
          <button 
            onClick={toggleDropdown}
            className={styles.dropdownButton}
          >
            {typeData?.icon ? (
              <RenderIcon iconName={typeData.icon} className="w-3.5 h-3.5" style={{ color: typeData.color }} />
            ) : (
              quickCreateType === 'epic' ? <Zap className="w-3.5 h-3.5 text-purple-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span className="uppercase">{quickCreateType}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
          </button>

          {isQuickTypeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={closeDropdown} />
              <div className={styles.dropdownMenu}>
                {mArr.filter(m => m.type === 'issue_type').map(t => (
                  <button 
                    key={t.id}
                    onClick={() => selectType(t.label)}
                    className={styles.dropdownItem}
                  >
                    {t.icon ? (
                      <RenderIcon iconName={t.icon} className="w-3.5 h-3.5" style={{ color: t.color }} />
                    ) : (
                      <Zap className="w-3.5 h-3.5" style={{ color: t.color }} />
                    )}
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <input 
          value={quickCreateTitle}
          onChange={(e) => setQuickCreateTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Buat isu baru..."
          className={styles.input}
        />

        <div className={styles.actionWrapper}>
          <span className={styles.helperText}>Tekan Enter untuk Membuat</span>
          <div className={styles.divider} />
          <button 
            onClick={handleCreate}
            className={styles.createButton}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIssueBar;
