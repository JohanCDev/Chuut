import type { ReactNode } from 'react'

export function EmptyState({ title, children, illustration, action }: {
  title: string
  children?: ReactNode
  illustration?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {illustration}
      <h3 style={{ fontWeight: 700 }}>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}
