import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { localDateId } from '../data/memberGate'
import {
  computeDayProgress,
  getVerifiedRoutineDay,
  listVerifiedRoutines,
  seedDefaultRoutinesIfEmpty,
  toggleVerifiedRoutineCompletion,
} from '../data/routinesCloud'
import type { FamilySession } from '../hooks/useFamilySession'
import type { RoutinePeriod } from '../types'
import type { FamilyRoutine, FamilyRoutineDay } from '../types/cloud'

const periods: { id: RoutinePeriod; label: string; emoji: string }[] = [
  { id: 'mattina', label: 'Mattina', emoji: '🌅' },
  { id: 'pomeriggio', label: 'Pomeriggio', emoji: '🌤️' },
  { id: 'sera', label: 'Sera', emoji: '🌙' },
]

interface RoutinesProps {
  childName: string
  showPoints: boolean
  userUid: string
  familySession: FamilySession
}

export function Routines({
  childName,
  showPoints,
  userUid,
  familySession,
}: RoutinesProps) {
  const [routines, setRoutines] = useState<FamilyRoutine[]>([])
  const [day, setDay] = useState<FamilyRoutineDay | null>(null)
  const [filter, setFilter] = useState<RoutinePeriod | 'tutte'>('tutte')
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)

  const sessionLoading = familySession.status === 'loading'
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)
  const blockedReason =
    !sessionLoading && !cloudReady
      ? (familySession.message ??
        'Famiglia cloud non verificata: routine non disponibili.')
      : null
  const dateId = localDateId()

  const filtered = useMemo(
    () =>
      filter === 'tutte'
        ? routines.filter((r) => r.active)
        : routines.filter((r) => r.active && r.period === filter),
    [filter, routines],
  )

  const progress = computeDayProgress(routines, day)

  useEffect(() => {
    if (!cloudReady || !familyId) return
    let cancelled = false

    async function load(activeFamilyId: string) {
      const [routinesResult, dayResult] = await Promise.all([
        listVerifiedRoutines(activeFamilyId, userUid),
        getVerifiedRoutineDay(activeFamilyId, userUid, dateId),
      ])
      if (cancelled) return
      if (!routinesResult.ok) {
        setRoutines([])
        setDay(null)
        setListStatus('error')
        setError(routinesResult.error.message)
        return
      }
      if (!dayResult.ok) {
        setRoutines(routinesResult.data)
        setDay(null)
        setListStatus('error')
        setError(dayResult.error.message)
        return
      }
      setRoutines(routinesResult.data)
      setDay(dayResult.data)
      setListStatus('ready')
      setError(null)
    }

    queueMicrotask(() => {
      if (cancelled) return
      setListStatus('loading')
      setError(null)
    })
    void load(familyId)
    return () => {
      cancelled = true
    }
  }, [cloudReady, familyId, userUid, dateId])

  async function seedDefaults() {
    if (!familyId) return
    setSeeding(true)
    setError(null)
    const result = await seedDefaultRoutinesIfEmpty(familyId, userUid)
    setSeeding(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setRoutines(result.data)
    setListStatus('ready')
    setFeedback(
      result.data.length > 0
        ? 'Template routine pronti su Firestore.'
        : 'Nessun template creato.',
    )
  }

  async function toggleMission(routineId: string) {
    if (!familyId) return
    const currentlyDone = Boolean(day?.completions[routineId]?.completed)
    setBusyId(routineId)
    setError(null)
    const result = await toggleVerifiedRoutineCompletion(
      familyId,
      userUid,
      routines,
      routineId,
      !currentlyDone,
      dateId,
    )
    setBusyId(null)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setDay(result.data)
  }

  let bannerTone: BannerTone = 'ok'
  let bannerBadge = 'Cloud'
  let bannerMessage = `Routine e punti del ${dateId} su Firestore. Completamenti genitore (editor).`

  if (sessionLoading) {
    bannerTone = 'demo'
    bannerBadge = 'Attesa'
    bannerMessage = 'Verifica sessione famiglia…'
  } else if (blockedReason) {
    bannerTone = 'error'
    bannerBadge = 'Bloccato'
    bannerMessage = blockedReason
  } else if (listStatus === 'error') {
    bannerTone = 'error'
    bannerBadge = 'Errore'
    bannerMessage = error ?? 'Errore caricamento routine.'
  }

  return (
    <div className="page">
      <DemoBanner
        badge={bannerBadge}
        tone={bannerTone}
        message={bannerMessage}
      />

      <header className="page-header">
        <div>
          <p className="eyebrow">Routine di {childName}</p>
          <h2>Missioni del giorno</h2>
          <p className="lede">
            Template e completamenti su Firestore per oggi ({dateId}). I punti
            sono ricalcolati lato client e salvati nel documento giornaliero.
          </p>
        </div>
        <Sorrino
          mood={
            progress.total > 0 && progress.completed === progress.total
              ? 'cheer'
              : 'happy'
          }
          size={76}
        />
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {blockedReason && (
        <p className="alert alert-error" role="alert">
          {blockedReason}
        </p>
      )}
      {feedback && (
        <p className="alert alert-info" role="status">
          {feedback}
        </p>
      )}

      <div className="stats-row">
        <article className="stat-chip stat-chip--blue">
          <span>Completate oggi</span>
          <strong>
            {progress.completed}/{progress.total}
          </strong>
        </article>
        {showPoints ? (
          <article className="stat-chip stat-chip--yellow">
            <span>Punti cloud</span>
            <strong>{progress.points}</strong>
          </article>
        ) : null}
      </div>

      <div className="filter-row" role="tablist" aria-label="Filtra periodo">
        <button
          type="button"
          className={filter === 'tutte' ? 'chip is-active' : 'chip'}
          onClick={() => setFilter('tutte')}
        >
          Tutte
        </button>
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            className={filter === p.id ? 'chip is-active' : 'chip'}
            onClick={() => setFilter(p.id)}
          >
            <span aria-hidden="true">{p.emoji}</span> {p.label}
          </button>
        ))}
        {cloudReady && routines.length === 0 && listStatus === 'ready' ? (
          <button
            type="button"
            className="btn btn-link"
            disabled={seeding}
            onClick={() => {
              void seedDefaults()
            }}
          >
            {seeding ? 'Creazione…' : 'Crea template iniziali'}
          </button>
        ) : null}
      </div>

      {sessionLoading || (cloudReady && listStatus === 'loading') ? (
        <p className="meta" role="status">
          Caricamento routine…
        </p>
      ) : blockedReason ? (
        <EmptyState
          title="Cloud non disponibile"
          description="Collega la famiglia nella sezione Famiglia."
        />
      ) : listStatus === 'error' ? (
        <EmptyState
          title="Errore"
          description={error ?? 'Impossibile caricare le routine.'}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nessuna missione"
          description={
            routines.length === 0
              ? 'Crea i template iniziali per partire.'
              : 'Non ci sono missioni per questo filtro.'
          }
          actionLabel={routines.length === 0 ? undefined : 'Mostra tutte'}
          onAction={
            routines.length === 0 ? undefined : () => setFilter('tutte')
          }
        />
      ) : (
        <div className="mission-grid">
          {filtered.map((mission) => {
            const done = Boolean(day?.completions[mission.id]?.completed)
            return (
              <Card
                key={mission.id}
                accent={
                  mission.period === 'mattina'
                    ? 'yellow'
                    : mission.period === 'pomeriggio'
                      ? 'orange'
                      : 'purple'
                }
                className={done ? 'mission is-done' : 'mission'}
              >
                <div className="mission__top">
                  <span className="mission__period">{mission.period}</span>
                  {showPoints ? (
                    <span className="mission__points">+{mission.points}</span>
                  ) : null}
                </div>
                <h3>{mission.title}</h3>
                <p>{mission.description}</p>
                <button
                  type="button"
                  className={done ? 'btn btn-secondary' : 'btn btn-primary'}
                  disabled={busyId === mission.id}
                  onClick={() => {
                    void toggleMission(mission.id)
                  }}
                >
                  {busyId === mission.id
                    ? 'Salvataggio…'
                    : done
                      ? 'Segna da fare'
                      : 'Segna completata'}
                </button>
                <span className="meta">Firestore · {dateId}</span>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
