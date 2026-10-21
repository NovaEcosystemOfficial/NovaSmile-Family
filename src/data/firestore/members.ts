import {
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import type { FamilyMember, UpsertMemberInput } from '../../types/cloud'
import { getFirestore } from '../../lib/firebase'
import { memberFromDoc } from './converters'
import {
  fail,
  firestoreUnavailable,
  runFirestore,
  type DataResult,
} from './errors'
import { memberRef, membersCol } from './refs'

export async function getFamilyMember(
  familyId: string,
  uid: string,
): Promise<DataResult<FamilyMember | null>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !uid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e uid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const snap = await getDoc(memberRef(db, familyId, uid))
    if (!snap.exists()) return null
    return memberFromDoc(snap.id, familyId, snap.data())
  })
}

export async function listFamilyMembers(
  familyId: string,
): Promise<DataResult<FamilyMember[]>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim()) {
    return fail('firestore/invalid-argument', 'familyId obbligatorio.')
  }

  return runFirestore(async () => {
    const snap = await getDocs(membersCol(db, familyId))
    return snap.docs.map((d) => memberFromDoc(d.id, familyId, d.data()))
  })
}

/** Upsert membership generico (uso interno / test). Preferire createViewerMember per pairing. */
export async function upsertFamilyMember(
  familyId: string,
  input: UpsertMemberInput,
): Promise<DataResult<FamilyMember>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.uid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e uid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    const ref = memberRef(db, familyId, input.uid)
    const existing = await getDoc(ref)
    const payload: Record<string, unknown> = {
      role: input.role,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
    }
    if (!existing.exists()) {
      payload.joinedAt = serverTimestamp()
    }

    await setDoc(ref, payload, { merge: true })
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Salvataggio membership non confermato.')
    }
    return memberFromDoc(snap.id, familyId, snap.data())
  })
}

/**
 * Crea (o aggiorna metadati di) un membro viewer.
 * Non promuove a owner/parent. joinedAt immutabile dopo la create.
 */
export async function createViewerMember(
  familyId: string,
  input: {
    uid: string
    displayName: string
    email: string
  },
): Promise<DataResult<FamilyMember>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !input.uid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e uid sono obbligatori.',
    )
  }

  const displayName = input.displayName.trim()
  const email = input.email.trim()
  if (!displayName || displayName.length > 80) {
    return fail(
      'firestore/invalid-argument',
      'Nome visualizzato obbligatorio (max 80 caratteri).',
    )
  }
  if (!email || email.length > 200) {
    return fail(
      'firestore/invalid-argument',
      'Email obbligatoria per le regole Firestore (usa un placeholder se assente).',
    )
  }

  return runFirestore(async () => {
    const ref = memberRef(db, familyId, input.uid.trim())
    const existing = await getDoc(ref)

    if (existing.exists()) {
      const currentRole = existing.data()?.role
      if (currentRole !== 'viewer') {
        throw Object.assign(new Error('Il membro esiste già con un ruolo diverso da viewer.'), {
          code: 'firestore/permission-denied',
        })
      }
      await setDoc(
        ref,
        {
          role: 'viewer',
          displayName,
          email,
          joinedAt: existing.data()?.joinedAt,
        },
        { merge: false },
      )
    } else {
      await setDoc(ref, {
        role: 'viewer',
        displayName,
        email,
        joinedAt: serverTimestamp(),
      })
    }

    const snap = await getDoc(ref)
    if (!snap.exists()) {
      throw new Error('Creazione membership viewer non confermata.')
    }
    return memberFromDoc(snap.id, familyId, snap.data())
  })
}

export async function removeFamilyMember(
  familyId: string,
  memberUid: string,
): Promise<DataResult<true>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!familyId.trim() || !memberUid.trim()) {
    return fail(
      'firestore/invalid-argument',
      'familyId e memberUid sono obbligatori.',
    )
  }

  return runFirestore(async () => {
    await deleteDoc(memberRef(db, familyId, memberUid.trim()))
    return true as const
  })
}
