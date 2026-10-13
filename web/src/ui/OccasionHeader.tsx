import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import type { ListType } from '../types'
import { themeFor } from '../lib/theme'
import { cn } from '../lib/cn'

/**
 * Patterned header for a list (pattern + accent depend on `type`), with gradient fade into the page.
 * Left: back pill (default "Mes listes", goes to `backTo` or history back) or custom `left`.
 * Right: `right`, usually <HeaderRound> or <HeaderPill>.
 * `compact` drops the fade and shortens the bar (desktop). `hideBack` omits the default back pill when no `left` is given.
 */
export function OccasionHeader({ type, backTo, backLabel = 'Mes listes', left, right, compact, hideBack }: {
  type: ListType
  backTo?: string
  backLabel?: string
  left?: ReactNode
  right?: ReactNode
  compact?: boolean
  hideBack?: boolean
}) {
  const nav = useNavigate()
  const theme = themeFor(type)
  return (
    <header className={cn('occasion-header', compact && 'occasion-header--compact')} style={{ ...theme.header, ['--header-ink' as string]: theme.ink }}>
      <div className="occasion-header__fade" />
      <div className="occasion-header__bar">
        {left ?? (hideBack ? null : backTo
          ? <Link to={backTo} className="header-pill"><ChevronLeft size={18} aria-hidden="true" />{backLabel}</Link>
          : <button type="button" className="header-pill" onClick={() => nav(-1)}><ChevronLeft size={18} aria-hidden="true" />{backLabel}</button>)}
        {right}
      </div>
    </header>
  )
}

/** Text pill for the header (static label, or link/button via `to`/`onClick`). */
export function HeaderPill({ children, to, onClick }: { children: ReactNode; to?: string; onClick?: () => void }) {
  if (to) return <Link to={to} className="header-pill">{children}</Link>
  if (onClick) return <button type="button" className="header-pill" onClick={onClick}>{children}</button>
  return <span className="header-pill">{children}</span>
}

/** Round 44px header button (menu, account). `label` is the aria-label. */
export function HeaderRound({ label, children, to, onClick }: { label: string; children: ReactNode; to?: string; onClick?: () => void }) {
  if (to) return <Link to={to} className="header-round" aria-label={label}>{children}</Link>
  return <button type="button" className="header-round" aria-label={label} onClick={onClick}>{children}</button>
}
