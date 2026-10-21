import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirestore } from '../lib/firebase'
import { getFamilyMember } from './firestore/members'
import { getUserFamilyBinding } from './firestore/users'
import {
  fail,
  firestoreUnavailable,
  ok,
  runFirestore,
  type DataResult,
} from './firestore/errors'
import { pickTrustedFamilyId } from './familyTrust'
import type { MemberRole } from '../types/cloud'

export const TRUSTED_FAMILY_ID_KEY = 'novasmile-family:trusted-family-id'

export interface BootstrapFamilyResult {
  familyId: string
  created: boolean
  role: MemberRole
}

export interface BootstrapFamilyInput {
  parentDisplayName?: string
  childName?: string
  familyName?: string
  email?: string
}

type TxOutcome =
  | { kind: 'created'; familyId: string }
  | { kind: 'existing'; familyId: string }

function readCachedFamilyId(): string | null {
  try {
    const raw = localStorage.getItem(TRUSTED_FAMILY_ID_KEY)
    return raw?.trim() ? raw.trim() : null
  } catch {
    return null
  }
}

export function writeCachedFamilyId(familyId: string): void {
  try {
    localStorage.setItem(TRUSTED_FAMILY_ID_KEY, familyId)
  } catch {
    // ignore
  }
}

export function clearCachedFamilyId(): void {
  try {
    localStorage.removeItem(TRUSTED_FAMILY_ID_KEY)
  } catch {
    // ignore
  }
}

function cleanName(value: string | undefined, fallback: string, max = 80): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return fallback
  return trimmed.slice(0, max)
}

/**
 * Risolve familyId da users/{uid} o cache locale, solo dopo verifica membership.
 */
export async function resolveVerifiedFamilyId(
  uid: string,
): Promise<DataResult<string | null>> {
  const fromUser = await getUserFamilyBinding(uid)
  if (!fromUser.ok) {
    if (fromUser.error.code !== 'permission-denied') {
      return fromUser
    }
  } else if (fromUser.data) {
    const memberResult = await getFamilyMember(fromUser.data.familyId, uid)
    if (!memberResult.ok) return memberResult
    const trusted = pickTrustedFamilyId(
      fromUser.data.familyId,
      memberResult.data,
      uid,
    )
    if (trusted) {
      writeCachedFamilyId(trusted)
      return ok(trusted)
    }
    clearCachedFamilyId()
  }

  const cached = readCachedFamilyId()
  if (!cached) return ok(null)

  const memberResult = await getFamilyMember(cached, uid)
  if (!memberResult.ok) {
    clearCachedFamilyId()
    return memberResult
  }

  const trusted = pickTrustedFamilyId(cached, memberResult.data, uid)
  if (!trusted) {
    clearCachedFamilyId()
    return ok(null)
  }
  return ok(trusted)
}

/**
 * Bootstrap atomico Spark (runTransaction).
 * Legge users/{uid} prima delle scritture per mitigare race concorrenti
 * (contention Firestore). Compatibile con getAfter()/existsAfter() nelle regole.
 * Nessuna Cloud Function.
 */
export async function bootstrapFamilyAtomic(
  uid: string,
  input: BootstrapFamilyInput = {},
): Promise<DataResult<BootstrapFamilyResult>> {
  const db = getFirestore()
  if (!db) return firestoreUnavailable()
  if (!uid.trim()) {
    return fail('firestore/invalid-argument', 'uid obbligatorio.')
  }

  const existing = await resolveVerifiedFamilyId(uid)
  if (!existing.ok) return existing
  if (existing.data) {
    const member = await getFamilyMember(existing.data, uid)
    if (!member.ok) return member
    return ok({
      familyId: existing.data,
      created: false,
      role: member.data?.role ?? 'owner',
    })
  }

  const parentDisplayName = cleanName(input.parentDisplayName, 'Genitore')
  const childName = cleanName(input.childName, 'Bambino')
  const familyName = cleanName(input.familyName, 'Famiglia NovaSmile')
  const email = cleanName(input.email, 'unknown@local', 200)

  const userDocRef = doc(db, 'users', uid)

  const writeResult = await runFirestore(async () => {
    const outcome = await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userDocRef)
      if (userSnap.exists()) {
        const bound = userSnap.data()?.familyId
        if (typeof bound === 'string' && bound.trim()) {
          return {
            kind: 'existing',
            familyId: bound.trim(),
          } satisfies TxOutcome
        }
      }

      const familyRef = doc(collection(db, 'families'))
      const familyId = familyRef.id
      const memberRef = doc(db, 'families', familyId, 'members', uid)
      const profileRef = doc(db, 'families', familyId, 'profile', 'settings')

      tx.set(familyRef, {
        name: familyName,
        createdByUid: uid,
        status: 'active',
        createdAt: serverTimestamp(),
      })

      tx.set(memberRef, {
        role: 'owner',
        displayName: parentDisplayName,
        email,
        joinedAt: serverTimestamp(),
      })

      tx.set(profileRef, {
        parentDisplayName,
        childName,
        greetingStyle: 'caldo',
        showPoints: true,
        reminderSound: true,
        updatedAt: serverTimestamp(),
        updatedByUid: uid,
      })

      tx.set(userDocRef, {
        familyId,
        updatedAt: serverTimestamp(),
      })

      return { kind: 'created', familyId } satisfies TxOutcome
    })

    return outcome
  })

  if (!writeResult.ok) return writeResult

  const outcome = writeResult.data
  const confirmed = await confirmBootstrapMembership(outcome.familyId, uid)
  if (!confirmed.ok) return confirmed

  return ok({
    familyId: outcome.familyId,
    created: outcome.kind === 'created',
    role: confirmed.data.role,
  })
}

/**
 * Conferma membership e aggiorna cache locale fidata.
 * Non imposta cloudLinked: lo fa solo useFamilySession dopo successo.
 */
export async function confirmBootstrapMembership(
  familyId: string,
  uid: string,
): Promise<DataResult<BootstrapFamilyResult>> {
  const memberResult = await getFamilyMember(familyId, uid)
  if (!memberResult.ok) return memberResult
  if (!memberResult.data) {
    clearCachedFamilyId()
    return fail(
      'firestore/not-found',
      'Membership non trovata dopo il bootstrap. Cache locale non aggiornata.',
    )
  }

  writeCachedFamilyId(familyId)
  return ok({
    familyId,
    created: false,
    role: memberResult.data.role,
  })
}
