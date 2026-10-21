import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { demoRoutines } from '../data/demo'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { RoutineMission, RoutinePeriod } from '../types'

const ROUTINE_KEY = 'novasmile-family:routines-demo'

const periods: { id: RoutinePeriod; label: string; emoji: string }[] = [
  { id: 'mattina', label: 'Mattina', emoji: '🌅' },
  { id: 'pomeriggio', label: 'Pomeriggio', emoji: '🌤️' },
  { id: 'sera', label: 'Sera', emoji: '🌙' },
]

interface RoutinesProps {
  childName: string
  showPoints: boolean
}

export function Routines({ childName, showPoints }: RoutinesProps) {
  const {
    value: missions,
    setValue: setMissions,
    error,
  } = useLocalStorage<RoutineMission[]>(ROUTINE_KEY, demoRoutines)

  const [filter, setFilter] = useState<RoutinePeriod | 'tutte'>('tutte')

  const filtered = useMemo(
    () =>
      filter === 'tutte'
        ? missions
        : missions.filter((m) => m.period === filter),
    [filter, missions],
  )

  const progress = missions.filter((m) => m.completed).length
  const points = missions
    .filter((m) => m.completed)
    .reduce((sum, m) => sum + m.points, 0)

  function toggleMission(id: string) {
    setMissions(
      missions.map((m) =>
        m.id === id ? { ...m, completed: !m.completed } : m,
      ),
    )
  }

  function resetDemo() {
    setMissions(demoRoutines.map((m) => ({ ...m })))
  }

  return (
    <div className="page">
      <DemoBanner message="Routine dimostrative salvate solo in locale. Non sincronizzate con NovaSmile Android." />

      <header className="page-header">
        <div>
          <p className="eyebrow">Routine di {childName}</p>
          <h2>Missioni del giorno</h2>
          <p className="lede">
            Gestisci mattina, pomeriggio e sera. I progressi restano sul
            browser finché non arriverà il backend.
          </p>
        </div>
        <Sorrino mood={progress === missions.length ? 'cheer' : 'happy'} size={76} />
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="stats-row">
        <article className="stat-chip stat-chip--blue">
          <span>Completate</span>
          <strong>
            {progress}/{missions.length}
          </strong>
        </article>
        {showPoints ? (
          <article className="stat-chip stat-chip--yellow">
            <span>Punti demo</span>
            <strong>{points}</strong>
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
        <button type="button" className="btn btn-link" onClick={resetDemo}>
          Ripristina demo
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nessuna missione"
          description="Non ci sono missioni per questo filtro."
          actionLabel="Mostra tutte"
          onAction={() => setFilter('tutte')}
        />
      ) : (
        <div className="mission-grid">
          {filtered.map((mission) => (
            <Card
              key={mission.id}
              accent={
                mission.period === 'mattina'
                  ? 'yellow'
                  : mission.period === 'pomeriggio'
                    ? 'orange'
                    : 'purple'
              }
              className={mission.completed ? 'mission is-done' : 'mission'}
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
                className={
                  mission.completed ? 'btn btn-secondary' : 'btn btn-primary'
                }
                onClick={() => toggleMission(mission.id)}
              >
                {mission.completed ? 'Segna da fare' : 'Segna completata'}
              </button>
              <span className="meta">Dati dimostrativi</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
