import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { Sorrino } from '../components/Sorrino'
import type { FamilyPreferences } from '../types'

interface FamilyProfileProps {
  preferences: FamilyPreferences
  onChange: (next: FamilyPreferences) => void
  storageError: string | null
}

export function FamilyProfile({
  preferences,
  onChange,
  storageError,
}: FamilyProfileProps) {
  function update<K extends keyof FamilyPreferences>(
    key: K,
    value: FamilyPreferences[K],
  ) {
    onChange({ ...preferences, [key]: value })
  }

  return (
    <div className="page">
      <DemoBanner message="Preferenze salvate solo in localStorage. Nessuna credenziale e nessuna sincronizzazione remota." />

      <header className="page-header">
        <div>
          <p className="eyebrow">Profilo famiglia</p>
          <h2>Impostazioni locali</h2>
          <p className="lede">
            Personalizza nomi e preferenze del pannello. Questi dati restano sul
            dispositivo e non sono sensibili.
          </p>
        </div>
        <Sorrino mood="sleep" size={76} />
      </header>

      {storageError && (
        <p className="alert alert-error" role="alert">
          {storageError}
        </p>
      )}

      <div className="grid-2">
        <Card accent="blue" title="Genitore">
          <label className="field">
            <span>Nome genitore</span>
            <input
              type="text"
              value={preferences.parentName}
              onChange={(e) => update('parentName', e.target.value)}
              maxLength={40}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span>Stile saluto</span>
            <select
              value={preferences.greetingStyle}
              onChange={(e) =>
                update(
                  'greetingStyle',
                  e.target.value as FamilyPreferences['greetingStyle'],
                )
              }
            >
              <option value="caldo">Caldo</option>
              <option value="energico">Energico</option>
              <option value="tranquillo">Tranquillo</option>
            </select>
          </label>
        </Card>

        <Card accent="orange" title="Bambino">
          <label className="field">
            <span>Nome bambino</span>
            <input
              type="text"
              value={preferences.childName}
              onChange={(e) => update('childName', e.target.value)}
              maxLength={40}
              autoComplete="off"
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.showPoints}
              onChange={(e) => update('showPoints', e.target.checked)}
            />
            <span>Mostra punti gamification</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.reminderSound}
              onChange={(e) => update('reminderSound', e.target.checked)}
            />
            <span>Promemoria sonoro (preferenza locale)</span>
          </label>
        </Card>
      </div>

      <Card accent="purple" title="Sicurezza e collegamento app">
        <ul className="info-list">
          <li>
            Nessuna password, chiave API o credenziale è memorizzata in questo
            frontend.
          </li>
          <li>
            La sincronizzazione con l’app Flutter NovaSmile non è attiva in
            questa versione.
          </li>
          <li>
            Il collegamento avverrà in una fase successiva tramite un backend
            sicuro.
          </li>
        </ul>
      </Card>
    </div>
  )
}
