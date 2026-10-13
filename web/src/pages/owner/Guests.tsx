import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useList, useMembers } from '../../data/queries'
import { plural } from '../../lib/format'
import { themeFor } from '../../lib/theme'
import { BottomBar, Button, EmptyState, ButtonLink, Screen, ScreenBody, Spinner, TopBar } from '../../ui'
import { GuestRows } from './GuestRows'
import { sortGuests } from './partner'
import { ShareSheet } from './ShareSheet'
import './owner.css'

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
  const guests = sortGuests(members.data ?? [])

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
        {guests.length > 0 && <GuestRows guests={guests} />}
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
