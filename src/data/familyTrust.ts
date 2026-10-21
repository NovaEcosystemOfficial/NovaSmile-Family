import type { FamilyMember } from '../types/cloud'

/**
 * Accetta un familyId in cache solo se la membership per uid è verificata.
 * Non crea famiglie e non si fida di id scelti liberamente dal client.
 */
export function pickTrustedFamilyId(
  cachedFamilyId: string | null | undefined,
  membership: FamilyMember | null | undefined,
  uid: string,
): string | null {
  const cached = cachedFamilyId?.trim() ?? ''
  if (!cached || !membership) return null
  if (membership.uid !== uid) return null
  if (membership.familyId !== cached) return null
  return cached
}

export function profileToPreferences(input: {
  parentDisplayName: string
  childName: string
  greetingStyle: 'caldo' | 'energico' | 'tranquillo'
  showPoints: boolean
  reminderSound: boolean
}): {
  parentName: string
  childName: string
  greetingStyle: 'caldo' | 'energico' | 'tranquillo'
  showPoints: boolean
  reminderSound: boolean
} {
  return {
    parentName: input.parentDisplayName,
    childName: input.childName,
    greetingStyle: input.greetingStyle,
    showPoints: input.showPoints,
    reminderSound: input.reminderSound,
  }
}
