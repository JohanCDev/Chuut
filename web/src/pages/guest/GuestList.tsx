import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, TriangleAlert, X } from 'lucide-react'
import { useAuth } from '../../auth'
import { useClaims, useInvite, useJoinedBySlug, useList, useMyMember, useOwnedListBySlug, useWishes } from '../../data/queries'
import type { WithId } from '../../data/live'
import { agree, countdownLabel, plural } from '../../lib/format'
import type { Claim, Joined, Wish } from '../../types'
import {
  Button, ButtonLink, EmptyBox, EmptyState, IconButton, ListTitle, OccasionHeader, Screen, ScreenBody, Spinner, Tag, WishCard,
} from '../../ui'
import { LoadError, NotFound } from '../Shell'
import { useGuestActions, type GuestCtx } from './actions'
import { ChangedBadge, RemovedBadge } from './changes'
import { JoinScreen } from './Join'

/** /l/:slug: owner goes to the owner view, member sees the list (wish sheet is a nested route), others get the join gate. */
export function Resolver() {
  const { slug = '' } = useParams()
  const { pathname } = useLocation()
  const { loading } = useAuth()
  const owned = useOwnedListBySlug(slug)
  const joined = useJoinedBySlug(slug)
  const roleLoading = loading || owned.isLoading || joined.isLoading
  const invite = useInvite(slug, !roleLoading && !owned.owned && !joined.joined)

  if (roleLoading || invite.isLoading) return <Spinner page />
  if (owned.owned) return <Navigate to={`/lists/${owned.owned.id}`} replace />
  if (joined.joined) return <GuestList slug={slug} joined={joined.joined} />
  if (invite.isError) return <LoadError onRetry={() => void invite.refetch()} />
  if (!invite.data) return <NotFound />
  return <JoinScreen slug={slug} invite={invite.data} next={pathname} />
}

const DISMISS_KEY = 'chut:upgrade-prompt-dismissed'

function GuestList({ slug, joined }: { slug: string; joined: Joined }) {
  const { user } = useAuth()
  const listId = joined.listId
  const list = useList(listId)
  const wishes = useWishes(listId)
  const claims = useClaims(listId)
  const member = useMyMember(listId)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const [noted, setNoted] = useState(false)
  const [promptDismissed, setPromptDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    if (!noted) return
    const t = setTimeout(() => setNoted(false), 3500)
    return () => clearTimeout(t)
  }, [noted])

  const celebrate = useCallback((wishId: string, kind: 'claimed' | 'purchased') => {
    setFresh((s) => new Set(s).add(wishId))
    if (kind === 'claimed') setNoted(true)
  }, [])

  const l = list.data ?? joined
  const myName = member.data?.displayName ?? 'Invité'
  const ctx: GuestCtx = { slug, listId, ownerName: l.ownerName, shared: list.data?.shared, eventDate: l.eventDate, myName, celebrate }
  const actions = useGuestActions(ctx)

  if (wishes.isError || claims.isError) return <NotFound />
  // Wait for the list too: joined docs carry no `shared`, so copy would flash singular.
  if (wishes.isPending || claims.isPending || member.isPending || list.isPending) return <Spinner page />

  const me = user?.uid
  const claimByWish = new Map(claims.data.map((c) => [c.id, c.data]))
  const wishIds = new Set(wishes.data.map((w) => w.id))
  const removed = claims.data.filter((c) => c.data.claimerUid === me && c.data.flag === 'removed' && !wishIds.has(c.id))
  const isChanged = (w: Wish, c?: Claim) => !!c && c.claimerUid === me && c.flag !== 'removed' && c.seenRev < w.rev
  const changedCount = wishes.data.filter((w) => isChanged(w.data, claimByWish.get(w.id))).length
  const changes = changedCount + removed.length
  const taken = wishes.data.filter((w) => claimByWish.has(w.id)).length
  const hasMyClaim = claims.data.some((c) => c.data.claimerUid === me && c.data.flag !== 'removed')
  const showPrompt = !!user?.isAnonymous && hasMyClaim && !promptDismissed

  const meta = [
    plural(wishes.data.length, 'idée'),
    taken > 0 && `${taken} déjà ${taken > 1 ? 'prises' : 'prise'}`,
    l.eventDate && countdownLabel(l.eventDate),
  ].filter((p): p is string => !!p)

  const dismissPrompt = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setPromptDismissed(true)
  }

  return (
    <Screen>
      <OccasionHeader type={l.type} left={<span className="header-pill guest-pill">{myName} · invitée</span>} />
      <ScreenBody>
        <div className="guest-title-row">
          <ListTitle ownerName={l.ownerName} title={l.title} type={l.type} extra={meta} />
          <div className="guest-secret">Chut,<br />{l.ownerName}{ctx.shared ? <><br />ne voient rien</> : ' ne voit rien'}</div>
        </div>
        {changes > 0 && (
          <div className="change-banner" role="status">
            <TriangleAlert size={20} aria-hidden="true" />
            {plural(changes, 'changement')} depuis ta dernière visite
          </div>
        )}
        {wishes.data.length === 0 && removed.length === 0 ? (
          <EmptyState title="Pas encore d'idées" illustration={<EmptyBox />}>
            {l.ownerName} {agree(ctx.shared, "n'a", "n'ont")} rien ajouté pour l'instant. Repasse un peu plus tard.
          </EmptyState>
        ) : (
          <div className="wish-list">
            {wishes.data.map((w) => (
              <GuestCard
                key={w.id}
                wish={w}
                claim={claimByWish.get(w.id)}
                me={me}
                ctx={ctx}
                fresh={fresh.has(w.id)}
                busy={actions.busyId === w.id}
                changed={isChanged(w.data, claimByWish.get(w.id))}
                actions={actions}
              />
            ))}
            {removed.map((c) => (
              <WishCard
                key={c.id}
                className="wish-card--removed"
                title={c.data.wishSnapshot.title}
                imageUrl={c.data.wishSnapshot.imageUrl}
                tag={<div className="state-stack"><RemovedBadge ownerName={l.ownerName} /></div>}
                footer={<Button variant="outline" onClick={() => void actions.ack(c.id, 'removed')}>OK, compris</Button>}
              />
            ))}
          </div>
        )}
      </ScreenBody>
      {showPrompt && (
        <aside className="upgrade-prompt" aria-label="Garde ta réservation">
          <div className="upgrade-prompt__head">
            <span className="hand">Garde ta réservation</span>
            <IconButton label="Fermer" bare onClick={dismissPrompt}><X size={20} /></IconButton>
          </div>
          <p>Sans compte, elle vit seulement sur ce téléphone. Crée un compte pour la retrouver partout.</p>
          <div className="upgrade-prompt__actions">
            <ButtonLink to="/upgrade" state={{ from: `/l/${slug}` }} large>Créer un compte</ButtonLink>
            <Button variant="ghost" large onClick={dismissPrompt}>Plus tard</Button>
          </div>
        </aside>
      )}
      <div className="noted" role="status">{noted && <Tag variant="claimed">C'est noté. Chut !</Tag>}</div>
      <Outlet context={ctx} />
    </Screen>
  )
}

function GuestCard({ wish, claim, me, ctx, fresh, busy, changed, actions }: {
  wish: WithId<Wish>
  claim?: Claim
  me?: string
  ctx: GuestCtx
  fresh: boolean
  busy: boolean
  changed: boolean
  actions: ReturnType<typeof useGuestActions>
}) {
  const nav = useNavigate()
  const { id, data: w } = wish
  const wishPath = `/l/${ctx.slug}/wish/${id}`
  const mine = !!claim && claim.claimerUid === me
  const purchased = claim?.state === 'purchased'
  const who = mine ? 'toi' : claim?.claimerName

  const tone = !claim ? undefined
    : purchased ? 'wish-card--bought'
    : mine ? 'wish-card--mine'
    : 'wish-card--other-claimed'

  const state = claim && (purchased
    ? <div className="state-line"><Check size={16} strokeWidth={2.6} aria-hidden="true" />Acheté par {who}</div>
    : <Tag variant="claimed" still={!fresh}>Pris par {who}</Tag>)

  const tag = (changed || state) && (
    <div className="state-stack">
      {changed && <ChangedBadge change={w.lastChange} />}
      {state}
      {changed && <Button variant="link" onClick={() => void actions.ack(id, 'changed', w.rev)}>OK, compris</Button>}
    </div>
  )

  let footer
  if (!claim) {
    footer = (
      <>
        <Button loading={busy} onClick={() => void actions.claim(id, w)}>Je m'en occupe</Button>
        <Link className="link-btn" to={wishPath} state={{ fromList: true }}>Détails</Link>
      </>
    )
  } else if (mine && !purchased) {
    footer = (
      <>
        <Button className="btn--purchase" loading={busy} onClick={(e) => void actions.markPurchased(id, e)}>J'ai acheté</Button>
        <Button variant="link" onClick={() => nav(wishPath, { state: { fromList: true, release: true } })}>Libérer</Button>
      </>
    )
  } else if (mine) {
    footer = <Button variant="link" onClick={() => void actions.cancelPurchased(id)}>Annuler « acheté »</Button>
  }

  return (
    <WishCard
      className={tone}
      title={w.title}
      domain={claim && !mine ? undefined : w.domain}
      price={w.price}
      imageUrl={w.imageUrl}
      priority={claim ? undefined : w.priority}
      to={wishPath}
      linkState={{ fromList: true }}
      tag={tag}
      footer={footer}
    />
  )
}
