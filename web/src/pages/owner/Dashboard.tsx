import { Link, useSearchParams } from 'react-router-dom'
import { Plus, User } from 'lucide-react'
import { useAuth } from '../../auth'
import { useJoined, useMyClaims, useMyLists, type WithId } from '../../data/queries'
import { daysUntil, formatShortDate, guestCountLabel, parseDate, wishCountLabel } from '../../lib/format'
import { themeFor } from '../../lib/theme'
import { TYPE_LABEL, type Joined, type ListDoc } from '../../types'
import {
  AvatarPair, BottomBar, ButtonLink, EmptyState, Logo, Screen, ScreenBody, Spinner, Tab, TabList, TabPanel, Tabs, Tag,
} from '../../ui'
import { partnerInfo } from './partner'
import './owner.css'

const OccasionStack = () => (
  <div className="occasion-stack" aria-hidden="true">
    <span style={themeFor('christmas').header} />
    <span style={themeFor('birthday').header} />
    <span style={themeFor('other').header} />
  </div>
)

const CardBand = ({ type }: { type: Joined['type'] }) => <div className="list-card__band" style={themeFor(type).header} />

function MineCard({ list, uid }: { list: WithId<ListDoc>; uid?: string }) {
  const { data } = list
  const p = partnerInfo(data, uid)
  return (
    <Link to={`/lists/${list.id}`} className="list-card">
      <CardBand type={data.type} />
      <div className="list-card__body">
        <div className="list-card__row">
          <h3 className="list-card__title">{data.title}</h3>
          {data.eventDate && <span className="list-card__date">{formatShortDate(data.eventDate)}</span>}
        </div>
        <div className="list-card__meta">{TYPE_LABEL[data.type]} · {wishCountLabel(data.wishCount)} · {guestCountLabel(data.guestCount)}</div>
        {p.shared && <div className="list-card__shared"><AvatarPair names={p.names} />Partagée avec {p.other}</div>}
      </div>
    </Link>
  )
}

function dateLabel(iso: string) {
  const n = daysUntil(iso)
  if (n < 0) return formatShortDate(iso)
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  return n <= 90 ? `dans ${n} jours` : formatShortDate(parseDate(iso))
}

function JoinedCard({ joined, taken, changed }: { joined: WithId<Joined>; taken: number; changed: number }) {
  const { data } = joined
  const accent = themeFor(data.type).accent
  return (
    <Link to={`/l/${data.slug}`} className="list-card">
      <CardBand type={data.type} />
      <div className="list-card__body">
        <div className="list-card__row">
          <h3 className="list-card__title">{data.title}</h3>
          {data.eventDate && <span className="list-card__date">{dateLabel(data.eventDate)}</span>}
        </div>
        <div className="list-card__kicker" style={{ color: accent }}>Liste de {data.ownerName}</div>
        {taken === 0 ? (
          <div className="list-card__meta">rien de pris par toi</div>
        ) : (
          <div className="list-card__tags">
            <Tag variant="claimed" still>{taken} pris par toi</Tag>
            {changed > 0 && <Tag variant="warning" still>{changed} modifié</Tag>}
          </div>
        )}
      </div>
    </Link>
  )
}

export function Dashboard() {
  const { profile, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'joined' ? 'joined' : 'mine'
  const mine = useMyLists()
  const joined = useJoined()
  const claims = useMyClaims()

  const joinedCount = joined.data?.length ?? 0

  return (
    <Screen>
      <div className="dash-head">
        <Logo size={36} to="/app" />
        <Link to="/account" className="icon-btn" aria-label="Mon compte"><User size={22} /></Link>
      </div>
      <ScreenBody>
        <div className="dash-title">
          <div className="dash-title__hello">Bonjour {profile?.displayName}</div>
          <h1>Tes listes</h1>
        </div>
        <Tabs value={tab} onValueChange={(v) => setParams(v === 'joined' ? { tab: 'joined' } : {}, { replace: true })}>
          <TabList className="dash-tabs">
            <Tab value="mine">Mes listes</Tab>
            <Tab value="joined">Listes rejointes{joinedCount > 0 && ` · ${joinedCount}`}</Tab>
          </TabList>
          <TabPanel value="mine">
            {mine.isPending ? <Spinner /> : mine.data?.length ? (
              <div className="list-cards">{mine.data.map((l) => <MineCard key={l.id} list={l} uid={user?.uid} />)}</div>
            ) : (
              <EmptyState title="Ta première liste t'attend" illustration={<OccasionStack />}>
                Noël, anniversaire ou juste comme ça.<br />Crée-la en moins d'une minute.
              </EmptyState>
            )}
          </TabPanel>
          <TabPanel value="joined">
            {joined.isPending ? <Spinner /> : joined.data?.length ? (
              <div className="list-cards">
                {joined.data.map((j) => {
                  const own = claims.data?.filter((c) => c.parentId === j.id) ?? []
                  const changed = own.filter((c) => c.data.flag === 'changed' && !c.data.flagAckAt).length
                  return <JoinedCard key={j.id} joined={j} taken={own.length} changed={changed} />
                })}
              </div>
            ) : (
              <EmptyState title="Aucune liste rejointe">Ouvre le lien d'un proche pour retrouver sa liste ici.</EmptyState>
            )}
          </TabPanel>
        </Tabs>
      </ScreenBody>
      {tab === 'mine' ? (
        <BottomBar plain>
          <ButtonLink to="/lists/new" large full><Plus size={20} aria-hidden="true" />Créer une liste</ButtonLink>
        </BottomBar>
      ) : (
        <div className="bottom-bar bottom-bar--plain">
          <div className="create-nudge">
            <div>
              <strong>Et toi, tu veux quoi ?</strong>
              <div className="create-nudge__text">Crée ta propre liste en une minute.</div>
            </div>
            <ButtonLink to="/lists/new">Créer</ButtonLink>
          </div>
        </div>
      )}
    </Screen>
  )
}
