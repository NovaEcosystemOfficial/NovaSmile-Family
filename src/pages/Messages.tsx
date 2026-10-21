import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { demoMessages, formatItalianDateTime } from '../data/demo'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { DemoMessage, MessageDraft } from '../types'

const DRAFT_KEY = 'novasmile-family:message-draft'
const HISTORY_KEY = 'novasmile-family:message-history-demo'

interface MessagesProps {
  childName: string
}

export function Messages({ childName }: MessagesProps) {
  const {
    value: draft,
    setValue: setDraft,
    error: draftError,
  } = useLocalStorage<MessageDraft>(DRAFT_KEY, {
    text: '',
    updatedAt: '',
  })

  const {
    value: localHistory,
    setValue: setLocalHistory,
    error: historyError,
  } = useLocalStorage<DemoMessage[]>(HISTORY_KEY, [])

  const [feedback, setFeedback] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const history = useMemo(
    () => [...localHistory, ...demoMessages],
    [localHistory],
  )

  function updateText(text: string) {
    setDraft({ text, updatedAt: new Date().toISOString() })
    setFeedback(null)
  }

  function prepareDemoSend() {
    const text = draft.text.trim()
    if (!text) {
      setFeedback('Scrivi un messaggio prima di preparare l’invio demo.')
      return
    }

    const entry: DemoMessage = {
      id: `local-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      status: 'demo',
      isDemo: true,
    }

    setLocalHistory([entry, ...localHistory])
    setDraft({ text: '', updatedAt: new Date().toISOString() })
    setPreviewOpen(false)
    setFeedback(
      'Modalità demo — messaggio non inviato. Salvato solo nella cronologia locale.',
    )
  }

  return (
    <div className="page">
      <DemoBanner />

      <header className="page-header">
        <div>
          <p className="eyebrow">Messaggi per {childName}</p>
          <h2>Componi un messaggio</h2>
          <p className="lede">
            Scrivi, rivedi l’anteprima e prepara un invio dimostrativo. Nessun
            messaggio lascia questo dispositivo.
          </p>
        </div>
        <Sorrino mood="happy" size={76} />
      </header>

      {(draftError || historyError) && (
        <p className="alert alert-error" role="alert">
          {draftError ?? historyError}
        </p>
      )}
      {feedback && (
        <p className="alert alert-info" role="status">
          {feedback}
        </p>
      )}

      <div className="grid-2">
        <Card accent="blue" title="Nuovo messaggio">
          <label className="field">
            <span>Testo</span>
            <textarea
              rows={6}
              value={draft.text}
              onChange={(e) => updateText(e.target.value)}
              placeholder={`Ciao ${childName}, ricorda di…`}
              maxLength={500}
            />
            <span className="field-hint">
              {draft.text.length}/500 · bozza salvata in locale
            </span>
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPreviewOpen(true)}
              disabled={!draft.text.trim()}
            >
              Anteprima
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={prepareDemoSend}
            >
              Prepara invio demo
            </button>
          </div>
        </Card>

        <Card
          accent="yellow"
          title="Anteprima"
          subtitle="Come apparirebbe a Nicholas"
        >
          {previewOpen && draft.text.trim() ? (
            <div className="preview-bubble">
              <Sorrino mood="cheer" size={48} />
              <p>{draft.text.trim()}</p>
              <span className="meta">Anteprima locale · non inviato</span>
            </div>
          ) : (
            <EmptyState
              title="Nessuna anteprima"
              description="Scrivi un messaggio e tocca Anteprima per vederlo qui."
            />
          )}
        </Card>
      </div>

      <Card
        accent="purple"
        title="Cronologia"
        subtitle="Messaggi demo + bozze preparate in locale"
      >
        {history.length === 0 ? (
          <EmptyState
            title="Nessun messaggio"
            description="Quando prepari un invio demo, apparirà qui."
          />
        ) : (
          <ul className="feed-list">
            {history.map((msg) => (
              <li key={msg.id}>
                <p>{msg.text}</p>
                <span className="meta">
                  {formatItalianDateTime(msg.createdAt)} · {msg.status} · dati
                  dimostrativi
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
