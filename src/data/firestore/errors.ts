import { FirebaseError } from 'firebase/app'

export interface DataError {
  code: string
  message: string
}

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError }

export function ok<T>(data: T): DataResult<T> {
  return { ok: true, data }
}

export function fail<T = never>(code: string, message: string): DataResult<T> {
  return { ok: false, error: { code, message } }
}

export function firestoreUnavailable<T = never>(): DataResult<T> {
  return fail(
    'firestore/unavailable',
    'Firestore non disponibile. Verifica la configurazione VITE_FIREBASE_* e riavvia Vite.',
  )
}

export function mapFirestoreError(err: unknown): DataError {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'permission-denied':
        return {
          code: err.code,
          message:
            'Accesso negato da Firestore. Controlla di essere autenticato con lo stesso account e che il bootstrap famiglia sia completo.',
        }
      case 'not-found':
        return {
          code: err.code,
          message: 'Documento o raccolta non trovati.',
        }
      case 'unavailable':
        return {
          code: err.code,
          message: 'Firestore temporaneamente non raggiungibile. Riprova più tardi.',
        }
      case 'unauthenticated':
        return {
          code: err.code,
          message: 'Utente non autenticato. Accedi di nuovo e riprova.',
        }
      default:
        return {
          code: err.code,
          message: err.message || 'Errore Firestore.',
        }
    }
  }

  if (err instanceof Error) {
    return { code: 'firestore/unknown', message: err.message }
  }

  return { code: 'firestore/unknown', message: 'Errore Firestore sconosciuto.' }
}

export async function runFirestore<T>(
  operation: () => Promise<T>,
): Promise<DataResult<T>> {
  try {
    const data = await operation()
    return ok(data)
  } catch (err) {
    const mapped = mapFirestoreError(err)
    return fail(mapped.code, mapped.message)
  }
}
