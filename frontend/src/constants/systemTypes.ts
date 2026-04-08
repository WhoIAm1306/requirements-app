/** Значение в БД / API и подпись в интерфейсе для «Система». */
export const SYSTEM_TYPE_OPTIONS = [
  { value: 'Телефония', label: 'Телефония' },
  { value: '112', label: 'Система 112' },
  { value: '101', label: 'Система 101' },
] as const

export function systemTypeLabel(code: string): string {
  const v = (code || '').trim()
  if (v.toLowerCase() === 'telephony') return 'Телефония'
  const row = SYSTEM_TYPE_OPTIONS.find((o) => o.value === v)
  return row?.label || v || '—'
}
