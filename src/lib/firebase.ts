import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  getFirestore as getFirestoreInstance,
  type Firestore,
} from 'firebase/firestore'
import {
  getStorage as getStorageInstance,
  type FirebaseStorage,
} from 'firebase/storage'

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
let firestore: Firestore | null = null
let storage: FirebaseStorage | null = null
let initError: string | null = null
let initMissing: FirebaseEnvKey[] = []

function ensureApp(): {
  app: FirebaseApp | null
  error: string | null
  missing: FirebaseEnvKey[]
} {
  if (app) {
    return { app, error: null, missing: [] }
  }

  const resolved = resolveFirebaseConfig()
  if (!resolved.ok) {
    initError =
      'Configurazione Firebase incompleta. Crea un file .env.local con le variabili VITE_FIREBASE_* (vedi .env.example).'
    initMissing = resolved.missing
    return {
      app: null,
      error: initError,
      missing: resolved.missing,
    }
  }

  try {
    app = initializeApp(resolved.config)
    initError = null
    initMissing = []
    return { app, error: null, missing: [] }
  } catch (err) {
    initError =
      err instanceof Error
        ? `Impossibile inizializzare Firebase: ${err.message}`
        : 'Impossibile inizializzare Firebase.'
    initMissing = []
    app = null
    auth = null
    firestore = null
    storage = null
    return { app: null, error: initError, missing: [] }
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  return ensureApp().app
}

export function getFirebaseAuth(): Auth | null {
  const state = ensureApp()
  if (!state.app) return null
  if (!auth) {
    auth = getAuth(state.app)
  }
  return auth
}

/** Restituisce Firestore riusando la stessa app Auth. Null se la config manca. */
export function getFirestore(): Firestore | null {
  const state = ensureApp()
  if (!state.app) return null
  if (!firestore) {
    firestore = getFirestoreInstance(state.app)
  }
  return firestore
}

/**
 * Firebase Storage (Spark: quote gratuite, no Blaze richiesto per uso base).
 * Null se la config manca. Le regole Storage vanno pubblicate separatamente.
 */
export function getFirebaseStorage(): FirebaseStorage | null {
  const state = ensureApp()
  if (!state.app) return null
  if (!storage) {
    storage = getStorageInstance(state.app)
  }
  return storage
}

export function getFirebaseStatus(): {
  ready: boolean
  error: string | null
  missing: FirebaseEnvKey[]
} {
  const authInstance = getFirebaseAuth()
  if (authInstance) {
    return { ready: true, error: null, missing: [] }
  }
  return {
    ready: false,
    error: initError,
    missing: initMissing,
  }
}
