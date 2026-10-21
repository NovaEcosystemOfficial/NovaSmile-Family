import { DEMO_BANNER } from '../data/demo'

export type BannerTone = 'demo' | 'ok' | 'warn' | 'error'

interface DemoBannerProps {
  message?: string
  /** Testo del badge (default: Demo). */
  badge?: string
  tone?: BannerTone
}

export function DemoBanner({
  message = DEMO_BANNER,
  badge = 'Demo',
  tone = 'demo',
}: DemoBannerProps) {
  return (
    <div className={`demo-banner demo-banner--${tone}`} role="status">
      <span className="demo-banner__badge">{badge}</span>
      <p>{message}</p>
    </div>
  )
}
