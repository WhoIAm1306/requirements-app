export type GKStatus = 'active' | 'archive';
export type UserRole = 'superuser' | 'edit' | 'read';
export type JiraEpicStatus = 'Open' | 'Analysis' | 'Dev' | 'DevTest' | 'Closed';

export interface JiraEpic {
  key: string;
  summary: string;
  status: JiraEpicStatus;
  url: string;
}

export interface GKFunction {
  id: string;
  functionName: string;
  nmckFunctionNumber: string;
  tzSectionNumber: string;
  jiraEpics: JiraEpic[];
  confluenceLinks: string[];
  updatedAt: string;
}

export interface GKStage {
  id: string;
  stageNumber: number;
  stageName: string;
  comment?: string;
  functions: GKFunction[];
}

export interface GK {
  id: string;
  name: string;
  shortName: string;
  code: string;
  customer: string;
  status: GKStatus;
  useShortNameInId: boolean;
  createdAt: string;
  updatedAt: string;
  note: string;
  stages: GKStage[];
}

export interface FilterState {
  status: 'all' | 'active' | 'archive';
  customer: string;
  hasStages: 'all' | 'yes' | 'no';
  hasFunctions: 'all' | 'yes' | 'no';
  sortBy: 'updatedAt' | 'name' | 'code';
  sortOrder: 'asc' | 'desc';
}

export interface HistoryEntry {
  id: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  user: string;
  timestamp: string;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
}
