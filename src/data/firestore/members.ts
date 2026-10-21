import { getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import type { FamilyMember, UpsertMemberInput } from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { memberFromDoc } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { memberRef, membersCol } from './refs'

export async function getFamilyMember(
  familyId: string,
  uid: string,
): Promise<DataResult<FamilyMember | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !uid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e uid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(memberRef(db, familyId, uid))
    if (!snap.exists()) return null
    return memberFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyMembers(
  familyId: string,
): Promise<DataResult<FamilyMember[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDocs(membersCol(db, familyId))
    return snap.docs.map((d) => memberFromDoc(d.id, familyId, d.data()))
  })
}

/** Upsert membership. Non invocato dalla UI in STEP 1. */
export async function upsertFamilyMember(
  familyId: string,
  input: UpsertMemberInput,
): Promise<DataResult<FamilyMember>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.uid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e uid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const ref = memberRef(db, familyId, input.uid)
    const existing = await getDoc(ref)
    const payload: Record<string, unknown> = {
      role: input.role,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
    }
    if (!existing.exists()) {
      payload.joinedAt = serverTimestamp()
    }

    await setDoc(ref, payload, { merge: true })
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Salvataggio membership non confermato.')
    }
    return memberFromDoc(snap.id, familyId, snap.data())
  })
}
