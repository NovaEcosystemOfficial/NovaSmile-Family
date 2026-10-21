import type { SectionId } from '../types'

interface NavItem {
  id: SectionId
  label: string
  icon: string
}

const items: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'messages', label: 'Messaggi', icon: '💬' },
  { id: 'voice', label: 'Vocali', icon: '🎙️' },
  { id: 'schedule', label: 'Programma', icon: '🗓️' },
  { id: 'routines', label: 'Routine', icon: '⭐' },
  { id: 'profile', label: 'Famiglia', icon: '👨‍👦' },
]

interface NavProps {
  active: SectionId
  onChange: (id: SectionId) => void
}

export function Nav({ active, onChange }: NavProps) {
  return (
    <nav className="app-nav" aria-label="Sezioni principali">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={active === item.id ? 'is-active' : undefined}
              onClick={() => onChange(item.id)}
              aria-current={active === item.id ? 'page' : undefined}
            >
              <span className="app-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="app-nav__label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
