import { getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { CreateFamilyInput, Family } from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { familyFromDoc } from './converters'
import {
  fail,
  firestoreUnavailable,
  ok,
  runFirestore,
  type DataResult,
} from './errors'
import { familyRef } from './refs'

export async function getFamily(
  familyId: string,
): Promise<DataResult<Family | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDoc(familyRef(db, familyId))
    if (!snap.exists()) return null
    return familyFromDoc(snap.id, snap.data())
  })
}

/**
 * Crea un documento famiglia (low-level).
 * NON usare per il bootstrap applicativo: le regole richiedono un
 * pacchetto atomico (family + member owner + profile + users) via
 * `bootstrapFamilyAtomic` (runTransaction, piano Spark).
 */
export async function createFamily(
  familyId: string,
  input: CreateFamilyInput,
): Promise<DataResult<Family>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }
  if (!input.name.trim() || !input.createdByUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'name e createdByUid sono obbligatori.',
    )
  }

  const ref = familyRef(db, familyId)

  const existingResult = await runFirestore(async () => getDoc(ref))
  if (!existingResult.ok) return existingResult
  if (existingResult.data.exists()) {
    return fail(
      'firestore/already-exists',
      'Esiste già una famiglia con questo id.',
    )
  }

  return runFirestore(async () => {
    await setDoc(ref, {
      name: input.name.trim(),
      createdByUid: input.createdByUid,
      status: input.status ?? 'active',
      createdAt: serverTimestamp(),
    })

    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Creazione famiglia non confermata.')
    }
    return familyFromDoc(snap.id, snap.data())
  })
}

export async function requireFamily(
  familyId: string,
): Promise<DataResult<Family>> {
  const result = await getFamily(familyId)
  if (!result.ok) return result
  if (!result.data) {
    return fail('firestore/not-found', 'Famiglia non trovata.')
  }
  return ok(result.data)
}
