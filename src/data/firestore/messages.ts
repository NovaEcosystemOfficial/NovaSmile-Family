import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import type {
  CloudMessageStatus,
  CreateMessageInput,
  FamilyMessage,
} from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { isoToTimestamp, messageFromDoc } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { messageRef, messagesCol } from './refs'

export async function getFamilyMessage(
  familyId: string,
  messageId: string,
): Promise<DataResult<FamilyMessage | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !messageId.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e messageId sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(messageRef(db, familyId, messageId))
    if (!snap.exists()) return null
    return messageFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyMessages(
  familyId: string,
  options?: { max?: number },
): Promise<DataResult<FamilyMessage[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  const max = options?.max ?? 50

  return runFirestore(async () => {
    const q = query(
      messagesCol(db, familyId),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => messageFromDoc(d.id, familyId, d.data()))
  })
}

/** Crea messaggio testo (status tipicamente draft/queued; non implica consegna Android). */
export async function createFamilyMessage(
  familyId: string,
  input: CreateMessageInput,
): Promise<DataResult<FamilyMessage>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.createdByUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e createdByUid sono obbligatori.',
    )
  }
  if (!input.text.trim()) {
    return fail(
      'firestore/invalid-argument',
      'Il testo del messaggio è obbligatorio.',
    )
  }

  return runFirestore(async () => {
    const payload: Record<string, unknown> = {
      type: 'text',
      text: input.text.trim(),
      status: input.status ?? 'queued',
      createdByUid: input.createdByUid,
      createdAt: serverTimestamp(),
    }
    if (input.scheduledFor) {
      payload.scheduledFor = isoToTimestamp(input.scheduledFor)
    }

    const ref = await addDoc(messagesCol(db, familyId), payload)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Creazione messaggio non confermata.')
    }
    return messageFromDoc(snap.id, familyId, snap.data())
  })
}

/** Aggiorna messaggio. Non imposta `delivered` senza conferma dispositivo. */
export async function updateFamilyMessage(
  familyId: string,
  messageId: string,
  patch: {
    text: string
    status: CloudMessageStatus
    createdByUid: string
    createdAt: string
    scheduledFor?: string
    deliveredAt?: string
  },
): Promise<DataResult<FamilyMessage>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !messageId.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e messageId sono obbligatori.',
    )
  }
  if (patch.status === 'delivered' && !patch.deliveredAt) {
    return fail(
      'firestore/invalid-argument',
      'Stato delivered richiede deliveredAt da conferma dispositivo.',
    )
  }

  return runFirestore(async () => {
    const payload: Record<string, unknown> = {
      type: 'text',
      text: patch.text.trim(),
      status: patch.status,
      createdByUid: patch.createdByUid,
      createdAt: isoToTimestamp(patch.createdAt),
    }
    if (patch.scheduledFor) {
      payload.scheduledFor = isoToTimestamp(patch.scheduledFor)
    }
    if (patch.deliveredAt) {
      payload.deliveredAt = isoToTimestamp(patch.deliveredAt)
    }
    const ref = messageRef(db, familyId, messageId)
    await updateDoc(ref, payload)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Aggiornamento messaggio non confermato.')
    }
    return messageFromDoc(snap.id, familyId, snap.data())
  })
}

export async function deleteFamilyMessage(
  familyId: string,
  messageId: string,
): Promise<DataResult<true>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !messageId.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e messageId sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    await deleteDoc(messageRef(db, familyId, messageId))
    return true as const
  })
}
