import {
  createFamilyMessage,
  deleteFamilyMessage,
  listFamilyMessages,
  updateFamilyMessage,
} from './firestore/messages'
import { createFamilyActivity } from './firestore/activities'
import { requireFamilyEditor, requireFamilyMember } from './memberGate'
import { fail, type DataResult } from './firestore/errors'
import type { FamilyMessage } from '../types/cloud'

/**
 * Elenco messaggi solo dopo membership verificata.
 * Non accetta familyId arbitrari senza member doc.
 */
export async function listVerifiedFamilyMessages(
  familyId: string,
  uid: string,
  options?: { max?: number },
): Promise<DataResult<FamilyMessage[]>> {
  const member = await requireFamilyMember(
    familyId,
    uid,
    'Non sei membro di questa famiglia: messaggi non disponibili.',
  )
  if (!member.ok) return member
  return listFamilyMessages(familyId, options)
}

/**
 * Stato impostato alla create per invio immediato.
 * Compatibile con Kids: `queued` = disponibile per lettura membri/Android.
 * Non implica lettura o consegna sul device.
 */
export function statusForImmediateSend(): 'queued' {
  return 'queued'
}

/**
 * Invia messaggio testo: una sola create Firestore con status `queued`.
 * Disponibile subito per NovaSmile Kids. Nessuna conferma di lettura/consegna.
 */
export async function createVerifiedFamilyMessage(
  familyId: string,
  uid: string,
  text: string,
): Promise<DataResult<FamilyMessage>> {
  const editor = await requireFamilyEditor(
    familyId,
    uid,
    'Ruolo viewer: non puoi creare messaggi.',
  )
  if (!editor.ok) return editor

  const trimmed = text.trim()
  if (!trimmed) {
    return fail(
      'firestore/invalid-argument',
      'Il testo del messaggio è obbligatorio.',
    )
  }
  if (trimmed.length > 2000) {
    return fail(
      'firestore/invalid-argument',
      'Il messaggio supera il limite di 2000 caratteri.',
    )
  }

  const created = await createFamilyMessage(familyId, {
    text: trimmed,
    createdByUid: uid,
    status: statusForImmediateSend(),
  })
  if (!created.ok) return created

  void createFamilyActivity(familyId, {
    title: 'Messaggio inviato',
    detail: trimmed.slice(0, 120),
    tone: 'info',
  })

  return created
}

/**
 * Pubblica il messaggio per la lettura da membri (app Android).
 * Non implica consegna/notifica: solo status `queued`.
 */
export async function markMessageAvailableForChild(
  familyId: string,
  uid: string,
  message: FamilyMessage,
): Promise<DataResult<FamilyMessage>> {
  const editor = await requireFamilyEditor(familyId, uid)
  if (!editor.ok) return editor
  if (message.status === 'delivered') {
    return fail(
      'firestore/invalid-argument',
      'Messaggio già in stato delivered: non modificare senza conferma dispositivo.',
    )
  }
  return updateFamilyMessage(familyId, message.id, {
    text: message.text,
    status: 'queued',
    createdByUid: message.createdByUid,
    createdAt: message.createdAt || new Date().toISOString(),
    scheduledFor: message.scheduledFor,
    deliveredAt: message.deliveredAt,
  })
}

export async function deleteVerifiedFamilyMessage(
  familyId: string,
  uid: string,
  messageId: string,
): Promise<DataResult<true>> {
  const editor = await requireFamilyEditor(familyId, uid)
  if (!editor.ok) return editor
  if (editor.data.role !== 'owner') {
    return fail(
      'firestore/permission-denied',
      'Solo il ruolo owner può eliminare messaggi.',
    )
  }
  return deleteFamilyMessage(familyId, messageId)
}
