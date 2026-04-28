export type ProposalMode = 'edit' | 'readonly';
export type ArchiveReason = 'completed' | 'irrelevant' | null;

export interface FormData {
  taskId: string;
  shortName: string;
  initiator: string;
  responsible: string;
  section: string;
  priority: string;
  status: string;
  system: string;
  dueDate: string;
  proposal: string;
  commentsText: string;
  discussion: string;
  note: string;
  gc: string;
  stage: string;
  useTZMode: boolean;
  nmck: string;
  tz: string;
  ditOutgoing: string;
  ditDate: string;
}

export interface Comment {
  id: string;
  author: string;
  organization: string;
  date: string;
  text: string;
  canDelete: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  date: string;
  size: string;
  canDetach: boolean;
}

export interface PreviousFile {
  id: string;
  name: string;
  date: string;
}

export interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ProposalMode;
  isArchived: boolean;
  archiveReason: ArchiveReason;
  onModeChange: (mode: ProposalMode) => void;
  onArchiveChange: (archived: boolean, reason?: ArchiveReason) => void;
}
