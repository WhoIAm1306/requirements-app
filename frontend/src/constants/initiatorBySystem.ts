/** Инициатор по выбранной системе (жёсткая привязка к справочнику). */
export function initiatorForSystemType(systemType: string): string {
  const s = (systemType || '').trim()
  if (s === '112') return 'ГБУ "Система 112"'
  if (s === '101') return 'ГКУ «ПСЦ»'
  return ''
}
