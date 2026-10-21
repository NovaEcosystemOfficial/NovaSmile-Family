import { useEffect, useState } from 'react'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import {
  addVerifiedViewerMember,
  listVerifiedMembers,
  removeVerifiedViewerMember,
} from '../data/membersCloud'
import type { FamilySession } from '../hooks/useFamilySession'
import type { FamilyMember } from '../types/cloud'

interface FamilyManagementProps {
  userUid: string
  familySession: FamilySession
}

export function FamilyManagement({
  userUid,
  familySession,
}: FamilyManagementProps) {
  const familyId = familySession.familyId
  const cloudReady = familySession.cloudLinked && Boolean(familyId)
  const isOwner = familySession.role === 'owner'

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [listStatus, setListStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [listError, setListError] = useState<string | null>(null)
  const [memberUid, setMemberUid] = useState('')
  const [displayName, setDisplayName] = useState('Nicholas')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cloudReady || !familyId) return
    let cancelled = false

    async function load(activeFamilyId: string) {
      const result = await listVerifiedMembers(activeFamilyId, userUid)
      if (cancelled) return
      if (!result.ok) {
        setMembers([])
        setListStatus('error')
        setListError(result.error.message)
        return
      }
      setMembers(result.data)
      setListStatus('ready')
      setListError(null)
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setListStatus('loading')
        setListError(null)
      }
    })
    void load(familyId)
    return () => {
      cancelled = true
    }
  }, [cloudReady, familyId, userUid])

  async function reload(activeFamilyId: string) {
    const result = await listVerifiedMembers(activeFamilyId, userUid)
    if (result.ok) {
      setMembers(result.data)
      setListStatus('ready')
      setListError(null)
    }
  }

  async function onAddMember() {
    if (!familyId || !isOwner) return

    const uid = memberUid.trim()
    const name = displayName.trim()
    const confirmed = window.confirm(
      `Associare l’UID\n${uid}\nalla famiglia come viewer (sola lettura operativa per Kids)?\n\nNome: ${name}\nRuolo: viewer (fisso)\n\nConfermi?`,
    )
    if (!confirmed) return

    setBusy(true)
    setError(null)
    setFeedback(null)

    const result = await addVerifiedViewerMember(familyId, userUid, {
      memberUid: uid,
      displayName: name,
      email: email.trim() || undefined,
    })
    setBusy(false)

    if (!result.ok) {
      setError(result.error.message)
      return
    }

    setMemberUid('')
    setFeedback(
      `Membro ${result.data.displayName} associato come viewer. L’app Kids deve ancora verificare la membership sul dispositivo di Nicholas: il pairing non è completo finché non lo conferma Android.`,
    )
    await reload(familyId)
  }

  async function onRemoveViewer(member: FamilyMember) {
    if (!familyId || !isOwner || member.role !== 'viewer') return
    if (
      !window.confirm(
        `Rimuovere ${member.displayName} (${member.uid}) dalla famiglia?`,
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    const result = await removeVerifiedViewerMember(
      familyId,
      userUid,
      member.uid,
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      return
    }
    setFeedback('Membro viewer rimosso.')
    await reload(familyId)
  }

  function copyFamilyId() {
    if (!familyId) return
    void navigator.clipboard?.writeText(familyId).then(
      () => setFeedback('familyId copiato negli appunti.'),
      () => setError('Impossibile copiare il familyId.'),
    )
  }

  if (!cloudReady || !familyId) {
    return (
      <Card accent="teal" title="Gestione famiglia">
        <EmptyState
          title="Famiglia non collegata"
          description="Completa prima il collegamento cloud: senza familyId verificato non è possibile associare Nicholas."
        />
      </Card>
    )
  }

  return (
    <Card
      accent="teal"
      title="Gestione famiglia"
      subtitle="Associa l’account Firebase di Nicholas (viewer)"
    >
      <p className="field-hint">
        familyId verificato (dalla sessione owner, non inventato):{' '}
        <code>{familyId}</code>{' '}
        <button type="button" className="btn btn-link" onClick={copyFamilyId}>
          Copia
        </button>
      </p>
      <p className="field-hint">
        Ruolo sessione: {familySession.role ?? 'sconosciuto'}. Solo owner può
        aggiungere membri. Il bambino non sceglie la famiglia né i privilegi.
      </p>

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
      {listError && (
        <p className="alert alert-error" role="alert">
          {listError}
        </p>
      )}

      {listStatus === 'loading' ? (
        <p className="meta">Caricamento membri…</p>
      ) : members.length === 0 ? (
        <EmptyState
          title="Nessun membro"
          description="Dopo il bootstrap dovrebbe comparire almeno l’owner."
        />
      ) : (
        <ul className="feed-list">
          {members.map((m) => (
            <li key={m.uid}>
              <p>
                <strong>{m.displayName}</strong> · {m.role}
              </p>
              <span className="meta">
                <code>{m.uid}</code>
                {m.email ? ` · ${m.email}` : ''}
              </span>
              {isOwner && m.role === 'viewer' ? (
                <div className="btn-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => {
                      void onRemoveViewer(m)
                    }}
                  >
                    Rimuovi viewer
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {isOwner ? (
        <div className="grid-2" style={{ marginTop: 16 }}>
          <label className="field">
            <span>UID Firebase di Nicholas</span>
            <input
              type="text"
              value={memberUid}
              onChange={(e) => setMemberUid(e.target.value)}
              placeholder="Incolla l’UID dall’app Kids"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Nome visualizzato</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Email (facoltativa)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Se vuota: placeholder locale per le regole"
              maxLength={200}
              disabled={busy}
            />
          </label>
          <label className="field">
            <span>Ruolo</span>
            <input type="text" value="viewer (fisso)" disabled readOnly />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !memberUid.trim() || !displayName.trim()}
              onClick={() => {
                void onAddMember()
              }}
            >
              {busy ? 'Salvataggio…' : 'Associa come viewer'}
            </button>
          </div>
        </div>
      ) : (
        <p className="alert alert-info" role="status">
          Il tuo ruolo non è owner: non puoi associare nuovi membri.
        </p>
      )}
    </Card>
  )
}
