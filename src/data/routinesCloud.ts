import {
  createFamilyRoutine,
  getFamilyRoutineDay,
  listFamilyRoutines,
  upsertFamilyRoutineDay,
} from './firestore/routines'
import { createFamilyActivity } from './firestore/activities'
import {
  localDateId,
  requireFamilyEditor,
  requireFamilyMember,
} from './memberGate'
import { fail, type DataResult } from './firestore/errors'
import type {
  FamilyRoutine,
  FamilyRoutineDay,
  RoutineCompletionEntry,
  RoutinePeriod,
} from '../types/cloud'

const DEFAULT_ROUTINES: Array<{
  title: string
  description: string
  period: RoutinePeriod
  points: number
  sortOrder: number
}> = [
  {
    title: 'Metti l’apparecchio',
    description: 'Controlla che sia ben posizionato prima di uscire.',
    period: 'mattina',
    points: 15,
    sortOrder: 10,
  },
  {
    title: 'Spazzolino + filo',
    description: 'Due minuti di spazzolino e un passaggio di filo.',
    period: 'mattina',
    points: 15,
    sortOrder: 20,
  },
  {
    title: 'Elastici dopo merenda',
    description: 'Rimetti gli elastici dopo lo snack del pomeriggio.',
    period: 'pomeriggio',
    points: 20,
    sortOrder: 30,
  },
  {
    title: 'Acqua e sorriso',
    description: 'Bevi un bicchiere d’acqua e fai un selfie a Sorrino.',
    period: 'pomeriggio',
    points: 10,
    sortOrder: 40,
  },
  {
    title: 'Igiene serale completa',
    description: 'Spazzolino, filo e apparecchio pulito.',
    period: 'sera',
    points: 25,
    sortOrder: 50,
  },
  {
    title: 'Elastici notturni',
    description: 'Metti gli elastici prima di dormire.',
    period: 'sera',
    points: 20,
    sortOrder: 60,
  },
]

export async function listVerifiedRoutines(
  familyId: string,
  uid: string,
): Promise<DataResult<FamilyRoutine[]>> {
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: routine non disponibili.',
  )
  if (!member.ok) return member
  return listFamilyRoutines(familyId)
}

export async function seedDefaultRoutinesIfEmpty(
  familyId: string,
  uid: string,
): Promise<DataResult<FamilyRoutine[]>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Solo owner/parent possono creare i template routine.',
  )
  if (!editor.ok) return editor

  const existing = await listFamilyRoutines(familyId)
  if (!existing.ok) return existing
  if (existing.data.length > 0) return existing

  for (const item of DEFAULT_ROUTINES) {
    const created = await createFamilyRoutine(familyId, {
      ...item,
      active: true,
    })
    if (!created.ok) return created
  }

  void createFamilyActivity(familyId, {
    title: 'Routine iniziali create',
    detail: 'Template mattina/pomeriggio/sera salvati su Firestore.',
    tone: 'success',
  })

  return listFamilyRoutines(familyId)
}

export async function getVerifiedRoutineDay(
  familyId: string,
  uid: string,
  dateId = localDateId(),
): Promise<DataResult<FamilyRoutineDay | null>> {
  const member = await requireFamilyMember(familyId, uid)
  if (!member.ok) return member
  return getFamilyRoutineDay(familyId, dateId)
}

/**
 * Toggle completamento. Ricalcola pointsEarned dai template attivi.
 * Idempotente: stesso stato → nessun write inutile.
 */
export async function toggleVerifiedRoutineCompletion(
  familyId: string,
  uid: string,
  routines: FamilyRoutine[],
  routineId: string,
  completed: boolean,
  dateId = localDateId(),
): Promise<DataResult<FamilyRoutineDay>> {
  // Membership sufficiente (regole locali: isMember su routineDays).
  // Finché le regole remote non includono il viewer, il bambino riceverà permission-denied.
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: impossibile aggiornare i completamenti.',
  )
  if (!member.ok) return member

  const dayResult = await getFamilyRoutineDay(familyId, dateId)
  if (!dayResult.ok) return dayResult

  const previous = dayResult.data?.completions ?? {}
  const prevEntry = previous[routineId]
  if (prevEntry?.completed === completed) {
    return {
      ok: true,
      data: dayResult.data ?? {
        id: dateId,
        familyId,
        date: dateId,
        completions: previous,
        pointsEarned: 0,
      },
    }
  }

  const completions: Record<string, RoutineCompletionEntry> = {
    ...previous,
    [routineId]: {
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
      source: member.data.role === 'viewer' ? 'child' : 'parent',
    },
  }

  let pointsEarned = 0
  for (const routine of routines) {
    if (!routine.active) continue
    if (completions[routine.id]?.completed) {
      pointsEarned += Math.max(0, routine.points)
    }
  }

  const saved = await upsertFamilyRoutineDay(familyId, {
    date: dateId,
    completions,
    pointsEarned,
  })
  if (!saved.ok) return saved

  if (completed) {
    const title =
      routines.find((r) => r.id === routineId)?.title ?? 'Missione'
    void createFamilyActivity(familyId, {
      title: 'Routine completata',
      detail: title,
      tone: 'success',
    })
  }

  return saved
}

export function computeDayProgress(
  routines: FamilyRoutine[],
  day: FamilyRoutineDay | null,
): { completed: number; total: number; points: number } {
  const active = routines.filter((r) => r.active)
  const completed = active.filter((r) => day?.completions[r.id]?.completed)
    .length
  return {
    completed,
    total: active.length,
    points: day?.pointsEarned ?? 0,
  }
}

export function assertValidDateId(dateId: string): DataResult<true> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateId)) {
    return fail(
      'firestore/invalid-argument',
      'Data non valida (atteso yyyy-mm-dd).',
    )
  }
  return { ok: true, data: true }
}
