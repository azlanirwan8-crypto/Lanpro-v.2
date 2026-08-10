export interface MasterData {
  id: string;
  type: string; // Dynamic type
  label: string;
  color?: string;
  icon?: string;
  order: number;
  description?: string;
  fieldType?: 'text' | 'number' | 'date' | 'dropdown';
  dropdownOptions?: string[];
  roleType?: 'PROJECT' | 'SYSTEM';
  role_type?: 'PROJECT' | 'SYSTEM';
  is_system_default?: boolean;
  is_system_reserved?: boolean;
}
