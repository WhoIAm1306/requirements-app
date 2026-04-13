/** Значения systemType в БД/API — только 112 и 101; «Телефония» задаётся разделом. */
export const SYSTEM_TYPE_OPTIONS = [
  { value: '112', label: 'Система 112' },
  { value: '101', label: 'Система 101' },
] as const

/** Подпись колонки «Система» (112 / 101). */
export function systemTypeLabel(code: string): string {
  const v = (code || '').trim()
  const row = SYSTEM_TYPE_OPTIONS.find((o) => o.value === v)
  return row?.label || v || '—'
}
