// Базовые словари и типы приложения.

export type Organization = 'ДИТ' | '112' | '101' | 'Танто-С'
export type AccessLevel = 'read' | 'edit'

/** Доп. права к карточке требования при accessLevel read (ключи — см. requirementFieldGrants.ts). */
export type RequirementFieldGrants = Record<string, boolean | undefined>

// Профиль текущего пользователя.
export interface UserProfile {
  id: number
  fullName: string
  organization: Organization | string
  email: string
  accessLevel: AccessLevel
  isSuperuser: boolean
  isActive: boolean
  requirementFieldGrants?: RequirementFieldGrants
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
  requirementFieldGrants?: RequirementFieldGrants
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
  requirementFieldGrants?: RequirementFieldGrants
}

// Обновление пользователя.
export interface UpdateAdminUserPayload {
  fullName: string
  organization: Organization | string
  email: string
  accessLevel: AccessLevel
  isActive: boolean
  requirementFieldGrants?: RequirementFieldGrants
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
  shortName?: string
  useShortNameInTaskId?: boolean
  description?: string
  isActive: boolean
  createdAt: string
}

// Этапы ГК.
export interface GKStage {
  id: number
  contractId: number
  stageNumber: number
  stageName: string
  createdAt: string
  updatedAt: string
  functions?: GKFunction[]
}

// Функции ТЗ, привязанные к ГК и этапу.
export interface GKFunction {
  id: number
  contractId: number
  contractStageId: number
  functionName: string
  nmckFunctionNumber: string
  tzSectionNumber: string
  jiraLink?: string
  createdAt: string
  updatedAt: string
}

// Детали ГК вместе с этапами и функциями.
export interface GKContractDetails {
  id: number
  name: string
  shortName?: string
  useShortNameInTaskId?: boolean
  description: string
  isActive: boolean
  createdAt: string
  stages: GKStage[]
}

export interface CreateGKContractPayload {
  name: string
  shortName?: string
  useShortNameInTaskId?: boolean
  description: string
}

export interface UpdateGKContractPayload {
  name: string
  shortName?: string
  useShortNameInTaskId?: boolean
  description: string
}

export interface CreateGKStagePayload {
  stageNumber: number
  stageName: string
}

export interface UpsertGKFunctionPayload {
  stageNumber: number
  functionName: string
  nmckFunctionNumber: string
  tzSectionNumber: string
  jiraLink?: string
}

export interface ContractAttachmentItem {
  id: number
  contractId: number
  type: 'tz' | 'nmck' | string
  originalFileName: string
  createdAt: string
}

/** Метаданные файла в общей библиотеке вложений предложений. */
export interface RequirementAttachmentLibraryItem {
  id: number
  originalFileName: string
  contentType: string
  uploadedByName: string
  uploadedByOrg: string
  createdAt: string
  lastUsedAt: string
}

/** Вложение карточки предложения (ссылка на запись библиотеки). */
export interface RequirementAttachmentItem {
  id: number
  requirementId: number
  libraryFileId: number
  createdAt: string
  libraryFile?: RequirementAttachmentLibraryItem
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
  /** Подпись к ГК в списке (из справочника). */
  contractShortName?: string
  contractUseShortNameInTaskId?: boolean
  shortName: string
  initiator: string
  responsiblePerson: string
  sectionName: string
  proposalText: string
  problemComment: string
  discussionSummary: string
  implementationQueue: string
  contractName: string
  contractTZFunctionId?: number | null
  noteText: string
  tzPointText: string
  nmckPointText?: string
  statusText: string
  systemType: string
  completedAt?: string | null
  ditOutgoingNumber?: string
  ditOutgoingDate?: string | null
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
  attachments?: RequirementAttachmentItem[]
}

// Payload для создания/обновления предложения.
export interface RequirementPayload {
  taskIdentifier?: string
  shortName: string
  initiator: string
  responsiblePerson: string
  sectionName: string
  proposalText: string
  problemComment: string
  discussionSummary: string
  implementationQueue: string
  contractName: string
  contractTZFunctionId?: number | null
  noteText: string
  tzPointText: string
  nmckPointText: string
  statusText: string
  systemType: string
  completedAt?: string | null
  ditOutgoingNumber?: string
  ditOutgoingDate?: string | null
}