import { MasterData } from '../../types';

export interface CreateIssueBarProps {
  masterData: MasterData[];
  onQuickCreate: (title: string, type: string) => void;
  className?: string;
}

export interface UseCreateIssueProps {
  onQuickCreate: (title: string, type: string) => void;
}
