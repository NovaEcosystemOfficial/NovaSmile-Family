import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { formatItalianDateTime } from '../data/demo'
import {
  deleteVerifiedVoiceMessage,
  listVerifiedVoiceMessages,
  uploadVerifiedVoiceMessage,
} from '../data/voiceCloud'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { FamilySession } from '../hooks/useFamilySession'
import type { VoiceDraftMeta } from '../types'
import type { FamilyVoiceMessage } from '../types/cloud'

const VOICE_META_KEY = 'novasmile-family:voice-draft-meta'

type RecState = 'idle' | 'recording' | 'ready' | 'unsupported' | 'error'

function detectInitialState(): RecState {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return 'unsupported'
  }
  return 'idle'
}

interface VoiceMessagesProps {
  childName: string
  userUid: string
  familySession: FamilySession
}

export function VoiceMessages({
  childName,
  userUid,
  familySession,
}: VoiceMessagesProps) {
  const { value: meta, setValue: setMeta } = useLocalStorage<VoiceDraftMeta>(
    VOICE_META_KEY,
    { hasRecording: false, durationSec: 0, updatedAt: '' },
  )

  const [state, setState] = useState<RecState>(detectInitialState)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [cloudList, setCloudList] = useState<FamilyVoiceMessage[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const elapsedRef = useRef(0)
  const audioUrlRef = useRef<string | null>(null)

  const sessionLoading = familySession.status === 'loading'
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current)
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!cloudReady || !familyId) return
    let cancelled = false

    async function load(activeFamilyId: string) {
      setListLoading(true)
      const result = await listVerifiedVoiceMessages(activeFamilyId, userUid)
      if (cancelled) return
      setListLoading(false)
      if (!result.ok) {
        setCloudList([])
        setListError(
          `${result.error.message} Se le regole voice/Storage non sono pubblicate, l’elenco resterà vuoto.`,
        )
        return
      }
      setCloudList(result.data)
      setListError(null)
    }

    void load(familyId)
    return () => {
      cancelled = true
    }
  }, [cloudReady, familyId, userUid])

  function stopTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function replaceAudioUrl(next: string | null) {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
    }
    audioUrlRef.current = next
    setAudioUrl(next)
  }

  async function startRecording() {
    setError(null)
    setFeedback(null)

    if (typeof MediaRecorder === 'undefined') {
      setState('unsupported')
      setError(
        'La registrazione audio non è supportata su questo browser. Prova Safari aggiornato o Chrome.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const url = URL.createObjectURL(blob)
        replaceAudioUrl(url)
        setAudioBlob(blob)
        const durationSec = elapsedRef.current
        setState('ready')
        setMeta({
          hasRecording: true,
          durationSec,
          updatedAt: new Date().toISOString(),
        })
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      elapsedRef.current = 0
      setElapsed(0)
      setState('recording')
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
      }, 1000)
    } catch {
      setState('error')
      setError(
        'Impossibile accedere al microfono. Controlla i permessi di Safari/Chrome e riprova.',
      )
    }
  }

  function stopRecording() {
    stopTimer()
    mediaRecorderRef.current?.stop()
  }

  function clearRecording() {
    stopTimer()
    replaceAudioUrl(null)
    setAudioBlob(null)
    elapsedRef.current = 0
    setElapsed(0)
    setState('idle')
    setMeta({
      hasRecording: false,
      durationSec: 0,
      updatedAt: new Date().toISOString(),
    })
    setFeedback(null)
  }

  async function uploadToCloud() {
    if (!audioBlob || !familyId) {
      setFeedback('Registra prima un messaggio vocale.')
      return
    }
    if (!cloudReady) {
      setError('Famiglia cloud non verificata: upload non possibile.')
      return
    }

    setUploading(true)
    setError(null)
    setFeedback(null)
    const result = await uploadVerifiedVoiceMessage(familyId, userUid, {
      blob: audioBlob,
      durationSec: meta.durationSec || elapsed,
      contentType: audioBlob.type || 'audio/webm',
    })
    setUploading(false)

    if (!result.ok) {
      setError(
        `${result.error.message} Nota: finché storage.rules e voiceMessages non sono pubblicati sul progetto, l’upload fallirà.`,
      )
      return
    }

    setCloudList((prev) => [result.data, ...prev])
    clearRecording()
    setFeedback(
      'Vocale caricato su Firebase Storage e metadati su Firestore. Non consegnato/notificato a Nicholas automaticamente.',
    )
  }

  async function removeVoice(voice: FamilyVoiceMessage) {
    if (!familyId) return
    if (!window.confirm('Eliminare questo vocale cloud?')) return
    const result = await deleteVerifiedVoiceMessage(familyId, userUid, voice)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setCloudList((prev) => prev.filter((v) => v.id !== voice.id))
    setFeedback('Vocale eliminato.')
  }

  let bannerTone: BannerTone = 'warn'
  let bannerBadge = 'Storage'
  let bannerMessage =
    'Registrazione locale attiva. Upload cloud richiede regole Storage + voiceMessages pubblicate (Spark, senza Blaze).'

  if (sessionLoading) {
    bannerTone = 'demo'
    bannerBadge = 'Attesa'
    bannerMessage = 'Verifica sessione famiglia…'
  } else if (!cloudReady) {
    bannerTone = 'error'
    bannerBadge = 'Locale'
    bannerMessage =
      'Senza famiglia verificata puoi solo registrare in locale. Nessun upload cloud.'
  } else if (!listError && cloudList.length >= 0) {
    bannerTone = 'ok'
    bannerBadge = 'Cloud'
    bannerMessage =
      'Puoi tentare l’upload su Storage. Se fallisce, pubblica prima storage.rules e le regole voiceMessages.'
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
          <p className="eyebrow">Messaggi vocali</p>
          <h2>Registra per {childName}</h2>
          <p className="lede">
            Registra e riascolta in locale. L’upload cloud salva il file in
            Storage (non in Firestore) e i metadati nella famiglia.
          </p>
        </div>
        <Sorrino mood="listen" size={76} />
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {listError && (
        <p className="alert alert-info" role="status">
          {listError}
        </p>
      )}
      {feedback && (
        <p className="alert alert-info" role="status">
          {feedback}
        </p>
      )}

      <Card accent="orange" title="Registratore">
        {state === 'unsupported' ? (
          <EmptyState
            title="Registrazione non disponibile"
            description="Questo browser non espone MediaRecorder o getUserMedia. Usa i messaggi testuali."
          />
        ) : (
          <>
            <div className="voice-meter" data-active={state === 'recording'}>
              <span className="voice-dot" />
              <p>
                {state === 'recording'
                  ? `Registrazione in corso… ${elapsed}s`
                  : state === 'ready'
                    ? `Pronto · ${meta.durationSec || elapsed}s`
                    : 'In attesa di registrare'}
              </p>
            </div>

            <div className="btn-row">
              {state !== 'recording' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void startRecording()
                  }}
                >
                  Avvia registrazione
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={stopRecording}
                >
                  Ferma
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearRecording}
                disabled={!audioUrl && state !== 'ready'}
              >
                Cancella
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void uploadToCloud()
                }}
                disabled={!audioBlob || !cloudReady || uploading}
              >
                {uploading ? 'Upload…' : 'Carica su Storage'}
              </button>
            </div>

            {audioUrl ? (
              <div className="audio-preview">
                <p className="field-hint">Riascolta (locale, non consegnato)</p>
                <audio controls src={audioUrl} playsInline>
                  Il tuo browser non supporta l’elemento audio.
                </audio>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card
        accent="purple"
        title="Vocali cloud"
        subtitle="Metadati Firestore · file in Storage"
      >
        {listLoading ? (
          <p className="meta">Caricamento…</p>
        ) : !cloudReady ? (
          <EmptyState
            title="Cloud non collegato"
            description="Collega la famiglia per elencare i vocali salvati."
          />
        ) : cloudList.length === 0 ? (
          <EmptyState
            title="Nessun vocale cloud"
            description="Dopo un upload riuscito (regole pubblicate) comparirà qui."
          />
        ) : (
          <ul className="feed-list">
            {cloudList.map((v) => (
              <li key={v.id}>
                <p>
                  Vocale · {v.durationSec}s ·{' '}
                  {Math.round(v.byteSize / 1024)} KB
                </p>
                <span className="meta">
                  {v.createdAt ? formatItalianDateTime(v.createdAt) : '—'} ·{' '}
                  {v.status} · non notificato
                </span>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void removeVoice(v)
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
