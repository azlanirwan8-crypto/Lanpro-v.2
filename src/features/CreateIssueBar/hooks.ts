import { useState } from 'react';
import { UseCreateIssueProps } from './types';

export const useCreateIssue = ({ onQuickCreate }: UseCreateIssueProps) => {
  const [quickCreateType, setQuickCreateType] = useState('task');
  const [quickCreateTitle, setQuickCreateTitle] = useState('');
  const [isQuickTypeOpen, setIsQuickTypeOpen] = useState(false);

  const handleCreate = () => {
    if (!quickCreateTitle.trim()) return;
    onQuickCreate(quickCreateTitle, quickCreateType);
    setQuickCreateTitle('');
  };

  const toggleDropdown = () => setIsQuickTypeOpen(!isQuickTypeOpen);
  const closeDropdown = () => setIsQuickTypeOpen(false);

  const selectType = (type: string) => {
    setQuickCreateType(type);
    setIsQuickTypeOpen(false);
  };

  return {
    quickCreateType,
    quickCreateTitle,
    setQuickCreateTitle,
    isQuickTypeOpen,
    handleCreate,
    toggleDropdown,
    closeDropdown,
    selectType
  };
};
