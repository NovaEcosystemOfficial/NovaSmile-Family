import type { ReactNode } from 'react'
import type { SectionId } from '../types'
import { Nav } from './Nav'
import { Sorrino } from './Sorrino'

interface LayoutProps {
  active: SectionId
  onNavigate: (id: SectionId) => void
  children: ReactNode
  userLabel: string
  userEmail?: string | null
  onSignOut: () => void
  signOutBusy?: boolean
}

export function Layout({
  active,
  onNavigate,
  children,
  userLabel,
  userEmail,
  onSignOut,
  signOutBusy = false,
}: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="brand">
          <Sorrino mood="cheer" size={52} className="brand__mascot" />
          <div>
            <p className="brand__eyebrow">NovaSmile</p>
            <h1 className="brand__title">Family</h1>
          </div>
        </div>
        <div className="topbar-user">
          <div className="topbar-user__meta">
            <p className="topbar-user__name">{userLabel}</p>
            {userEmail ? (
              <p className="topbar-note">{userEmail}</p>
            ) : (
              <p className="topbar-note">Pannello privato genitori</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-compact"
            onClick={onSignOut}
            disabled={signOutBusy}
          >
            {signOutBusy ? 'Uscita…' : 'Esci'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <Nav active={active} onChange={onNavigate} />
        </aside>
        <main className="app-main" id="contenuto-principale">
          {children}
        </main>
      </div>

      <div className="app-mobile-nav">
        <Nav active={active} onChange={onNavigate} />
      </div>
    </div>
  )
}
