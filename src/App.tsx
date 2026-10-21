import { useState } from 'react'
import { Layout } from './components/Layout'
import { DEFAULT_PREFERENCES } from './data/demo'
import { useAuth } from './hooks/useAuth'
import { useLocalStorage } from './hooks/useLocalStorage'
import { Dashboard } from './pages/Dashboard'
import { FamilyProfile } from './pages/FamilyProfile'
import { Login } from './pages/Login'
import { Messages } from './pages/Messages'
import { Routines } from './pages/Routines'
import { Schedule } from './pages/Schedule'
import { VoiceMessages } from './pages/VoiceMessages'
import type { FamilyPreferences, SectionId } from './types'

const PREFS_KEY = 'novasmile-family:preferences'

function App() {
  const [section, setSection] = useState<SectionId>('dashboard')
  const {
    value: preferences,
    setValue: setPreferences,
    error: prefsError,
  } = useLocalStorage<FamilyPreferences>(PREFS_KEY, DEFAULT_PREFERENCES)

  const {
    phase,
    user,
    configError,
    missingKeys,
    actionError,
    busy,
    signIn,
    signOutUser,
  } = useAuth()

  if (phase === 'loading') {
    return (
      <div className="auth-loading" role="status">
        <p>Verifica accesso…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Login
        configError={configError}
        missingKeys={missingKeys}
        actionError={actionError}
        busy={busy}
        onSignIn={() => {
          void signIn()
        }}
      />
    )
  }

  return (
    <Layout
      active={section}
      onNavigate={setSection}
      userLabel={user.displayName ?? user.email ?? 'Genitore'}
      userEmail={user.email}
      onSignOut={() => {
        void signOutUser()
      }}
      signOutBusy={busy}
    >
      {actionError ? (
        <p className="alert alert-error" role="alert">
          {actionError}
        </p>
      ) : null}
      {section === 'dashboard' && (
        <Dashboard preferences={preferences} onNavigate={setSection} />
      )}
      {section === 'messages' && (
        <Messages childName={preferences.childName} />
      )}
      {section === 'voice' && (
        <VoiceMessages childName={preferences.childName} />
      )}
      {section === 'schedule' && (
        <Schedule childName={preferences.childName} />
      )}
      {section === 'routines' && (
        <Routines
          childName={preferences.childName}
          showPoints={preferences.showPoints}
        />
      )}
      {section === 'profile' && (
        <FamilyProfile
          preferences={preferences}
          onChange={setPreferences}
          storageError={prefsError}
        />
      )}
    </Layout>
  )
}

export default App
