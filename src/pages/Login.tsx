import { DemoBanner } from '../components/DemoBanner'
import { Sorrino } from '../components/Sorrino'
import type { FirebaseEnvKey } from '../lib/firebase'

interface LoginProps {
  configError: string | null
  missingKeys: FirebaseEnvKey[]
  actionError: string | null
  busy: boolean
  onSignIn: () => void
}

export function Login({
  configError,
  missingKeys,
  actionError,
  busy,
  onSignIn,
}: LoginProps) {
  const configBlocked = Boolean(configError) || missingKeys.length > 0

  return (
    <div className="login-shell">
      <div className="login-card">
        <Sorrino mood="cheer" size={96} className="login-card__mascot" />
        <p className="eyebrow">NovaSmile Family</p>
        <h1>Accesso genitori</h1>
        <p className="lede">
          Accedi con Google per aprire il pannello privato. Dopo l’accesso, il
          profilo famiglia può collegarsi a Firestore. La sincronizzazione con
          l’app Android non è attiva in questa versione.
        </p>

        <DemoBanner message="Messaggi, vocali e routine restano in demo locale. Auth Google e profilo famiglia usano Firebase (piano Spark)." />

        {configBlocked ? (
          <div className="alert alert-error" role="alert">
            <p>
              {configError ??
                'Configurazione Firebase incompleta. Compila .env.local e riavvia Vite.'}
            </p>
            {missingKeys.length > 0 ? (
              <ul className="missing-keys">
                {missingKeys.map((key) => (
                  <li key={key}>
                    <code>{key}</code>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="field-hint">
              Copia i nomi da <code>.env.example</code>, inserisci i valori dalla
              console Firebase (app Web) e riavvia <code>npm run dev</code>. Il
              login non viene simulato senza configurazione reale.
            </p>
          </div>
        ) : null}

        {actionError ? (
          <p className="alert alert-error" role="alert">
            {actionError}
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-google"
          onClick={onSignIn}
          disabled={configBlocked || busy}
        >
          {busy ? 'Apertura Google…' : 'Continua con Google'}
        </button>

        <p className="field-hint login-card__footnote">
          Nessuna password memorizzata in questo frontend. Abilita il provider
          Google in Firebase Authentication e verifica i domini autorizzati.
        </p>
      </div>
    </div>
  )
}
