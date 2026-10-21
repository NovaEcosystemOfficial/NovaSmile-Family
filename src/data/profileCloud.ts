import type { FamilyPreferences } from '../types'
import { upsertFamilyProfile } from './firestore/profile'
import { getFamilyMember } from './firestore/members'
import {
  fail,
  type DataResult,
} from './firestore/errors'
import type { FamilyProfileSettings } from '../types/cloud'

/**
 * Scrive il profilo cloud solo dopo verifica membership.
 * Non accetta familyId arbitrari senza member doc.
 */
export async function saveVerifiedFamilyProfile(
  familyId: string,
  uid: string,
  preferences: FamilyPreferences,
): Promise<DataResult<FamilyProfileSettings>> {
  const member = await getFamilyMember(familyId, uid)
  if (!member.ok) return member
  if (!member.data) {
    return fail(
      'firestore/permission-denied',
      'Non sei membro di questa famiglia: profilo cloud non aggiornato.',
    )
  }
  if (member.data.role === 'viewer') {
    return fail(
      'firestore/permission-denied',
      'Ruolo viewer: profilo in sola lettura.',
    )
  }

  return upsertFamilyProfile(familyId, {
    parentDisplayName: preferences.parentName,
    childName: preferences.childName,
    greetingStyle: preferences.greetingStyle,
    showPoints: preferences.showPoints,
    reminderSound: preferences.reminderSound,
    updatedByUid: uid,
  })
}
