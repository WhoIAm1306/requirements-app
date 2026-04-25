/** Стандартные статусы предложений (порядок важен для подсказок и фильтров). */
export const STANDARD_REQUIREMENT_STATUSES = [
  'Новое',
  'Подтверждено',
  'Требуется обсуждение',
  'Учтено',
  'Выполнено',
] as const

export const DEFAULT_REQUIREMENT_STATUS = 'Новое'

export function isStandardRequirementStatus(value: string) {
  return STANDARD_REQUIREMENT_STATUSES.includes(value.trim() as (typeof STANDARD_REQUIREMENT_STATUSES)[number])
}
