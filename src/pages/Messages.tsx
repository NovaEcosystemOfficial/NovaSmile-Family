import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { formatItalianDateTime } from '../data/demo'
import {
  createVerifiedFamilyMessage,
  deleteVerifiedFamilyMessage,
  listVerifiedFamilyMessages,
  markMessageAvailableForChild,
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
      return 'Salvato nel cloud'
    case 'queued':
      return 'Disponibile per lettura Android'
    case 'scheduled':
      return 'Programmato (cloud)'
    case 'failed':
      return 'Salvataggio non riuscito'
    case 'delivered':
      return 'Consegnato (conferma dispositivo)'
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
  const [busyId, setBusyId] = useState<string | null>(null)
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

  async function sendMessage() {
    const text = draft.text.trim()
    if (!text) {
      setSaveError('Scrivi un messaggio prima di inviarlo.')
      return
    }
    if (!cloudReady || !familyId) {
      setSaveError(
        'Collegamento famiglia non verificato: impossibile inviare su Firestore.',
      )
      return
    }
    if (saving) return

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
      'Messaggio inviato e disponibile su Android. Nessuna conferma di lettura o consegna sul telefono.',
    )
  }

  async function markAvailable(message: FamilyMessage) {
    if (!familyId) return
    setBusyId(message.id)
    setSaveError(null)
    const result = await markMessageAvailableForChild(
      familyId,
      userUid,
      message,
    )
    setBusyId(null)
    if (!result.ok) {
      setSaveError(result.error.message)
      return
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? result.data : m)),
    )
    setFeedback(
      'Messaggio contrassegnato come disponibile per la lettura dall’app Android. Nessuna notifica o conferma di consegna.',
    )
  }

  async function removeMessage(message: FamilyMessage) {
    if (!familyId) return
    if (!window.confirm('Eliminare definitivamente questo messaggio cloud?')) {
      return
    }
    setBusyId(message.id)
    setSaveError(null)
    const result = await deleteVerifiedFamilyMessage(
      familyId,
      userUid,
      message.id,
    )
    setBusyId(null)
    if (!result.ok) {
      setSaveError(result.error.message)
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== message.id))
    setFeedback('Messaggio eliminato da Firestore.')
  }

  let bannerTone: BannerTone = 'ok'
  let bannerBadge = 'Cloud'
  let bannerMessage =
    'Invia messaggio: salvato su Firestore come disponibile per Kids (`queued`). Nessuna conferma di lettura/consegna.'

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
            Scrivi e invia: il messaggio viene salvato su Firestore e reso subito
            disponibile all’app Kids. Non implica che Nicholas l’abbia letto.
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
                void sendMessage()
              }}
              disabled={!canWrite || !draft.text.trim()}
            >
              {saving ? 'Invio…' : 'Invia messaggio'}
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
                Anteprima locale · non ancora inviata
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
            description="Quando invii un messaggio, apparirà qui come disponibile per Android."
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
                  · {cloudStatusLabel(msg.status)}
                  {msg.status !== 'delivered'
                    ? ' · nessuna conferma consegna'
                    : ''}
                </span>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  {msg.status === 'draft' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={busyId === msg.id}
                      onClick={() => {
                        void markAvailable(msg)
                      }}
                    >
                      Rendi disponibile per Android
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === msg.id}
                    onClick={() => {
                      void removeMessage(msg)
                    }}
                  >
                    Elimina
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
