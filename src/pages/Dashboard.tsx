import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { listVerifiedActivities } from '../data/activitiesCloud'
import { listVerifiedAppointments } from '../data/appointmentsCloud'
import { formatItalianDateTime, greetingFor } from '../data/demo'
import { listVerifiedFamilyMessages } from '../data/messagesCloud'
import { localDateId } from '../data/memberGate'
import {
  computeDayProgress,
  getVerifiedRoutineDay,
  listVerifiedRoutines,
} from '../data/routinesCloud'
import type { FamilySession } from '../hooks/useFamilySession'
import type { FamilyPreferences, SectionId } from '../types'
import type {
  FamilyActivity,
  FamilyAppointment,
  FamilyMessage,
} from '../types/cloud'

interface DashboardProps {
  preferences: FamilyPreferences
  onNavigate: (id: SectionId) => void
  userUid: string
  familySession: FamilySession
}

export function Dashboard({
  preferences,
  onNavigate,
  userUid,
  familySession,
}: DashboardProps) {
  const [messages, setMessages] = useState<FamilyMessage[]>([])
  const [appointments, setAppointments] = useState<FamilyAppointment[]>([])
  const [activities, setActivities] = useState<FamilyActivity[]>([])
  const [routineCompleted, setRoutineCompleted] = useState(0)
  const [routineTotal, setRoutineTotal] = useState(0)
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sessionLoading = familySession.status === 'loading'
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)

  useEffect(() => {
    if (!cloudReady || !familyId) {
      return
    }
    let cancelled = false
    const dateId = localDateId()

    async function load(activeFamilyId: string) {
      const [msg, appt, act, routines, day] = await Promise.all([
        listVerifiedFamilyMessages(activeFamilyId, userUid, { max: 5 }),
        listVerifiedAppointments(activeFamilyId, userUid, { max: 20 }),
        listVerifiedActivities(activeFamilyId, userUid, { max: 8 }),
        listVerifiedRoutines(activeFamilyId, userUid),
        getVerifiedRoutineDay(activeFamilyId, userUid, dateId),
      ])
      if (cancelled) return

      const errors = [msg, appt, act, routines, day]
        .filter((r) => !r.ok)
        .map((r) => (!r.ok ? r.error.message : ''))

      if (msg.ok) setMessages(msg.data)
      if (appt.ok) {
        const now = Date.now()
        setAppointments(
          appt.data
            .filter(
              (a) =>
                a.status === 'scheduled' &&
                new Date(a.scheduledFor).getTime() >= now,
            )
            .slice(0, 3),
        )
      }
      if (act.ok) setActivities(act.data)
      if (routines.ok && day.ok) {
        const progress = computeDayProgress(routines.data, day.data)
        setRoutineCompleted(progress.completed)
        setRoutineTotal(progress.total)
        setPoints(progress.points)
      }
      setError(errors[0] ?? null)
      setLoading(false)
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true)
        setError(null)
      }
    })
    void load(familyId)
    return () => {
      cancelled = true
    }
  }, [cloudReady, familyId, userUid])

  let bannerTone: BannerTone = 'ok'
  let bannerBadge = 'Cloud'
  let bannerMessage =
    'Home con dati Firestore (messaggi, promemoria, routine, attività). Vocali ancora locali.'

  if (sessionLoading || (cloudReady && loading)) {
    bannerTone = 'demo'
    bannerBadge = 'Attesa'
    bannerMessage = 'Caricamento riepilogo famiglia…'
  } else if (!cloudReady) {
    bannerTone = 'warn'
    bannerBadge = 'Locale'
    bannerMessage =
      familySession.message ??
      'Famiglia non collegata: la home non mostra dati cloud inventati.'
  } else if (error) {
    bannerTone = 'warn'
    bannerBadge = 'Parziale'
    bannerMessage = `Alcuni dati non caricati: ${error}`
  }

  return (
    <div className="page">
      <DemoBanner
        badge={bannerBadge}
        tone={bannerTone}
        message={bannerMessage}
      />

      <section className="hero-panel">
        <div className="hero-panel__text">
          <p className="eyebrow">Oggi con Sorrino</p>
          <h2>
            {greetingFor(
              preferences.greetingStyle,
              preferences.parentName,
              preferences.childName,
            )}
          </h2>
          <p className="lede">
            Riepilogo reale di {preferences.childName} quando la famiglia è
            collegata a Firestore. I vocali restano solo su questo dispositivo.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('messages')}
            >
              Scrivi a {preferences.childName}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onNavigate('routines')}
            >
              Vedi routine
            </button>
          </div>
        </div>
        <Sorrino mood="cheer" size={128} className="hero-panel__mascot" />
      </section>

      {!cloudReady ? (
        <EmptyState
          title="Nessun dato cloud"
          description="Collega la famiglia nella sezione Famiglia per vedere messaggi, routine e promemoria reali."
          actionLabel="Vai al profilo"
          onAction={() => onNavigate('profile')}
        />
      ) : (
        <>
          <div className="stats-row">
            <article className="stat-chip stat-chip--blue">
              <span>Routine oggi</span>
              <strong>
                {loading ? '…' : `${routineCompleted}/${routineTotal}`}
              </strong>
            </article>
            {preferences.showPoints ? (
              <article className="stat-chip stat-chip--orange">
                <span>Punti cloud</span>
                <strong>{loading ? '…' : points}</strong>
              </article>
            ) : null}
            <article className="stat-chip stat-chip--teal">
              <span>Messaggi cloud</span>
              <strong>{loading ? '…' : messages.length}</strong>
            </article>
          </div>

          <div className="grid-2">
            <Card
              accent="purple"
              title="Messaggi recenti"
              subtitle="Firestore"
              action={
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => onNavigate('messages')}
                >
                  Apri
                </button>
              }
            >
              {loading ? (
                <p className="meta">Caricamento…</p>
              ) : messages.length === 0 ? (
                <EmptyState
                  title="Nessun messaggio"
                  description="Salva un messaggio nella sezione Messaggi."
                />
              ) : (
                <ul className="feed-list">
                  {messages.slice(0, 3).map((msg) => (
                    <li key={msg.id}>
                      <p>{msg.text}</p>
                      <span className="meta">
                        {msg.createdAt
                          ? formatItalianDateTime(msg.createdAt)
                          : '—'}{' '}
                        · {msg.status} · non consegnato auto
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              accent="teal"
              title="Prossimi promemoria"
              subtitle="Firestore · senza invio automatico"
              action={
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => onNavigate('schedule')}
                >
                  Apri
                </button>
              }
            >
              {loading ? (
                <p className="meta">Caricamento…</p>
              ) : appointments.length === 0 ? (
                <EmptyState
                  title="Nessun promemoria futuro"
                  description="Programma un orario nella sezione Programma."
                />
              ) : (
                <ul className="feed-list">
                  {appointments.map((a) => (
                    <li key={a.id}>
                      <p>{a.text}</p>
                      <span className="meta">
                        {formatItalianDateTime(a.scheduledFor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card accent="blue" title="Attività recenti" subtitle="Firestore">
            {loading ? (
              <p className="meta">Caricamento…</p>
            ) : activities.length === 0 ? (
              <EmptyState
                title="Nessuna attività"
                description="Le attività compaiono quando salvi messaggi, promemoria o completamenti."
              />
            ) : (
              <ul className="feed-list">
                {activities.map((item) => (
                  <li key={item.id} className={`tone-${item.tone}`}>
                    <p>
                      <strong>{item.title}</strong>
                    </p>
                    <p>{item.detail}</p>
                    <span className="meta">
                      {item.createdAt
                        ? formatItalianDateTime(item.createdAt)
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
