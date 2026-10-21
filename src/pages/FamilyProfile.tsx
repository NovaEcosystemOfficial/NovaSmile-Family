import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { FamilyManagement } from '../components/FamilyManagement'
import { Sorrino } from '../components/Sorrino'
import { saveVerifiedFamilyProfile } from '../data/profileCloud'
import type { FamilySession } from '../hooks/useFamilySession'
import type { FamilyPreferences } from '../types'

interface FamilyProfileProps {
  preferences: FamilyPreferences
  onChange: (next: FamilyPreferences) => void
  storageError: string | null
  userUid: string
  familySession: FamilySession
  onApplyCloudProfile: (prefs: FamilyPreferences) => void
}

interface ConnectionView {
  label: 'Collegato al cloud' | 'Solo locale' | 'Errore di collegamento' | 'Verifica in corso…'
  badge: string
  tone: BannerTone
  banner: string
}

function connectionView(session: FamilySession): ConnectionView {
  if (session.cloudLinked && session.familyId) {
    return {
      label: 'Collegato al cloud',
      badge: 'Cloud',
      tone: 'ok',
      banner:
        'Profilo famiglia collegato a Firestore. Usa Gestione famiglia per associare l’UID di Nicholas come viewer.',
    }
  }

  if (session.status === 'loading') {
    return {
      label: 'Verifica in corso…',
      badge: 'Attesa',
      tone: 'demo',
      banner: 'Verifica del collegamento famiglia in corso…',
    }
  }

  if (session.status === 'error') {
    return {
      label: 'Errore di collegamento',
      badge: 'Errore',
      tone: 'error',
      banner:
        session.message ??
        'Collegamento a Firestore non riuscito. Le preferenze restano solo su questo dispositivo.',
    }
  }

  if (session.status === 'local_fallback') {
    return {
      label: 'Solo locale',
      badge: 'Locale',
      tone: 'warn',
      banner:
        session.message ??
        'Bootstrap cloud non riuscito. Preferenze e contenuti demo restano solo su questo dispositivo.',
    }
  }

  return {
    label: 'Solo locale',
    badge: 'Locale',
    tone: 'warn',
    banner:
      'Preferenze solo su questo dispositivo. Il cloud si attiva solo dopo un bootstrap famiglia verificato.',
  }
}

export function FamilyProfile({
  preferences,
  onChange,
  storageError,
  userUid,
  familySession,
  onApplyCloudProfile,
}: FamilyProfileProps) {
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  const appliedFamilyRef = useRef<string | null>(null)
  const connection = connectionView(familySession)

  useEffect(() => {
    if (
      !familySession.cloudLinked ||
      !familySession.cloudProfile ||
      !familySession.familyId
    ) {
      return
    }
    if (appliedFamilyRef.current === familySession.familyId) return
    appliedFamilyRef.current = familySession.familyId
    onApplyCloudProfile(familySession.cloudProfile)
  }, [
    familySession.cloudLinked,
    familySession.familyId,
    familySession.cloudProfile,
    onApplyCloudProfile,
  ])

  async function persist(next: FamilyPreferences) {
    onChange(next)
    setCloudMessage(null)

    if (!familySession.cloudLinked || !familySession.familyId) {
      return
    }

    setCloudBusy(true)
    const result = await saveVerifiedFamilyProfile(
      familySession.familyId,
      userUid,
      next,
    )
    setCloudBusy(false)

    if (!result.ok) {
      setCloudMessage(
        `Locale salvato. Cloud non aggiornato: ${result.error.message}`,
      )
      return
    }
    setCloudMessage('Preferenze salvate in locale e su Firestore (verificato).')
  }

  return (
    <div className="page">
      <DemoBanner
        badge={connection.badge}
        tone={connection.tone}
        message={connection.banner}
      />

      <header className="page-header">
        <div>
          <p className="eyebrow">Profilo famiglia</p>
          <h2>Impostazioni</h2>
          <p className="lede">
            Con collegamento cloud attivo, queste preferenze sono lette e
            scritte su Firestore (piano Spark). Messaggi, vocali e routine
            restano demo locali finché non saranno collegati.
          </p>
        </div>
        <Sorrino mood="sleep" size={76} />
      </header>

      {storageError && (
        <p className="alert alert-error" role="alert">
          {storageError}
        </p>
      )}
      {familySession.status === 'error' && familySession.message && (
        <p className="alert alert-error" role="alert">
          {familySession.message}
        </p>
      )}
      {familySession.status === 'local_fallback' && familySession.message && (
        <p className="alert alert-info" role="status">
          {familySession.message}
        </p>
      )}
      {familySession.cloudLinked && familySession.message && (
        <p className="alert alert-info" role="status">
          {familySession.message}
        </p>
      )}
      {cloudMessage && (
        <p className="alert alert-info" role="status">
          {cloudMessage}
          {cloudBusy ? ' (salvataggio…)' : ''}
        </p>
      )}

      <div className="grid-2">
        <Card accent="blue" title="Genitore">
          <label className="field">
            <span>Nome genitore</span>
            <input
              type="text"
              value={preferences.parentName}
              onChange={(e) =>
                onChange({ ...preferences, parentName: e.target.value })
              }
              onBlur={(e) =>
                void persist({
                  ...preferences,
                  parentName: e.target.value,
                })
              }
              maxLength={40}
              autoComplete="nickname"
            />
          </label>
          <label className="field">
            <span>Stile saluto</span>
            <select
              value={preferences.greetingStyle}
              onChange={(e) => {
                void persist({
                  ...preferences,
                  greetingStyle: e.target
                    .value as FamilyPreferences['greetingStyle'],
                })
              }}
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
              onChange={(e) =>
                onChange({ ...preferences, childName: e.target.value })
              }
              onBlur={(e) =>
                void persist({
                  ...preferences,
                  childName: e.target.value,
                })
              }
              maxLength={40}
              autoComplete="off"
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.showPoints}
              onChange={(e) => {
                void persist({
                  ...preferences,
                  showPoints: e.target.checked,
                })
              }}
            />
            <span>Mostra punti gamification</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={preferences.reminderSound}
              onChange={(e) => {
                void persist({
                  ...preferences,
                  reminderSound: e.target.checked,
                })
              }}
            />
            <span>Promemoria sonoro (preferenza locale)</span>
          </label>
        </Card>
      </div>

      <FamilyManagement userUid={userUid} familySession={familySession} />

      <Card accent="purple" title="Sicurezza e collegamento">
        <div className="connection-status" role="status">
          <span className="connection-status__label">{connection.label}</span>
          <p className="connection-status__detail">
            {familySession.cloudLinked && familySession.familyId
              ? `Famiglia cloud attiva (id …${familySession.familyId.slice(-6)}). Sync Android non dichiarata finché Kids non verifica la membership.`
              : familySession.message ??
                'Nessuna famiglia cloud verificata su questo account.'}
          </p>
        </div>
        <ul className="info-list">
          <li>Nessuna password, chiave API o Admin SDK nel frontend.</li>
          <li>
            Bootstrap famiglia atomico sul client (transazione Firestore), senza
            Cloud Functions.
          </li>
          <li>
            Pairing Kids: solo owner crea members/[uid] con ruolo viewer; il
            bambino non sceglie famiglia né privilegi.
          </li>
        </ul>
      </Card>
    </div>
  )
}
