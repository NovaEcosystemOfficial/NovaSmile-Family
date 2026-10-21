import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type {
  FamilyProfileSettings,
  UpsertProfileInput,
} from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { profileFromDoc } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { profileSettingsRef } from './refs'

export async function getFamilyProfile(
  familyId: string,
): Promise<DataResult<FamilyProfileSettings | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDoc(profileSettingsRef(db, familyId))
    if (!snap.exists()) return null
    return profileFromDoc(familyId, snap.data())
  })
}

/** Upsert impostazioni profilo. Non invocato dalla UI in STEP 1. */
export async function upsertFamilyProfile(
  familyId: string,
  input: UpsertProfileInput,
): Promise<DataResult<FamilyProfileSettings>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.updatedByUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e updatedByUid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const ref = profileSettingsRef(db, familyId)
    await setDoc(
      ref,
      {
        parentDisplayName: input.parentDisplayName.trim(),
        childName: input.childName.trim(),
        greetingStyle: input.greetingStyle,
        showPoints: input.showPoints,
        reminderSound: input.reminderSound,
        updatedByUid: input.updatedByUid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Salvataggio profilo non confermato.')
    }
    return profileFromDoc(familyId, snap.data())
  })
}
