/** Раздел «Телефония» в связке с systemType 112/101. */
export const TELEPHONY_SECTION = 'Телефония'

export function isTelephonySectionName(name: string) {
  return (name || '').trim().toLowerCase() === TELEPHONY_SECTION.toLowerCase()
}
