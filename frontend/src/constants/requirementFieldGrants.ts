/** Ключи грантов на поля карточки требования (read + выборочное редактирование). Должны совпадать с бэкендом. */
export const REQUIREMENT_FIELD_GRANT_OPTIONS: { value: string; label: string }[] = [
  { value: 'comment', label: 'Комментарии (добавление к предложению)' },
  { value: 'shortName', label: 'Краткое наименование' },
  { value: 'initiator', label: 'Инициатор' },
  { value: 'responsiblePerson', label: 'Ответственный' },
  { value: 'sectionName', label: 'Раздел' },
  { value: 'proposalText', label: 'Предложение' },
  { value: 'problemComment', label: 'Комментарии и описание проблем' },
  { value: 'discussionSummary', label: 'Обсуждение' },
  { value: 'implementationQueue', label: 'Приоритет' },
  { value: 'contractGk', label: 'ГК, этап и функция НМЦК / ТЗ' },
  { value: 'statusText', label: 'Статус' },
  { value: 'systemType', label: 'Система' },
  { value: 'noteText', label: 'Примечание' },
  { value: 'completedAt', label: 'Дата выполнения' },
  { value: 'ditOutgoing', label: 'Письмо в ДИТ' },
  { value: 'attachments', label: 'Вложения (загрузка и открепление)' },
]

export function requirementFieldGrantLabel(key: string): string {
  return REQUIREMENT_FIELD_GRANT_OPTIONS.find((o) => o.value === key)?.label || key
}
