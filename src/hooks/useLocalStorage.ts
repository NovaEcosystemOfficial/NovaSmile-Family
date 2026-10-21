import { useState } from 'react'

function readStorage<T>(key: string, initialValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return initialValue
    return JSON.parse(raw) as T
  } catch {
    return initialValue
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValueState] = useState<T>(() =>
    readStorage(key, initialValue),
  )
  const [error, setError] = useState<string | null>(null)

  function setValue(next: T) {
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setValueState(next)
      setError(null)
    } catch {
      setError(
        'Impossibile salvare in locale. Controlla lo spazio disponibile del browser.',
      )
    }
  }

  return { value, setValue, error } as const
}
