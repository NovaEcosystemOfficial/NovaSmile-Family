import { DEMO_BANNER } from '../data/demo'

interface DemoBannerProps {
  message?: string
}

export function DemoBanner({ message = DEMO_BANNER }: DemoBannerProps) {
  return (
    <div className="demo-banner" role="status">
      <span className="demo-banner__badge">Demo</span>
      <p>{message}</p>
    </div>
  )
}
