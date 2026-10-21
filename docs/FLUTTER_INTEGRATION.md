# Contratto d’integrazione Flutter (Nicholas)

## Progetti locali

- **Web:** `C:\Project\novasmile-family` (questo repo).
- **`C:\Project\novamobile`:** app Flutter **NovaDocs** (documenti), **non** è l’app bambino NovaSmile. Non riutilizzarla come se fosse Nicholas.

Finché non esiste un progetto Flutter dedicato a NovaSmile Child nello stesso monorepo o path, questo documento è il contratto ufficiale.

## Firebase

- Project ID: `novasmile-416b6`
- Auth: stesso progetto; tipicamente Google o account bambino collegato dal genitore
- Dipendenze consigliate: `firebase_core`, `firebase_auth`, `cloud_firestore`, opzionale `firebase_storage`, `connectivity_plus`

## Associazione famiglia

1. Genitore (owner) crea membership `families/{familyId}/members/{childUid}` con `role: viewer` (solo owner può creare membri non-self fuori bootstrap).
2. Oppure flusso invitazionale futuro (non implementato): mai permettere al client bambino di scrivere `role: owner`.
3. Bambino legge `users/{uid}.familyId` dopo binding creato dall’owner (oggi il binding `users/{uid}` nasce solo dal bootstrap owner; per il bambino serve create member + eventuale doc user dedicato o lookup via member list — **da progettare senza indebolire le regole**).

**Limite attuale:** `users/{uid}` create è solo nel bootstrap atomico owner. Per collegare un secondo account bambino in modo sicuro serve un’operazione owner-only aggiuntiva (es. owner scrive `users/{childUid}` non è permesso dalle regole attuali: solo `request.auth.uid == uid`). Quindi l’associazione bambino richiede:

- Auth del bambino, e
- Owner che crea `members/{childUid}` con role `viewer`, e
- App bambino che risolve `familyId` tramite query membership **o** familyId fornito in deep link / pairing code verificato lato regole.

Query “tutte le famiglie dove sono member” non è banale senza collection group index. Opzioni Spark-safe:

1. **Pairing code** one-time in un doc `familyInvites/{code}` (richiede regole dedicate, non ancora presenti).
2. **familyId inserito una volta** dall’adulto sul dispositivo bambino e verificato con `get(members/{uid})`.

Consigliato per MVP: genitore inserisce `familyId` sul device bambino → app fa `get families/{id}/members/{uid}` e procede solo se esiste.

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
