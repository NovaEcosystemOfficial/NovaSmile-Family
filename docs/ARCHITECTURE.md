# NovaSmile Family — architettura

Progetto web React 19 + TypeScript + Vite 8. Firebase project `novasmile-416b6`, piano **Spark** (niente Cloud Functions / Blaze).

## Componenti

| Area | Tecnologia |
|------|------------|
| Auth | Firebase Authentication (Google) |
| Dati | Cloud Firestore |
| Audio | Firebase Storage (opzionale, regole da pubblicare) |
| Hosting | Vercel (web) e/o Firebase Hosting |

## Struttura Firestore

```
users/{uid}                          → { familyId, updatedAt }
families/{familyId}                  → { name, createdByUid, status, createdAt }
families/{familyId}/members/{uid}    → { role, displayName, email, joinedAt }
families/{familyId}/profile/settings → preferenze famiglia
families/{familyId}/messages/{id}    → messaggi testo
families/{familyId}/appointments/{id}→ promemoria (non scheduler)
families/{familyId}/routines/{id}    → template missioni
families/{familyId}/routineDays/{yyyy-mm-dd} → completamenti + pointsEarned
families/{familyId}/activities/{id}  → feed dashboard
families/{familyId}/voiceMessages/{id} → metadati vocali (file in Storage)
```

Storage path: `families/{familyId}/voice/{uid}/{voiceId}`

## Ruoli

| Ruolo | Capacità tipiche |
|-------|------------------|
| `owner` | Bootstrap, delete messaggi/appuntamenti/vocali, gestione membri |
| `parent` | Create/update messaggi, appuntamenti, routine template, profili, vocali |
| `viewer` | Lettura; completamenti routineDays (dopo publish regole aggiornate) |

Il bambino **non** può auto-promuoversi a owner: `users/{uid}.familyId` è immutabile; create member owner solo nel bootstrap atomico o da owner esistente.

## Stati messaggio (onesti)

| Status | Significato |
|--------|-------------|
| `draft` | Salvato nel cloud (legacy; non ancora esposto a Kids) |
| `queued` | Disponibile per lettura membri/Android (stato di invio immediato) |
| `scheduled` | Programmato (documento con data) |
| `delivered` | Solo con `deliveredAt` da conferma dispositivo reale |
| `failed` | Errore |

Un documento con data futura **non** è uno scheduler: su Spark non partono invii automatici.

## Layer client

- `src/data/firestore/*` — API tipizzate
- `src/data/*Cloud.ts` — gate membership + UI
- `src/hooks/useFamilySession.ts` — bootstrap / `cloudLinked`
- `firestore.rules` / `storage.rules` — sicurezza locale; publish solo su approvazione
