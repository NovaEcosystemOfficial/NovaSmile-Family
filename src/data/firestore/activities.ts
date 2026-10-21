import {
  addDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import type { ActivityTone, FamilyActivity } from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { timestampToIso } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { activitiesCol } from './refs'

function activityFromDoc(
  id: string,
  familyId: string,
  data: Record<string, unknown>,
): FamilyActivity {
  const tone = data.tone
  return {
    id,
    familyId,
    title: typeof data.title === 'string' ? data.title : '',
    detail: typeof data.detail === 'string' ? data.detail : '',
    tone:
      tone === 'success' || tone === 'info' || tone === 'warning'
        ? tone
        : 'info',
    createdAt: timestampToIso(data.createdAt),
  }
}

export async function listFamilyActivities(
  familyId: string,
  options?: { max?: number },
): Promise<DataResult<FamilyActivity[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }
  const max = options?.max ?? 20

  return runFirestore(async () => {
    const q = query(
      activitiesCol(db, familyId),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) =>
      activityFromDoc(d.id, familyId, d.data() as Record<string, unknown>),
    )
  })
}

export async function createFamilyActivity(
  familyId: string,
  input: { title: string; detail: string; tone?: ActivityTone },
): Promise<DataResult<FamilyActivity>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.title.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e title sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const ref = await addDoc(activitiesCol(db, familyId), {
      title: input.title.trim().slice(0, 120),
      detail: input.detail.trim().slice(0, 500),
      tone: input.tone ?? 'info',
      createdAt: serverTimestamp(),
    })
    return {
      id: ref.id,
      familyId,
      title: input.title.trim().slice(0, 120),
      detail: input.detail.trim().slice(0, 500),
      tone: input.tone ?? 'info',
      createdAt: new Date().toISOString(),
    }
  })
}
