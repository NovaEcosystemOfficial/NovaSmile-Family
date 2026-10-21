import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  mapAuthError,
  signInWithGoogle,
  signOut,
  subscribeToAuth,
} from '../lib/auth'
import { getFirebaseStatus, type FirebaseEnvKey } from '../lib/firebase'

type AuthPhase = 'loading' | 'ready'

interface AuthState {
  phase: AuthPhase
  user: User | null
  configError: string | null
  missingKeys: FirebaseEnvKey[]
  actionError: string | null
  busy: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  clearActionError: () => void
}

export function useAuth(): AuthState {
  const boot = getFirebaseStatus()
  const [phase, setPhase] = useState<AuthPhase>(boot.ready ? 'loading' : 'ready')
  const [user, setUser] = useState<User | null>(null)
  const [configError] = useState<string | null>(boot.error)
  const [missingKeys] = useState<FirebaseEnvKey[]>(boot.missing)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const authConfigured = boot.ready

  useEffect(() => {
    if (!authConfigured) {
      return
    }

    const { unsubscribe } = subscribeToAuth((nextUser) => {
      setUser(nextUser)
      setPhase('ready')
    })

    return () => {
      unsubscribe?.()
    }
  }, [authConfigured])

  async function signIn() {
    setActionError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err) {
        setActionError(mapAuthError(String((err as { code: string }).code)))
      } else if (err instanceof Error) {
        setActionError(err.message)
      } else {
        setActionError('Accesso Google non riuscito.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function signOutUser() {
    setActionError(null)
    setBusy(true)
    try {
      await signOut()
    } catch (err) {
      if (err instanceof Error) {
        setActionError(err.message)
      } else {
        setActionError('Uscita non riuscita.')
      }
    } finally {
      setBusy(false)
    }
  }

  return {
    phase,
    user,
    configError,
    missingKeys,
    actionError,
    busy,
    signIn,
    signOutUser,
    clearActionError: () => setActionError(null),
  }
}
