export type Organization = 'ДИТ' | '112' | '101' | 'Танто-С'

export interface LoginPayload {
  fullName: string
  organization: Organization
  password: string
}

export interface LoginResponse {
  token: string
  fullName: string
  organization: Organization
}

export interface QueueItem {
  id: number
  number: number
  name: string
  isActive: boolean
  createdAt: string
}

export interface CommentItem {
  id: number
  requirementId: number
  commentText: string
  authorName: string
  authorOrg: string
  createdAt: string
}

export interface Requirement {
  id: number
  taskIdentifier: string
  shortName: string
  initiator: string
  responsiblePerson: string
  sectionName: string
  proposalText: string
  problemComment: string
  discussionSummary: string
  implementationQueue: string
  noteText: string
  tzPointText: string
  statusText: string
  systemType: string
  authorName: string
  authorOrg: string
  createdAt: string
  updatedAt: string
  lastEditedBy: string
  lastEditedOrg: string
  comments?: CommentItem[]
  isArchived: boolean
  archivedAt?: string | null
  archivedBy?: string
  archivedByOrg?: string
  contractName: string
}

export interface RequirementPayload {
  shortName: string
  initiator: string
  responsiblePerson: string
  sectionName: string
  proposalText: string
  problemComment: string
  discussionSummary: string
  implementationQueue: string
  noteText: string
  tzPointText: string
  statusText: string
  systemType: string
  contractName: string
}

export interface ContractItem {
  id: number
  name: string
  isActive: boolean
  createdAt: string
}