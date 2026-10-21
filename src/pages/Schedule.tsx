import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { DemoBanner, type BannerTone } from '../components/DemoBanner'
import { EmptyState } from '../components/EmptyState'
import { Sorrino } from '../components/Sorrino'
import {
  cancelVerifiedAppointment,
  createVerifiedAppointment,
  deleteVerifiedAppointment,
  listVerifiedAppointments,
} from '../data/appointmentsCloud'
import { formatItalianDateTime } from '../data/demo'
import { localDateTimeToIso, todayDateInput } from '../data/dateTime'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { FamilySession } from '../hooks/useFamilySession'
import type { ScheduleDraft } from '../types'
import type { FamilyAppointment } from '../types/cloud'

const SCHEDULE_DRAFT_KEY = 'novasmile-family:schedule-draft'

interface ScheduleProps {
  childName: string
  userUid: string
  familySession: FamilySession
}

export function Schedule({
  childName,
  userUid,
  familySession,
}: ScheduleProps) {
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

  const [items, setItems] = useState<FamilyAppointment[]>([])
  const [listStatus, setListStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [listError, setListError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const sessionLoading = familySession.status === 'loading'
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)
  const blockedReason =
    !sessionLoading && !cloudReady
      ? (familySession.message ??
        'Famiglia cloud non verificata: programmazioni non disponibili.')
      : null
  const dateValue = draft.date || todayDateInput()

  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const { upcoming, past } = useMemo(() => {
    const active = items.filter((a) => a.status !== 'cancelled')
    const upcomingList = active
      .filter((a) => new Date(a.scheduledFor).getTime() >= nowMs)
      .sort(
        (a, b) =>
          new Date(a.scheduledFor).getTime() -
          new Date(b.scheduledFor).getTime(),
      )
    const pastList = active
      .filter((a) => new Date(a.scheduledFor).getTime() < nowMs)
      .sort(
        (a, b) =>
          new Date(b.scheduledFor).getTime() -
          new Date(a.scheduledFor).getTime(),
      )
    return { upcoming: upcomingList, past: pastList }
  }, [items, nowMs])

  useEffect(() => {
    if (!cloudReady || !familyId) return
    let cancelled = false

    async function load(activeFamilyId: string) {
      const result = await listVerifiedAppointments(activeFamilyId, userUid)
      if (cancelled) return
      if (!result.ok) {
        setItems([])
        setListStatus('error')
        setListError(result.error.message)
        return
      }
      setItems(result.data)
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

  function updateDraft(partial: Partial<ScheduleDraft>) {
    setDraft({
      ...draft,
      date: draft.date || todayDateInput(),
      ...partial,
      updatedAt: new Date().toISOString(),
    })
    setFeedback(null)
    setSaveError(null)
  }

  async function saveAppointment() {
    const text = draft.text.trim()
    if (!text) {
      setSaveError('Inserisci il testo del promemoria.')
      return
    }
    if (!cloudReady || !familyId) {
      setSaveError('Collegamento famiglia non verificato.')
      return
    }
    const iso = localDateTimeToIso(dateValue, draft.time)
    if (!iso) {
      setSaveError('Data o ora non valide.')
      return
    }
    if (new Date(iso).getTime() < Date.now()) {
      setSaveError('Scegli un orario futuro.')
      return
    }

    setSaving(true)
    setSaveError(null)
    const result = await createVerifiedAppointment(familyId, userUid, {
      text,
      scheduledFor: iso,
    })
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error.message)
      return
    }

    const refreshed = await listVerifiedAppointments(familyId, userUid)
    if (refreshed.ok) {
      setItems(refreshed.data)
      setListStatus('ready')
    } else {
      setItems((prev) => [...prev, result.data])
    }
    setDraft({
      text: '',
      date: dateValue,
      time: draft.time,
      updatedAt: new Date().toISOString(),
    })
    setFeedback(
      'Promemoria salvato su Firestore. Non verrà inviato automaticamente: su Spark non c’è uno scheduler server-side.',
    )
  }

  async function cancelItem(item: FamilyAppointment) {
    if (!familyId) return
    if (!window.confirm('Annullare questo promemoria cloud?')) return
    setBusyId(item.id)
    const result = await cancelVerifiedAppointment(familyId, userUid, item)
    setBusyId(null)
    if (!result.ok) {
      setSaveError(result.error.message)
      return
    }
    setItems((prev) =>
      prev.map((a) => (a.id === item.id ? result.data : a)),
    )
    setFeedback('Promemoria annullato su Firestore.')
  }

  async function deleteItem(item: FamilyAppointment) {
    if (!familyId) return
    if (!window.confirm('Eliminare definitivamente questo promemoria?')) return
    setBusyId(item.id)
    const result = await deleteVerifiedAppointment(familyId, userUid, item.id)
    setBusyId(null)
    if (!result.ok) {
      setSaveError(result.error.message)
      return
    }
    setItems((prev) => prev.filter((a) => a.id !== item.id))
    setFeedback('Promemoria eliminato.')
  }

  let bannerTone: BannerTone = 'ok'
  let bannerBadge = 'Cloud'
  let bannerMessage =
    'Promemoria su Firestore. Nessun invio automatico all’orario indicato (Spark, senza Cloud Functions).'

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
    bannerMessage = listError ?? 'Errore nel caricamento.'
  }

  function renderList(list: FamilyAppointment[], emptyTitle: string) {
    if (list.length === 0) {
      return (
        <EmptyState
          title={emptyTitle}
          description="Nessun elemento in questa sezione."
        />
      )
    }
    return (
      <ul className="feed-list">
        {list.map((item) => (
          <li key={item.id}>
            <p>{item.text}</p>
            <span className="meta">
              {formatItalianDateTime(item.scheduledFor)} · {item.status} ·
              cloud (non inviato auto)
            </span>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busyId === item.id || item.status === 'cancelled'}
                onClick={() => {
                  void cancelItem(item)
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busyId === item.id}
                onClick={() => {
                  void deleteItem(item)
                }}
              >
                Elimina
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
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
          <p className="eyebrow">Programmazione</p>
          <h2>Promemoria per {childName}</h2>
          <p className="lede">
            Salva data e ora su Firestore. L’app Android potrà leggerli; non
            c’è invio push automatico sul piano Spark.
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
        <Card accent="teal" title="Nuovo promemoria">
          <label className="field">
            <span>Testo</span>
            <textarea
              rows={4}
              value={draft.text}
              onChange={(e) => updateDraft({ text: e.target.value })}
              placeholder="Domani mattina ricorda di…"
              maxLength={400}
              disabled={!cloudReady || saving}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Data</span>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => updateDraft({ date: e.target.value })}
                disabled={!cloudReady || saving}
              />
            </label>
            <label className="field">
              <span>Ora</span>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => updateDraft({ time: e.target.value })}
                disabled={!cloudReady || saving}
              />
            </label>
          </div>
          <p className="field-hint">Bozza salvata in localStorage</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!cloudReady || saving || !draft.text.trim()}
            onClick={() => {
              void saveAppointment()
            }}
          >
            {saving ? 'Salvataggio…' : 'Salva su Firestore'}
          </button>
        </Card>

        <Card
          accent="purple"
          title="In programma"
          subtitle="Futuri · orario locale del dispositivo"
        >
          {sessionLoading || (cloudReady && listStatus === 'loading') ? (
            <p className="meta" role="status">
              Caricamento…
            </p>
          ) : blockedReason ? (
            <EmptyState
              title="Cloud non disponibile"
              description="Collega la famiglia, poi torna qui."
            />
          ) : listStatus === 'error' ? (
            <EmptyState
              title="Errore"
              description={listError ?? 'Caricamento non riuscito.'}
            />
          ) : (
            renderList(upcoming, 'Niente in programma')
          )}
        </Card>
      </div>

      <Card accent="blue" title="Passati" subtitle="Storico cloud">
        {cloudReady && listStatus === 'ready'
          ? renderList(past, 'Nessun promemoria passato')
          : (
            <EmptyState
              title="Storico non disponibile"
              description="Disponibile dopo il collegamento cloud."
            />
          )}
      </Card>
    </div>
  )
}
