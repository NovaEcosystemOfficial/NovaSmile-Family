import {
  addDoc,
  deleteDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { deleteObject, ref as storageRef, uploadBytes } from 'firebase/storage'
import type { FamilyVoiceMessage } from '../../types/cloud'
import { getFirebaseStorage, getFirestore } from '../../lib/firebase'
import { timestampToIso } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { voiceMessageRef, voiceMessagesCol } from './refs'

function voiceFromDoc(
  id: string,
  familyId: string,
  data: Record<string, unknown>,
): FamilyVoiceMessage {
  return {
    id,
    familyId,
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : '',
    contentType:
      typeof data.contentType === 'string' ? data.contentType : 'audio/webm',
    durationSec:
      typeof data.durationSec === 'number' ? data.durationSec : 0,
    byteSize: typeof data.byteSize === 'number' ? data.byteSize : 0,
    status: data.status === 'failed' ? 'failed' : 'uploaded',
    createdAt: timestampToIso(data.createdAt),
    createdByUid:
      typeof data.createdByUid === 'string' ? data.createdByUid : '',
  }
}

export async function listFamilyVoiceMessages(
  familyId: string,
  options?: { max?: number },
): Promise<DataResult<FamilyVoiceMessage[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }
  const max = options?.max ?? 30

  return runFirestore(async () => {
    const q = query(
      voiceMessagesCol(db, familyId),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) =>
      voiceFromDoc(d.id, familyId, d.data() as Record<string, unknown>),
    )
  })
}

/**
 * Upload audio su Storage + metadati Firestore.
 * Richiede regole Storage e match voiceMessages pubblicate.
 */
export async function createFamilyVoiceMessage(
  familyId: string,
  input: {
    createdByUid: string
    blob: Blob
    durationSec: number
    contentType: string
  },
): Promise<DataResult<FamilyVoiceMessage>> {
  const db = getFirestore()
  const storage = getFirebaseStorage()
  if (!db) return firestoreUnavailable()
  if (!storage) {
    return fail(
      'storage/unavailable',
      'Firebase Storage non disponibile. Verifica VITE_FIREBASE_STORAGE_BUCKET.',
    )
  }
  if (!familyId.trim() || !input.createdByUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e createdByUid sono obbligatori.',
    )
  }
  if (input.blob.size <= 0) {
    return fail('firestore/invalid-argument', 'File audio vuoto.')
  }
  if (input.blob.size > 5 * 1024 * 1024) {
    return fail(
      'firestore/invalid-argument',
      'Audio troppo grande (max 5 MB su Spark/client).',
    )
  }

  return runFirestore(async () => {
    const voiceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const storagePath = `families/${familyId}/voice/${input.createdByUid}/${voiceId}`
    const objectRef = storageRef(storage, storagePath)
    await uploadBytes(objectRef, input.blob, {
      contentType: input.contentType || 'audio/webm',
    })

    const docRef = await addDoc(voiceMessagesCol(db, familyId), {
      storagePath,
      contentType: input.contentType || 'audio/webm',
      durationSec: Math.max(0, Math.floor(input.durationSec)),
      byteSize: input.blob.size,
      status: 'uploaded',
      createdByUid: input.createdByUid,
      createdAt: serverTimestamp(),
    })

    return {
      id: docRef.id,
      familyId,
      storagePath,
      contentType: input.contentType || 'audio/webm',
      durationSec: Math.max(0, Math.floor(input.durationSec)),
      byteSize: input.blob.size,
      status: 'uploaded' as const,
      createdAt: new Date().toISOString(),
      createdByUid: input.createdByUid,
    }
  })
}

export async function deleteFamilyVoiceMessage(
  familyId: string,
  voice: FamilyVoiceMessage,
): Promise<DataResult<true>> {
  const db = getFirestore()
  const storage = getFirebaseStorage()
  if (!db) return firestoreUnavailable()

  return runFirestore(async () => {
    if (storage && voice.storagePath) {
      try {
        await deleteObject(storageRef(storage, voice.storagePath))
      } catch {
        // Metadati eliminati anche se l'oggetto Storage manca.
      }
    }
    await deleteDoc(voiceMessageRef(db, familyId, voice.id))
    return true as const
  })
}
