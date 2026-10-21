import { Sorrino } from './Sorrino'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Sorrino mood="listen" size={72} />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn-secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
