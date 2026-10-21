# Bootstrap famiglia — Spark (senza Cloud Functions)

## Vincolo

NovaSmile Family resta sul **piano Firebase Spark**. Non si usano Cloud Functions né backend a pagamento.

## Modello sicuro (client atomico)

Un solo `runTransaction` crea insieme:

1. `families/{familyId}`
2. `families/{familyId}/members/{uid}` con `role: owner`
3. `families/{familyId}/profile/settings`
4. `users/{uid}` con `familyId` **immutabile**

La transaction **legge** `users/{uid}` prima di scrivere. Se il binding esiste già, non crea una seconda famiglia. In caso di contesa concorrente, Firestore abortisce/riprova una delle transaction.

Le regole usano `existsAfter()` / `getAfter()` e `hasOnly()` sui campi. Create incomplete o con campi extra → `permission-denied`.

## Anti-abuso

| Tentativo | Esito |
|-----------|--------|
| Secondo bootstrap / retry dopo successo | Negato (`users/{uid}` già con `familyId`) + short-circuit client |
| Bootstrap concorrente stesso UID | Mitigato da `transaction.get(users/{uid})` (contention) |
| `users/{uid}` → famiglia altrui | Negato |
| Campi extra su `users` | Negato (`hasOnly`) |
| Auto-iscrizione a famiglia esistente | Negato |
| Cross-family read | Negato |

## Limite concorrenza (documentato)

Le sole Security Rules **non** possono serializzare due create parallele sullo stesso `uid` senza un read contestato: entrambe vedono `!hasExistingFamilyBinding()` nello stato BEFORE.

Mitigazione Spark adottata: **transaction client** che legge `users/{uid}` prima delle write. Non è un lock distribuito assoluto in tutti gli edge-case dell’emulatore/rete, ma è la mitigazione corretta senza Blaze/Admin. Residual risk: basso; non dichiarato “risolto al 100%” solo dai test sequenziali.

## Flusso app

1. Leggi `users/{uid}` → verifica membership.
2. Altrimenti cache locale verificata.
3. Altrimenti `runTransaction` atomica.
4. Se fallisce → **fallback localStorage**; `cloudLinked` resta false.
