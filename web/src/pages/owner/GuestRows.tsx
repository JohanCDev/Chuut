import type { WithId, Member } from '../../data/queries'
import { formatShortDate } from '../../lib/format'

const COLORS = [
  { bg: '#2A5A4A', fg: '#fff' },
  { bg: '#E8B04A', fg: '#2A1E1A' },
  { bg: '#B3202F', fg: '#fff' },
  { bg: '#F0CDBE', fg: '#2A1E1A' },
  { bg: '#C9A87C', fg: '#2A1E1A' },
]

/** Guest list rows: name and join date only, never what they chose. */
export function GuestRows({ guests }: { guests: WithId<Member>[] }) {
  return (
    <div className="list-group">
      {guests.map((g, i) => {
        const joinedAt = g.data.joinedAt?.toDate()
        const color = COLORS[i % COLORS.length]
        return (
          <div key={g.id} className="list-row guest-row">
            <span className="avatar" style={{ background: color.bg, color: color.fg }} aria-hidden="true">
              {(g.data.displayName.trim()[0] ?? '?').toUpperCase()}
            </span>
            <div className="guest-row__text">
              <strong>{g.data.displayName}</strong>
              {joinedAt && <div className="guest-row__meta">A rejoint le {formatShortDate(joinedAt)}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
