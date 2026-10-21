import { useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { demoMessages, formatItalianDateTime } from '../data/demo'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { DemoMessage, ScheduleDraft } from '../types'

const SCHEDULE_DRAFT_KEY = 'novasmile-family:schedule-draft'
const SCHEDULED_KEY = 'novasmile-family:scheduled-demo'

function todayDateInput(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

interface ScheduleProps {
  childName: string
}

export function Schedule({ childName }: ScheduleProps) {
  const {
    value: draft,
    setValue: setDraft,
    error: draftError,
  } = useLocalStorage<ScheduleDraft>(SCHEDULE_DRAFT_KEY, {
    text: '',
    date: '',
    time: '07:30',
    updatedAt: '',
  })

  const {
    value: scheduled,
    setValue: setScheduled,
    error: scheduledError,
  } = useLocalStorage<DemoMessage[]>(SCHEDULED_KEY, [])

  const [feedback, setFeedback] = useState<string | null>(null)
  const dateValue = draft.date || todayDateInput()

  const demoScheduled = demoMessages.filter((m) => m.status === 'programmato')
  const allScheduled = [...scheduled, ...demoScheduled]

  function updateDraft(partial: Partial<ScheduleDraft>) {
    setDraft({
      ...draft,
      date: draft.date || todayDateInput(),
      ...partial,
      updatedAt: new Date().toISOString(),
    })
    setFeedback(null)
  }

  function prepareSchedule() {
    const text = draft.text.trim()
    if (!text) {
      setFeedback('Inserisci il testo del messaggio programmato.')
      return
    }
    if (!dateValue || !draft.time) {
      setFeedback('Scegli data e ora valide.')
      return
    }

    const scheduledFor = `${dateValue}T${draft.time}:00`
    const when = new Date(scheduledFor)
    if (Number.isNaN(when.getTime())) {
      setFeedback('Data o ora non valide. Controlla i campi.')
      return
    }
    if (when.getTime() < Date.now()) {
      setFeedback('Scegli un orario futuro per la programmazione demo.')
      return
    }

    const entry: DemoMessage = {
      id: `sched-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      scheduledFor,
      status: 'programmato',
      isDemo: true,
    }

    setScheduled([entry, ...scheduled])
    setDraft({
      text: '',
      date: dateValue,
      time: draft.time,
      updatedAt: new Date().toISOString(),
    })
    setFeedback(
      'Modalità demo — messaggio non inviato. Programmato solo in locale su questo browser.',
    )
  }

  return (
    <div className="page">
      <DemoBanner />

      <header className="page-header">
        <div>
          <p className="eyebrow">Programmazione</p>
          <h2>Messaggio futuro per {childName}</h2>
          <p className="lede">
            Scegli data e ora per preparare un messaggio. Finché non c’è un
            backend, resta una programmazione dimostrativa locale.
          </p>
        </div>
        <Sorrino mood="happy" size={76} />
      </header>

      {(draftError || scheduledError) && (
        <p className="alert alert-error" role="alert">
          {draftError ?? scheduledError}
        </p>
      )}
      {feedback && (
        <p className="alert alert-info" role="status">
          {feedback}
        </p>
      )}

      <div className="grid-2">
        <Card accent="teal" title="Prepara messaggio">
          <label className="field">
            <span>Testo</span>
            <textarea
              rows={4}
              value={draft.text}
              onChange={(e) => updateDraft({ text: e.target.value })}
              placeholder="Domani mattina ricorda di…"
              maxLength={400}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => updateDraft({ date: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Ora</span>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => updateDraft({ time: e.target.value })}
              />
            </label>
          </div>
          <p className="field-hint">Bozza salvata in localStorage</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={prepareSchedule}
          >
            Programma in demo
          </button>
        </Card>

        <Card accent="purple" title="In programma" subtitle="Elenco dimostrativo">
          {allScheduled.length === 0 ? (
            <EmptyState
              title="Niente in programma"
              description="Quando programmi un messaggio demo, lo vedrai qui."
            />
          ) : (
            <ul className="feed-list">
              {allScheduled.map((msg) => (
                <li key={msg.id}>
                  <p>{msg.text}</p>
                  <span className="meta">
                    Previsto:{' '}
                    {msg.scheduledFor
                      ? formatItalianDateTime(msg.scheduledFor)
                      : '—'}{' '}
                    · demo
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
