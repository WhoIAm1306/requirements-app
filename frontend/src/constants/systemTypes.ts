/** Код системы в БД / API и подпись в интерфейсе. */
export const SYSTEM_TYPE_OPTIONS = [
  { value: 'telephony', label: 'Телефония' },
  { value: '112', label: 'Система 112' },
  { value: '101', label: 'Система 101' },
] as const

export function systemTypeLabel(code: string): string {
  const v = (code || '').trim()
  const row = SYSTEM_TYPE_OPTIONS.find((o) => o.value === v)
  return row?.label || v || '—'
}
