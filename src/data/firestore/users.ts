import { getDoc } from 'firebase/firestore'
import { getFirestore } from '../../lib/firebase'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { userRef } from './refs'

export interface UserFamilyBinding {
  uid: string
  familyId: string
  updatedAt: string
}

function bindingFromData(
  uid: string,
  data: Record<string, unknown>,
): UserFamilyBinding | null {
  const familyId = data.familyId
  if (typeof familyId !== 'string' || !familyId.trim()) return null
  const updatedAt =
    data.updatedAt &&
    typeof data.updatedAt === 'object' &&
    data.updatedAt !== null &&
    'toDate' in data.updatedAt &&
    typeof (data.updatedAt as { toDate: () => Date }).toDate === 'function'
      ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
      : typeof data.updatedAt === 'string'
        ? data.updatedAt
        : ''
  return { uid, familyId: familyId.trim(), updatedAt }
}

export async function getUserFamilyBinding(
  uid: string,
): Promise<DataResult<UserFamilyBinding | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!uid.trim()) {
    return fail('firestore/invalid-argument', 'uid obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDoc(userRef(db, uid))
    if (!snap.exists()) return null
    return bindingFromData(uid, snap.data() as Record<string, unknown>)
  })
}
