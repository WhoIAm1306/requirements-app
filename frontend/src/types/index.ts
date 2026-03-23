// Базовые словари и типы приложения.

export type Organization = 'ДИТ' | '112' | '101' | 'Танто-С'
export type AccessLevel = 'read' | 'edit'

// Профиль текущего пользователя.
export interface UserProfile {
  id: number
  fullName: string
  organization: Organization | string
  email: string
  accessLevel: AccessLevel
  isSuperuser: boolean
  isActive: boolean
}

// Логин по корпоративной почте.
export interface LoginPayload {
  email: string
  password: string
}

// Ответ логина.
export interface LoginResponse {
  accessToken: string
  profile: UserProfile
}

// Смена собственного пароля.
export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// Пользователь в административной панели.
export interface AdminUser {
  id: number
  fullName: string
  organization: Organization | string
  email: string
  accessLevel: AccessLevel
  isSuperuser: boolean
  isActive: boolean
  createdAt: string
}

// Создание пользователя.
export interface CreateAdminUserPayload {
  fullName: string
  organization: Organization | string
  email: string
  password: string
  accessLevel: AccessLevel
  isActive: boolean
}

// Обновление пользователя.
export interface UpdateAdminUserPayload {
  fullName: string
  organization: Organization | string
  email: string
  accessLevel: AccessLevel
  isActive: boolean
}

// Элемент очереди.
export interface QueueItem {
  id: number
  number: number
  name: string
  isActive: boolean
  createdAt: string
}

// Элемент договора / ГК.
export interface ContractItem {
  id: number
  name: string
  isActive: boolean
  createdAt: string
}

// Комментарий предложения.
export interface CommentItem {
  id: number
  requirementId: number
  commentText: string
  authorName: string
  authorOrg: string
  createdAt: string
}

// Карточка предложения.
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
  contractName: string
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
  isArchived: boolean
  archivedAt?: string | null
  archivedBy?: string
  archivedByOrg?: string
  comments?: CommentItem[]
}

// Payload для создания/обновления предложения.
export interface RequirementPayload {
  shortName: string
  initiator: string
  responsiblePerson: string
  sectionName: string
  proposalText: string
  problemComment: string
  discussionSummary: string
  implementationQueue: string
  contractName: string
  noteText: string
  tzPointText: string
  statusText: string
  systemType: string
}