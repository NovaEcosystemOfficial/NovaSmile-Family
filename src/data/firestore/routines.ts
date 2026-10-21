import {
  addDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import type {
  CreateRoutineInput,
  FamilyRoutine,
  FamilyRoutineDay,
  UpsertRoutineDayInput,
} from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import {
  isoToTimestamp,
  routineDayFromDoc,
  routineFromDoc,
} from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import {
  routineDayRef,
  routineDaysCol,
  routineRef,
  routinesCol,
} from './refs'

const DATE_ID_RE = /^\d{4}-\d{2}-\d{2}$/

export async function getFamilyRoutine(
  familyId: string,
  routineId: string,
): Promise<DataResult<FamilyRoutine | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !routineId.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e routineId sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(routineRef(db, familyId, routineId))
    if (!snap.exists()) return null
    return routineFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyRoutines(
  familyId: string,
): Promise<DataResult<FamilyRoutine[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const q = query(routinesCol(db, familyId), orderBy('sortOrder', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => routineFromDoc(d.id, familyId, d.data()))
  })
}

/** Crea template routine. Non invocato dalla UI in STEP 1. */
export async function createFamilyRoutine(
  familyId: string,
  input: CreateRoutineInput,
): Promise<DataResult<FamilyRoutine>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }
  if (!input.title.trim()) {
    return fail('firestore/invalid-argument', 'title obbligatorio.')
  }

  return runFirestore(async () => {
    const ref = await addDoc(routinesCol(db, familyId), {
      title: input.title.trim(),
      description: input.description.trim(),
      period: input.period,
      points: input.points,
      active: input.active ?? true,
      sortOrder: input.sortOrder ?? 0,
      createdAt: serverTimestamp(),
    })
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Creazione routine non confermata.')
    }
    return routineFromDoc(snap.id, familyId, snap.data())
  })
}

export async function getFamilyRoutineDay(
  familyId: string,
  dateId: string,
): Promise<DataResult<FamilyRoutineDay | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !DATE_ID_RE.test(dateId)) {
    return fail(
      'firestore/invalid-argument',
      'familyId obbligatorio e dateId nel formato yyyy-mm-dd.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(routineDayRef(db, familyId, dateId))
    if (!snap.exists()) return null
    return routineDayFromDoc(snap.id, familyId, snap.data())
  })
}

/** Upsert completamenti giornalieri. Non invocato dalla UI in STEP 1. */
export async function upsertFamilyRoutineDay(
  familyId: string,
  input: UpsertRoutineDayInput,
): Promise<DataResult<FamilyRoutineDay>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !DATE_ID_RE.test(input.date)) {
    return fail(
      'firestore/invalid-argument',
      'familyId obbligatorio e date nel formato yyyy-mm-dd.',
    )
  }

  return runFirestore(async () => {
    const dateId = input.date
    const completions: Record<string, Record<string, unknown>> = {}
    for (const [routineId, entry] of Object.entries(input.completions)) {
      completions[routineId] = {
        completed: entry.completed,
        source: entry.source ?? null,
        completedAt: entry.completedAt
          ? isoToTimestamp(entry.completedAt)
          : null,
      }
    }

    const ref = routineDayRef(db, familyId, dateId)
    await setDoc(
      ref,
      {
        date: dateId,
        completions,
        pointsEarned: input.pointsEarned,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Salvataggio routine day non confermato.')
    }
    return routineDayFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyRoutineDays(
  familyId: string,
): Promise<DataResult<FamilyRoutineDay[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDocs(routineDaysCol(db, familyId))
    return snap.docs.map((d) => routineDayFromDoc(d.id, familyId, d.data()))
  })
}
