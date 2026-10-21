import {
  createFamilyMessage,
  listFamilyMessages,
} from './firestore/messages'
import { getFamilyMember } from './firestore/members'
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
  const member = await getFamilyMember(familyId, uid)
  if (!member.ok) return member
  if (!member.data) {
    return fail(
      'firestore/permission-denied',
      'Non sei membro di questa famiglia: messaggi non disponibili.',
    )
  }

  return listFamilyMessages(familyId, options)
}

/**
 * Crea messaggio testo su Firestore dopo verifica ruolo editor.
 * Stato `draft`: salvato nel cloud, non consegnato all’app Android.
 */
export async function createVerifiedFamilyMessage(
  familyId: string,
  uid: string,
  text: string,
): Promise<DataResult<FamilyMessage>> {
  const member = await getFamilyMember(familyId, uid)
  if (!member.ok) return member
  if (!member.data) {
    return fail(
      'firestore/permission-denied',
      'Non sei membro di questa famiglia: messaggio non salvato.',
    )
  }
  if (member.data.role === 'viewer') {
    return fail(
      'firestore/permission-denied',
      'Ruolo viewer: non puoi creare messaggi.',
    )
  }

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

  return createFamilyMessage(familyId, {
    text: trimmed,
    createdByUid: uid,
    status: 'draft',
  })
}
