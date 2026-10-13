import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useList, useMembers } from '../../data/queries'
import { formatShortDate, plural } from '../../lib/format'
import { themeFor } from '../../lib/theme'
import { BottomBar, Button, EmptyState, ButtonLink, Screen, ScreenBody, Spinner, TopBar } from '../../ui'
import { ShareSheet } from './ShareSheet'
import './owner.css'

const COLORS = [
  { bg: '#2A5A4A', fg: '#fff' },
  { bg: '#E8B04A', fg: '#2A1E1A' },
  { bg: '#B3202F', fg: '#fff' },
  { bg: '#F0CDBE', fg: '#2A1E1A' },
  { bg: '#C9A87C', fg: '#2A1E1A' },
]

export function Guests() {
  const { listId } = useParams()
  const nav = useNavigate()
  const list = useList(listId)
  const members = useMembers(listId)
  const [sharing, setSharing] = useState(false)

  if (list.isPending || members.isPending) return <Spinner page />
  if (!list.data) {
    return (
      <Screen>
        <ScreenBody>
          <EmptyState title="Cette liste est introuvable" action={<ButtonLink to="/app" variant="outline">Mes listes</ButtonLink>} />
        </ScreenBody>
      </Screen>
    )
  }
  const { data } = list
  const guests = [...(members.data ?? [])].sort((a, b) => (b.data.joinedAt?.toMillis() ?? 0) - (a.data.joinedAt?.toMillis() ?? 0))

  return (
    <Screen>
      <TopBar onBack={() => nav(`/lists/${listId}`)} />
      <ScreenBody>
        <div className="list-title" style={{ ['--accent' as string]: themeFor(data.type).accent }}>
          <div className="list-title__kicker">{data.title}</div>
          <h1>Tes invités</h1>
          <div className="list-title__meta">
            {guests.length === 0 ? "Personne n'a encore ouvert ton lien" : `${plural(guests.length, 'personne')} ${guests.length > 1 ? 'ont' : 'a'} ouvert ton lien`}
          </div>
        </div>
        {guests.length > 0 && (
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
        )}
        <div className="hint-banner hint-banner--stack">
          <div className="hand">Qui a rejoint, et quand.</div>
          <div className="hint-banner__text">Rien sur ce qu'ils choisissent. Toute personne ayant le lien peut rejoindre ta liste.</div>
        </div>
      </ScreenBody>
      <BottomBar>
        <Button large full variant="secondary" onClick={() => setSharing(true)}>Inviter d'autres proches</Button>
      </BottomBar>
      <ShareSheet open={sharing} onOpenChange={setSharing} listId={listId!} list={data} />
    </Screen>
  )
}
