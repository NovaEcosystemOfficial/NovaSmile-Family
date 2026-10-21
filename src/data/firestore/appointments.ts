import {
  addDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import type {
  CreateAppointmentInput,
  FamilyAppointment,
} from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { appointmentFromDoc, isoToTimestamp } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { appointmentRef, appointmentsCol } from './refs'

export async function getFamilyAppointment(
  familyId: string,
  appointmentId: string,
): Promise<DataResult<FamilyAppointment | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !appointmentId.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e appointmentId sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(appointmentRef(db, familyId, appointmentId))
    if (!snap.exists()) return null
    return appointmentFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyAppointments(
  familyId: string,
  options?: { max?: number },
): Promise<DataResult<FamilyAppointment[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  const max = options?.max ?? 50

  return runFirestore(async () => {
    const q = query(
      appointmentsCol(db, familyId),
      orderBy('scheduledFor', 'asc'),
      limit(max),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => appointmentFromDoc(d.id, familyId, d.data()))
  })
}

/** Crea appuntamento/programmazione. Non invocato dalla UI in STEP 1. */
export async function createFamilyAppointment(
  familyId: string,
  input: CreateAppointmentInput,
): Promise<DataResult<FamilyAppointment>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.createdByUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e createdByUid sono obbligatori.',
    )
  }
  if (!input.text.trim() || !input.scheduledFor.trim()) {
    return fail(
      'firestore/invalid-argument',
      'text e scheduledFor sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const ref = await addDoc(appointmentsCol(db, familyId), {
      text: input.text.trim(),
      scheduledFor: isoToTimestamp(input.scheduledFor),
      status: input.status ?? 'scheduled',
      createdByUid: input.createdByUid,
      createdAt: serverTimestamp(),
    })
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Creazione appuntamento non confermata.')
    }
    return appointmentFromDoc(snap.id, familyId, snap.data())
  })
}
