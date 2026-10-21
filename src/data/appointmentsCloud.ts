import {
  createFamilyAppointment,
  deleteFamilyAppointment,
  listFamilyAppointments,
  updateFamilyAppointment,
} from './firestore/appointments'
import { createFamilyActivity } from './firestore/activities'
import { requireFamilyEditor, requireFamilyMember } from './memberGate'
import { fail, type DataResult } from './firestore/errors'
import type { FamilyAppointment } from '../types/cloud'

export async function listVerifiedAppointments(
  familyId: string,
  uid: string,
  options?: { max?: number },
): Promise<DataResult<FamilyAppointment[]>> {
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: programmazioni non disponibili.',
  )
  if (!member.ok) return member
  return listFamilyAppointments(familyId, options)
}

export async function createVerifiedAppointment(
  familyId: string,
  uid: string,
  input: { text: string; scheduledFor: string },
): Promise<DataResult<FamilyAppointment>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Ruolo viewer: non puoi creare programmazioni.',
  )
  if (!editor.ok) return editor

  const text = input.text.trim()
  if (!text) {
    return fail('firestore/invalid-argument', 'Testo obbligatorio.')
  }
  const when = new Date(input.scheduledFor)
  if (Number.isNaN(when.getTime())) {
    return fail('firestore/invalid-argument', 'Data/ora non valide.')
  }

  const created = await createFamilyAppointment(familyId, {
    text,
    scheduledFor: when.toISOString(),
    createdByUid: uid,
    status: 'scheduled',
  })
  if (!created.ok) return created

  void createFamilyActivity(familyId, {
    title: 'Promemoria salvato',
    detail: text.slice(0, 120),
    tone: 'info',
  })

  return created
}

export async function cancelVerifiedAppointment(
  familyId: string,
  uid: string,
  appointment: FamilyAppointment,
): Promise<DataResult<FamilyAppointment>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Ruolo insufficiente per annullare la programmazione.',
  )
  if (!editor.ok) return editor

  return updateFamilyAppointment(familyId, appointment.id, {
    text: appointment.text,
    scheduledFor: appointment.scheduledFor,
    status: 'cancelled',
    createdByUid: appointment.createdByUid,
    createdAt: appointment.createdAt || new Date().toISOString(),
  })
}

export async function deleteVerifiedAppointment(
  familyId: string,
  uid: string,
  appointmentId: string,
): Promise<DataResult<true>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Solo owner/parent possono eliminare (delete richiede owner nelle regole).',
  )
  if (!editor.ok) return editor
  if (editor.data.role !== 'owner') {
    return fail(
      'firestore/permission-denied',
      'Solo il ruolo owner può eliminare definitivamente un appuntamento.',
    )
  }
  return deleteFamilyAppointment(familyId, appointmentId)
}
