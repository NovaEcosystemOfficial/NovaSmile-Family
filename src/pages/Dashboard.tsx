import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { Sorrino } from '../components/Sorrino'
import {
  demoActivities,
  demoMessages,
  demoRoutines,
  greetingFor,
} from '../data/demo'
import type { FamilyPreferences, SectionId } from '../types'

interface DashboardProps {
  preferences: FamilyPreferences
  onNavigate: (id: SectionId) => void
}

export function Dashboard({ preferences, onNavigate }: DashboardProps) {
  const completed = demoRoutines.filter((r) => r.completed).length
  const total = demoRoutines.length
  const points = demoRoutines
    .filter((r) => r.completed)
    .reduce((sum, r) => sum + r.points, 0)
  const recentMessages = demoMessages.slice(0, 2)

  return (
    <div className="page">
      <DemoBanner message="Dati dimostrativi locali. Nessuna sincronizzazione attiva con l’app Android." />

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
            Qui trovi il riepilogo delle routine di {preferences.childName}, i
            messaggi recenti e le attività demo del giorno.
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

      <div className="stats-row">
        <article className="stat-chip stat-chip--blue">
          <span>Routine oggi</span>
          <strong>
            {completed}/{total}
          </strong>
        </article>
        {preferences.showPoints ? (
          <article className="stat-chip stat-chip--orange">
            <span>Punti demo</span>
            <strong>{points}</strong>
          </article>
        ) : null}
        <article className="stat-chip stat-chip--teal">
          <span>Messaggi demo</span>
          <strong>{demoMessages.length}</strong>
        </article>
      </div>

      <div className="grid-2">
        <Card
          accent="purple"
          title="Messaggi recenti"
          subtitle="Cronologia dimostrativa"
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
          <ul className="feed-list">
            {recentMessages.map((msg) => (
              <li key={msg.id}>
                <p>{msg.text}</p>
                <span className="meta">
                  Demo · {msg.status}
                  {msg.scheduledFor ? ' · programmato' : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          accent="teal"
          title="Attività"
          subtitle="Eventi dimostrativi"
          action={
            <button
              type="button"
              className="btn btn-link"
              onClick={() => onNavigate('routines')}
            >
              Dettagli
            </button>
          }
        >
          <ul className="feed-list">
            {demoActivities.map((item) => (
              <li key={item.id} className={`tone-${item.tone}`}>
                <p>
                  <strong>{item.title}</strong>
                </p>
                <p>{item.detail}</p>
                <span className="meta">{item.timeLabel}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
