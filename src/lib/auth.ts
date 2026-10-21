import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import { getFirebaseAuth, getFirebaseStatus } from './firebase'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Dominio non autorizzato. Aggiungi “localhost” (senza porta) in Authentication → Settings → Authorized domains.'
    case 'auth/popup-blocked':
      return 'Il browser ha bloccato il popup di Google. Consenti i popup e riprova.'
    case 'auth/popup-closed-by-user':
      return 'Accesso annullato: la finestra di Google è stata chiusa.'
    case 'auth/cancelled-popup-request':
      return 'Richiesta di accesso interrotta. Riprova.'
    case 'auth/network-request-failed':
      return 'Errore di rete. Controlla la connessione e riprova.'
    case 'auth/operation-not-allowed':
      return 'Il provider Google non è abilitato in Firebase Authentication.'
    default:
      return `Accesso non riuscito (${code || 'sconosciuto'}). Riprova.`
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): {
  unsubscribe: Unsubscribe | null
  error: string | null
  missing: string[]
} {
  const status = getFirebaseStatus()
  if (!status.ready) {
    callback(null)
    return {
      unsubscribe: null,
      error: status.error,
      missing: status.missing,
    }
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return {
      unsubscribe: null,
      error: 'Auth Firebase non disponibile.',
      missing: [],
    }
  }

  const unsubscribe = onAuthStateChanged(auth, callback)
  return { unsubscribe, error: null, missing: [] }
}

export async function signInWithGoogle(): Promise<User> {
  const status = getFirebaseStatus()
  if (!status.ready) {
    throw new Error(
      status.error ??
        'Configurazione Firebase mancante: impossibile avviare il login Google.',
    )
  }

  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('Auth Firebase non disponibile.')
  }

  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) {
    throw new Error('Auth Firebase non disponibile.')
  }
  await firebaseSignOut(auth)
}
