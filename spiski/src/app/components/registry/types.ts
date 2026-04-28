export type Status =
  | 'new'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'archived_completed'
  | 'archived_outdated';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Section = 'digital' | 'infra' | 'security' | 'hr' | 'finance' | 'legal';

export interface Proposal {
  id: string;
  displayId: string;
  title: string;
  status: Status;
  initiator: string;
  initiatorOrg: string;
  responsible: string;
  responsibleDept: string;
  section: Section;
  system: string;
  gkNumber: string;
  stage: string;
  priority: Priority;
  updatedAt: string;
  createdAt: string;
}

export type Variant = 'A' | 'B';
export type ViewState = 'normal' | 'loading' | 'empty';

export interface FilterState {
  status: string;
  section: string;
  system: string;
  priority: string;
  search: string;
}
