import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { VoiceDraftMeta } from '../types'

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
}

export function VoiceMessages({ childName }: VoiceMessagesProps) {
  const { value: meta, setValue: setMeta } = useLocalStorage<VoiceDraftMeta>(
    VOICE_META_KEY,
    { hasRecording: false, durationSec: 0, updatedAt: '' },
  )

  const [state, setState] = useState<RecState>(detectInitialState)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const elapsedRef = useRef(0)
  const audioUrlRef = useRef<string | null>(null)

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

  function prepareDemoSend() {
    if (!audioUrl) {
      setFeedback('Registra prima un messaggio vocale.')
      return
    }
    setFeedback(
      'Modalità demo — messaggio non inviato. L’audio resta solo su questo dispositivo.',
    )
  }

  return (
    <div className="page">
      <DemoBanner />

      <header className="page-header">
        <div>
          <p className="eyebrow">Messaggi vocali</p>
          <h2>Registra per {childName}</h2>
          <p className="lede">
            Usa il microfono del browser, riascolta e prepara un invio
            dimostrativo. Su iPhone serve Safari con permesso microfono.
          </p>
        </div>
        <Sorrino mood="listen" size={76} />
      </header>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
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
            description="Questo browser non espone MediaRecorder o getUserMedia. Puoi comunque usare i messaggi testuali."
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
                  onClick={startRecording}
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
                onClick={prepareDemoSend}
                disabled={!audioUrl}
              >
                Prepara invio demo
              </button>
            </div>

            {audioUrl ? (
              <div className="audio-preview">
                <p className="field-hint">Riascolta (solo locale)</p>
                <audio controls src={audioUrl} playsInline>
                  Il tuo browser non supporta l’elemento audio.
                </audio>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
