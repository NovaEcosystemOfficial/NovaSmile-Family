# Operazioni locali e publish manuale

## Sviluppo

```bash
cp .env.example .env.local   # valori dalla console Firebase web app
npm install
npm run dev
```

Script utili:

- `npm run build` — typecheck + bundle
- `npm run lint` — oxlint
- `npm run test:unit` — trust helpers
- `npm run test:rules` — emulator + regole

## Funzionalità operative (web)

| Sezione | Stato |
|---------|--------|
| Login Google | Operativo |
| Famiglia / profilo | Operativo (Firestore) |
| Messaggi testo | Operativo (Firestore) |
| Programma | Operativo (Firestore, senza invio auto) |
| Routine | Operativo per editor; viewer dopo publish regole |
| Dashboard | Operativa con dati cloud |
| Vocali | Registrazione locale; upload Storage dopo publish regole |

## Limiti Spark

- Nessuna Cloud Function → niente scheduler server, niente push automatiche
- Quote Storage/Firestore gratuite: rispettare limiti (audio ≤ 5 MB)
- Regole remote aggiornate solo con deploy manuale approvato

## Deploy manuali ancora necessari (non eseguiti da questo task)

1. `firebase deploy --only firestore:rules --project novasmile-416b6`  
   (routineDays member + voiceMessages)
2. `firebase deploy --only storage --project novasmile-416b6`  
   (dopo aver abilitato Storage nel progetto se non attivo)
3. Hosting / Vercel: push GitHub o `firebase deploy --only hosting` su richiesta
4. App Android: build/sign/play — fuori da questo repo finché non esiste il progetto Flutter Nicholas

## Prove locali consigliate

1. Login → Famiglia “Collegato al cloud”
2. Messaggi: salva → elenco → “Rendi disponibile per Android”
3. Programma: salva futuro → appare in elenco (nessuna notifica)
4. Routine: “Crea template iniziali” → completa missione → punti aggiornati
5. Home: messaggi/promemoria/attività reali
6. Vocali: registra; upload solo dopo publish Storage/rules
