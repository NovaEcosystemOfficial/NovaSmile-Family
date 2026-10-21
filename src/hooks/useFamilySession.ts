import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  bootstrapFamilyAtomic,
  resolveVerifiedFamilyId,
} from '../data/familyBootstrap'
import { getFamilyProfile } from '../data/firestore/profile'
import { profileToPreferences } from '../data/familyTrust'
import type { FamilyPreferences } from '../types'
import type { MemberRole } from '../types/cloud'

export type FamilySessionStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'local_fallback'
  | 'error'

export interface FamilySession {
  status: FamilySessionStatus
  familyId: string | null
  role: MemberRole | null
  cloudProfile: FamilyPreferences | null
  message: string | null
  /** true solo se famiglia cloud verificata (non solo locale) */
  cloudLinked: boolean
}

const INITIAL: FamilySession = {
  status: 'idle',
  familyId: null,
  role: null,
  cloudProfile: null,
  message: null,
  cloudLinked: false,
}

function isHardFirestoreFailure(code: string): boolean {
  return (
    code === 'firestore/unavailable' ||
    code === 'unavailable' ||
    code === 'unauthenticated' ||
    code === 'firestore/invalid-argument'
  )
}

/** Messaggio UI senza stack, path interni o payload grezzi. */
function toUserMessage(code: string, message: string): string {
  const trimmed = message.trim()
  if (!trimmed) {
    return `Collegamento cloud non riuscito (${code}).`
  }
  if (trimmed.length > 220) {
    return `${trimmed.slice(0, 217)}…`
  }
  return trimmed
}

/**
 * Sessione famiglia post-login (Spark).
 * Bootstrap atomico client-side; fallback locale se fallisce.
 * cloudLinked solo dopo verifica membership. Nessuna Cloud Function.
 */
export function useFamilySession(user: User | null): FamilySession {
  const [session, setSession] = useState<FamilySession>(INITIAL)
  const uid = user?.uid ?? null

  useEffect(() => {
    if (!uid) {
      queueMicrotask(() => setSession(INITIAL))
      return
    }

    let cancelled = false
    const displayName =
      typeof user?.displayName === 'string' && user.displayName.trim()
        ? user.displayName.trim()
        : 'Genitore'
    const email =
      typeof user?.email === 'string' && user.email.trim()
        ? user.email.trim()
        : 'unknown@local'

    queueMicrotask(() => {
      if (cancelled) return
      setSession({
        status: 'loading',
        familyId: null,
        role: null,
        cloudProfile: null,
        message: 'Verifica collegamento famiglia in corso…',
        cloudLinked: false,
      })
    })

    async function run(activeUid: string) {
      const verified = await resolveVerifiedFamilyId(activeUid)
      if (cancelled) return

      if (!verified.ok) {
        if (isHardFirestoreFailure(verified.error.code)) {
          setSession({
            status: 'error',
            familyId: null,
            role: null,
            cloudProfile: null,
            message: toUserMessage(verified.error.code, verified.error.message),
            cloudLinked: false,
          })
          return
        }
        // Errori soft (es. permission-denied su binding assente): prova bootstrap.
      } else if (verified.data) {
        const profileResult = await getFamilyProfile(verified.data)
        if (cancelled) return
        setSession({
          status: 'ready',
          familyId: verified.data,
          role: null,
          cloudProfile:
            profileResult.ok && profileResult.data
              ? profileToPreferences(profileResult.data)
              : null,
          message: 'Famiglia già collegata all’account.',
          cloudLinked: true,
        })
        return
      }

      const boot = await bootstrapFamilyAtomic(activeUid, {
        parentDisplayName: displayName,
        email,
      })
      if (cancelled) return

      if (!boot.ok) {
        setSession({
          status: isHardFirestoreFailure(boot.error.code)
            ? 'error'
            : 'local_fallback',
          familyId: null,
          role: null,
          cloudProfile: null,
          message: toUserMessage(boot.error.code, boot.error.message),
          cloudLinked: false,
        })
        return
      }

      const profileResult = await getFamilyProfile(boot.data.familyId)
      if (cancelled) return

      setSession({
        status: 'ready',
        familyId: boot.data.familyId,
        role: boot.data.role,
        cloudProfile:
          profileResult.ok && profileResult.data
            ? profileToPreferences(profileResult.data)
            : null,
        message: boot.data.created
          ? 'Famiglia creata e collegata a Firestore.'
          : 'Famiglia già collegata all’account.',
        cloudLinked: true,
      })
    }

    void run(uid)

    return () => {
      cancelled = true
    }
  }, [uid, user?.displayName, user?.email])

  return session
}
