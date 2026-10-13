import { countdownLabel, formatDate, wishCountLabel } from '../lib/format'
import { themeFor } from '../lib/theme'
import type { ListType } from '../types'

/**
 * Caveat "Liste de X" + Fraunces title + meta line: "25 décembre · plus que 74 jours · 3 souhaits".
 * Pass `type` to colour the kicker with the occasion accent. `extra` adds more meta parts
 * (e.g. "2 déjà prises" on guest views). Past dates show no countdown.
 */
export function ListTitle({ ownerName, title, eventDate, wishCount, extra = [], type }: {
  ownerName: string
  title: string
  eventDate?: string | null
  wishCount?: number
  extra?: string[]
  type?: ListType
}) {
  const parts = [
    eventDate && formatDate(eventDate),
    eventDate && countdownLabel(eventDate),
    wishCount != null && wishCountLabel(wishCount),
    ...extra,
  ].filter(Boolean)
  return (
    <div className="list-title" style={{ ['--accent' as string]: type ? themeFor(type).accent : undefined }}>
      <div className="list-title__kicker">Liste de {ownerName}</div>
      <h1>{title}</h1>
      {parts.length > 0 && <div className="list-title__meta">{parts.join(' · ')}</div>}
    </div>
  )
}
