import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Priority } from '../types'
import { cn } from '../lib/cn'
import { PriceBadge } from './PriceBadge'
import { WishFallback } from './illustrations'

/**
 * Wish row card. Whole card is clickable when `to` is set (stretched link on the title).
 * Slots: `tag` (state Tag(s) under the note), `action` (44px trailing control, bottom right, e.g. edit pencil),
 * `footer` (buttons row under the text, e.g. "Je m'en occupe" / "Détails").
 * Do not put owner-unsafe state (claims) in `tag` on owner screens.
 */
export function WishCard({ title, domain, note, price, imageUrl, priority, to, linkState, className, tag, action, footer, dimmed }: {
  title: string
  domain?: string | null
  note?: string | null
  price?: number | null
  imageUrl?: string | null
  priority?: Priority
  to?: string
  /** router state passed along with `to` */
  linkState?: unknown
  className?: string
  tag?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  dimmed?: boolean
}) {
  return (
    <article className={cn('wish-card', dimmed && 'wish-card--dimmed', className)}>
      <div className="wish-card__media">
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <WishFallback title={title} />}
      </div>
      <div className="wish-card__body">
        {priority === 'coeur' && (
          <div className="wish-card__priority"><Heart size={14} fill="currentColor" aria-hidden="true" />Coup de cœur</div>
        )}
        <h3 className="wish-card__title">{to ? <Link to={to} state={linkState}>{title}</Link> : title}</h3>
        {domain && <div className="wish-card__domain">{domain}</div>}
        {note && <div className="wish-card__note">{note}</div>}
        {tag && <div className="wish-card__tag">{tag}</div>}
        {footer && <div className="wish-card__footer">{footer}</div>}
      </div>
      {price != null && <PriceBadge price={price} seed={title} />}
      {action && <div className="wish-card__action">{action}</div>}
    </article>
  )
}
