import { cn } from '../lib/cn'

export function Spinner({ label = 'Chargement', page }: { label?: string; page?: boolean }) {
  return (
    <div className={cn('spinner', page && 'spinner--page')} role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
