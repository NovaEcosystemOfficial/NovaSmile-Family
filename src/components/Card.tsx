import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  accent?: 'blue' | 'purple' | 'teal' | 'orange' | 'yellow'
  title?: string
  subtitle?: string
  action?: ReactNode
}

export function Card({
  children,
  className = '',
  accent,
  title,
  subtitle,
  action,
}: CardProps) {
  return (
    <section
      className={`card ${accent ? `card--${accent}` : ''} ${className}`.trim()}
    >
      {(title || action) && (
        <header className="card__header">
          <div>
            {title ? <h2 className="card__title">{title}</h2> : null}
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
