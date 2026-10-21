import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { formatItalianDateTime } from '../data/demo'
import {
  createVerifiedFamilyMessage,
  listVerifiedFamilyMessages,
} from '../data/messagesCloud'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { FamilySession } from '../hooks/useFamilySession'
import type { MessageDraft } from '../types'
import type { CloudMessageStatus, FamilyMessage } from '../types/cloud'

const DRAFT_KEY = 'novasmile-family:message-draft'

interface MessagesProps {
  childName: string
  userUid: string
  familySession: FamilySession
}

function cloudStatusLabel(status: CloudMessageStatus): string {
  switch (status) {
    case 'draft':
    case 'queued':
      return 'Salvato nel cloud'
    case 'scheduled':
      return 'Programmato (cloud)'
    case 'failed':
      return 'Salvataggio non riuscito'
    case 'delivered':
      return 'Stato cloud: delivered'
  }
}

export function Messages({
  childName,
  userUid,
  familySession,
}: MessagesProps) {
  const {
    value: draft,
    setValue: setDraft,
    error: draftError,
  } = useLocalStorage<MessageDraft>(DRAFT_KEY, {
    text: '',
    updatedAt: '',
  })

  const [messages, setMessages] = useState<FamilyMessage[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [listError, setListError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const sessionLoading = familySession.status === 'loading'
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)
  const blockedReason =
    !sessionLoading && !cloudReady
      ? (familySession.message ??
        'Famiglia cloud non verificata: i messaggi non possono essere caricati.')
      : null
  const canWrite = cloudReady && !saving

  useEffect(() => {
    if (!cloudReady || !familyId) {
      return
    }

    let cancelled = false

    async function load(activeFamilyId: string) {
      const result = await listVerifiedFamilyMessages(activeFamilyId, userUid)
      if (cancelled) return
      if (!result.ok) {
        setMessages([])
        setListStatus('error')
        setListError(result.error.message)
        return
      }
      setMessages(result.data)
      setListStatus('ready')
      setListError(null)
    }

    queueMicrotask(() => {
      if (cancelled) return
      setListStatus('loading')
      setListError(null)
    })

    void load(familyId)

    return () => {
      cancelled = true
    }
  }, [cloudReady, familyId, userUid])

  function updateText(text: string) {
    setDraft({ text, updatedAt: new Date().toISOString() })
    setFeedback(null)
    setSaveError(null)
  }

  async function saveToCloud() {
    const text = draft.text.trim()
    if (!text) {
      setSaveError('Scrivi un messaggio prima di salvarlo nel cloud.')
      return
    }
    if (!cloudReady || !familyId) {
      setSaveError(
        'Collegamento famiglia non verificato: impossibile salvare su Firestore.',
      )
      return
    }

    setSaving(true)
    setSaveError(null)
    setFeedback(null)

    const result = await createVerifiedFamilyMessage(familyId, userUid, text)

    if (!result.ok) {
      setSaving(false)
      setSaveError(result.error.message)
      return
    }

    const refreshed = await listVerifiedFamilyMessages(familyId, userUid)
    setSaving(false)

    if (refreshed.ok) {
      setMessages(refreshed.data)
      setListStatus('ready')
      setListError(null)
    } else {
      setMessages((prev) => [result.data, ...prev])
      setListStatus('ready')
    }

    setDraft({ text: '', updatedAt: new Date().toISOString() })
    setPreviewOpen(false)
    setFeedback(
      'Messaggio salvato su Firestore. Non consegnato a Nicholas: l’app Android non è ancora collegata.',
    )
  }

  let bannerTone: BannerTone = 'ok'
  let bannerBadge = 'Cloud'
  let bannerMessage =
    'Messaggi su Firestore per la famiglia verificata. Nessuna consegna Android in questa fase.'

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
    bannerMessage = listError ?? 'Errore nel caricamento dei messaggi cloud.'
  }

  const showListLoading =
    sessionLoading || (cloudReady && listStatus === 'loading')

  return (
    <div className="page">
      <DemoBanner
        badge={bannerBadge}
        tone={bannerTone}
        message={bannerMessage}
      />

      <header className="page-header">
        <div>
          <p className="eyebrow">Messaggi per {childName}</p>
          <h2>Componi un messaggio</h2>
          <p className="lede">
            Scrivi e salva il testo su Firestore. In questa fase non viene
            consegnato all’app Android di Nicholas.
          </p>
        </div>
        <Sorrino mood="happy" size={76} />
      </header>

      {draftError && (
        <p className="alert alert-error" role="alert">
          {draftError}
        </p>
      )}
      {saveError && (
        <p className="alert alert-error" role="alert">
          {saveError}
        </p>
      )}
      {listError && listStatus === 'error' && cloudReady && (
        <p className="alert alert-error" role="alert">
          {listError}
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
              disabled={!cloudReady || saving}
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
              disabled={!draft.text.trim() || saving}
            >
              Anteprima
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                void saveToCloud()
              }}
              disabled={!canWrite || !draft.text.trim()}
            >
              {saving ? 'Salvataggio…' : 'Salva nel cloud'}
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
              <span className="meta">
                Anteprima locale · non ancora salvata / non consegnata
              </span>
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
        title="Cronologia cloud"
        subtitle="Solo messaggi Firestore della famiglia verificata"
      >
        {showListLoading ? (
          <p className="meta" role="status">
            Caricamento messaggi…
          </p>
        ) : blockedReason ? (
          <EmptyState
            title="Cloud non disponibile"
            description="Collega la famiglia nella sezione Famiglia, poi torna qui."
          />
        ) : listStatus === 'error' ? (
          <EmptyState
            title="Errore di caricamento"
            description={
              listError ?? 'Impossibile leggere i messaggi da Firestore.'
            }
          />
        ) : messages.length === 0 ? (
          <EmptyState
            title="Nessun messaggio cloud"
            description="Quando salvi un messaggio su Firestore, apparirà qui."
          />
        ) : (
          <ul className="feed-list">
            {messages.map((msg) => (
              <li key={msg.id}>
                <p>{msg.text}</p>
                <span className="meta">
                  {msg.createdAt
                    ? formatItalianDateTime(msg.createdAt)
                    : 'Data in aggiornamento'}{' '}
                  · {cloudStatusLabel(msg.status)} · Android non collegata
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
