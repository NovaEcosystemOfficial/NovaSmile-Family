# Contratto d’integrazione Flutter (Nicholas)

## Progetti locali

- **Web:** `C:\Project\novasmile-family` (questo repo).
- **`C:\Project\novamobile`:** app Flutter **NovaDocs** (documenti), **non** è l’app bambino NovaSmile. Non riutilizzarla come se fosse Nicholas.

Finché non esiste un progetto Flutter dedicato a NovaSmile Child nello stesso monorepo o path, questo documento è il contratto ufficiale.

## Firebase

- Project ID: `novasmile-416b6`
- Auth: stesso progetto; tipicamente Google o account bambino collegato dal genitore
- Dipendenze consigliate: `firebase_core`, `firebase_auth`, `cloud_firestore`, opzionale `firebase_storage`, `connectivity_plus`

## Associazione famiglia (web → Kids)

1. Genitore apre **Famiglia → Gestione famiglia** nella webapp (account owner).
2. Copia l’UID Firebase mostrato da NovaSmile Kids (Nicholas, Google Auth).
3. Owner inserisce UID + nome; ruolo forzato `viewer`. Conferma → create `families/{familyId}/members/{childUid}`.
4. Kids verifica `get(families/{familyId}/members/{uid})` con `role == viewer` (familyId dalla sessione/config Kids, non scelto liberamente dal bambino per ottenere privilegi).

**Regole members (pairing):** il bambino deve poter fare `get` sul **proprio**
`members/{uid}` anche prima di essere `isMember` (altrimenti → `permission-denied`
invece di documento assente). `list` e lettura di altri membri restano `isMember`.

**Note di sicurezza**

- Solo owner può creare membri non-self; ruolo consentito dalle regole: **solo `viewer`**.
- Nessuna scrittura `users/{childUid}` da parte dell’owner (le regole permettono solo `auth.uid == uid`).
- Kids non deve auto-assegnarsi owner/parent.
- Il pairing **non** è completo finché Kids non conferma la membership sul device.

## Operazioni permesse al bambino (`viewer`)

| Operazione | Consentito |
|------------|------------|
| Leggere profile/settings | Sì (member) |
| Leggere messages | Sì |
| Creare/modificare messages | No (editor) |
| Impostare `delivered` | Solo se regole dedicate + auth bambino e update vincolato (oggi update messaggi = editor). Per conferma lettura: preferire subcollection `messageReceipts/{uid}` (non ancora nello schema) |
| Leggere appointments | Sì |
| Completare routineDays | Sì **dopo** publish delle regole locali (`isMember` su routineDays) |
| Creare/modificare template routines | No |
| Upload vocali | No |

## Percorsi esatti

Vedi `docs/ARCHITECTURE.md`.

## Notifiche / consegna

Su Spark **non** ci sono FCM server-side via Cloud Functions. Opzioni:

- Polling Firestore dall’app bambino
- (Futuro Blaze) Cloud Functions + FCM — **fuori vincolo**

Non dichiarare “consegnato” senza `deliveredAt` scritto dal device destinatario con regole dedicate.

## Dipendenze Flutter minime

```yaml
firebase_core: ^4.x
firebase_auth: ^6.x
cloud_firestore: ^6.x
# opzionale:
firebase_storage: ^13.x
connectivity_plus: ^6.x
```

## Checklist integrazione

1. Creare app Android in Firebase console sullo stesso progetto
2. `google-services.json` **non** in git pubblico se contiene restrizioni sensibili; mai service account
3. Auth + prova lettura `members/{uid}`
4. Lista `messages` orderBy `createdAt`
5. Toggle `routineDays/{yyyy-mm-dd}`
6. UI offline / errori
7. Nessuna sync dichiarata finché questo flusso non è verificato su device reale
