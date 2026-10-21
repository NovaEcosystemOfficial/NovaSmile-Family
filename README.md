# NovaSmile Family

Pannello genitori (React 19 + TypeScript + Vite 8) per le routine ortodontiche di Nicholas. Firebase project `novasmile-416b6`, piano **Spark**.

## Documentazione

- [Architettura e schema Firestore](docs/ARCHITECTURE.md)
- [Operazioni, limiti Spark, prove locali](docs/OPERATIONS.md)
- [Contratto integrazione Flutter](docs/FLUTTER_INTEGRATION.md)
- [Bootstrap famiglia](firestore/BOOTSTRAP.md)

## Avvio rapido

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Script

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | Oxlint |
| `npm run test:unit` | Unit test |
| `npm run test:rules` | Regole Firestore (emulator) |

Nessun secret nel repository. Non eseguire deploy senza approvazione esplicita.
