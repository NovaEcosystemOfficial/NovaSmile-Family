import {
  createViewerMember,
  listFamilyMembers,
  removeFamilyMember,
} from './firestore/members'
import { requireFamilyMember } from './memberGate'
import { fail, type DataResult } from './firestore/errors'
import type { FamilyMember } from '../types/cloud'

/** UID Firebase Auth tipici: 20–128 caratteri alfanumerici. */
const UID_RE = /^[a-zA-Z0-9]{20,128}$/

export function isValidFirebaseUid(uid: string): boolean {
  return UID_RE.test(uid.trim())
}

export async function listVerifiedMembers(
  familyId: string,
  requesterUid: string,
): Promise<DataResult<FamilyMember[]>> {
  const member = await requireFamilyMember(
    familyId,
    requesterUid,
    'Non sei membro di questa famiglia: elenco non disponibile.',
  )
  if (!member.ok) return member
  return listFamilyMembers(familyId)
}

/**
 * Owner aggiunge un account bambino (viewer) alla famiglia verificata.
 * familyId non è scelto dal membro: proviene dalla sessione owner già verificata.
 */
export async function addVerifiedViewerMember(
  familyId: string,
  ownerUid: string,
  input: {
    memberUid: string
    displayName: string
    email?: string
  },
): Promise<DataResult<FamilyMember>> {
  const self = await requireFamilyMember(
    familyId,
    ownerUid,
    'Non sei membro di questa famiglia.',
  )
  if (!self.ok) return self
  if (self.data.role !== 'owner') {
    return fail(
      'firestore/permission-denied',
      'Solo il ruolo owner può associare nuovi membri.',
    )
  }

  const memberUid = input.memberUid.trim()
  if (!isValidFirebaseUid(memberUid)) {
    return fail(
      'firestore/invalid-argument',
      'UID non valido. Copia l’UID Firebase mostrato nell’app NovaSmile Kids.',
    )
  }
  if (memberUid === ownerUid) {
    return fail(
      'firestore/invalid-argument',
      'Non puoi aggiungere il tuo stesso account come viewer.',
    )
  }

  const displayName = input.displayName.trim()
  if (!displayName) {
    return fail(
      'firestore/invalid-argument',
      'Inserisci un nome visualizzato per Nicholas.',
    )
  }

  const emailRaw = input.email?.trim() ?? ''
  const email =
    emailRaw ||
    `viewer-${memberUid.slice(0, 8)}@members.novasmile.local`

  return createViewerMember(familyId, {
    uid: memberUid,
    displayName: displayName.slice(0, 80),
    email: email.slice(0, 200),
  })
}

export async function removeVerifiedViewerMember(
  familyId: string,
  ownerUid: string,
  memberUid: string,
): Promise<DataResult<true>> {
  const self = await requireFamilyMember(familyId, ownerUid)
  if (!self.ok) return self
  if (self.data.role !== 'owner') {
    return fail(
      'firestore/permission-denied',
      'Solo il ruolo owner può rimuovere membri.',
    )
  }
  if (memberUid.trim() === ownerUid) {
    return fail(
      'firestore/invalid-argument',
      'Non puoi rimuovere te stesso dalla famiglia.',
    )
  }

  const listed = await listFamilyMembers(familyId)
  if (!listed.ok) return listed
  const target = listed.data.find((m) => m.uid === memberUid.trim())
  if (!target) {
    return fail('firestore/not-found', 'Membro non trovato.')
  }
  if (target.role !== 'viewer') {
    return fail(
      'firestore/permission-denied',
      'Da questa schermata puoi rimuovere solo membri viewer.',
    )
  }

  return removeFamilyMember(familyId, memberUid)
}
