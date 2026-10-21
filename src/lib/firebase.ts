import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

export const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export type FirebaseEnvKey = (typeof FIREBASE_ENV_KEYS)[number]

export type FirebaseConfigResult =
  | {
      ok: true
      config: {
        apiKey: string
        authDomain: string
        projectId: string
        storageBucket: string
        messagingSenderId: string
        appId: string
      }
    }
  | {
      ok: false
      missing: FirebaseEnvKey[]
    }

function readEnv(key: FirebaseEnvKey): string {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Legge le variabili VITE_FIREBASE_* senza inventare valori. */
export function resolveFirebaseConfig(): FirebaseConfigResult {
  const values = {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  }

  const missing = FIREBASE_ENV_KEYS.filter((key) => {
    switch (key) {
      case 'VITE_FIREBASE_API_KEY':
        return !values.apiKey
      case 'VITE_FIREBASE_AUTH_DOMAIN':
        return !values.authDomain
      case 'VITE_FIREBASE_PROJECT_ID':
        return !values.projectId
      case 'VITE_FIREBASE_STORAGE_BUCKET':
        return !values.storageBucket
      case 'VITE_FIREBASE_MESSAGING_SENDER_ID':
        return !values.messagingSenderId
      case 'VITE_FIREBASE_APP_ID':
        return !values.appId
    }
  })

  if (missing.length > 0) {
    return { ok: false, missing }
  }

  return { ok: true, config: values }
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let initError: string | null = null

function ensureFirebase(): {
  app: FirebaseApp | null
  auth: Auth | null
  error: string | null
  missing: FirebaseEnvKey[]
} {
  const resolved = resolveFirebaseConfig()
  if (!resolved.ok) {
    return {
      app: null,
      auth: null,
      error:
        'Configurazione Firebase incompleta. Crea un file .env.local con le variabili VITE_FIREBASE_* (vedi .env.example).',
      missing: resolved.missing,
    }
  }

  if (app && auth) {
    return { app, auth, error: null, missing: [] }
  }

  try {
    app = initializeApp(resolved.config)
    auth = getAuth(app)
    initError = null
    return { app, auth, error: null, missing: [] }
  } catch (err) {
    initError =
      err instanceof Error
        ? `Impossibile inizializzare Firebase: ${err.message}`
        : 'Impossibile inizializzare Firebase.'
    app = null
    auth = null
    return { app: null, auth: null, error: initError, missing: [] }
  }
}

export function getFirebaseAuth(): Auth | null {
  return ensureFirebase().auth
}

export function getFirebaseStatus(): {
  ready: boolean
  error: string | null
  missing: FirebaseEnvKey[]
} {
  const state = ensureFirebase()
  return {
    ready: state.auth != null,
    error: state.error,
    missing: state.missing,
  }
}
