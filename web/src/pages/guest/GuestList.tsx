import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Check, TriangleAlert, X } from 'lucide-react'
import { useAuth } from '../../auth'
import { useClaims, useInvite, useJoinedBySlug, useList, useMyMember, useOwnedListBySlug, useWishes } from '../../data/queries'
import type { WithId } from '../../data/live'
import { cn } from '../../lib/cn'
import { agree, countdownLabel, plural, wishCountLabel } from '../../lib/format'
import { matches } from '../../lib/search'
import { useBreakpoint } from '../../lib/useBreakpoint'
import { useHotkeys } from '../../lib/useHotkeys'
import type { Claim, Joined, Wish } from '../../types'
import {
  Button, ButtonLink, EmptyBox, EmptyState, GuestShell, IconButton, ListTitle, OccasionHeader, PageHeader, Screen, ScreenBody, Spinner, Tag, WishCard,
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

/** Chip filters on the guest grid (`?f=`); any other value shows every wish. */
const GUEST_FILTERS = ['free', 'mine', 'bought', 'changed'] as const
type GuestFilter = (typeof GUEST_FILTERS)[number]

/** The owner changed the wish after this guest last saw it. */
const changedFor = (w: Wish, c: Claim | undefined, me?: string) =>
  !!c && c.claimerUid === me && c.flag !== 'removed' && c.seenRev < w.rev

/** Whether a wish's claim passes a chip filter. `changed` comes from `changedFor`. */
const passes = (f: GuestFilter | null, c: Claim | undefined, changed: boolean, me?: string) => {
  if (f === 'free') return !c
  if (f === 'mine') return !!c && c.claimerUid === me && c.state !== 'purchased'
  if (f === 'bought') return c?.state === 'purchased'
  if (f === 'changed') return changed
  return true
}

/** Wishes passing the `?q=` search and the `?f=` chip. */
const filterWishes = (items: WithId<Wish>[], byWish: Map<string, Claim>, me: string | undefined, q: string, f: GuestFilter | null) =>
  items.filter((w) => {
    const c = byWish.get(w.id)
    return matches(q, w.data.title, w.data.domain) && passes(f, c, changedFor(w.data, c, me), me)
  })

function GuestList({ slug, joined }: { slug: string; joined: Joined }) {
  const { user } = useAuth()
  const bp = useBreakpoint()
  const nav = useNavigate()
  const loc = useLocation()
  const [params, setParams] = useSearchParams()
  const gridRef = useRef<HTMLUListElement>(null)
  const listId = joined.listId
  const list = useList(listId)
  const wishes = useWishes(listId)
  const claims = useClaims(listId)
  const member = useMyMember(listId)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())
  const [noted, setNoted] = useState(false)
  const [lastClaimed, setLastClaimed] = useState<string | null>(null)
  const [promptDismissed, setPromptDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const me = user?.uid
  const sel = /\/wish\/([^/]+)$/.exec(loc.pathname)?.[1] ?? null

  useEffect(() => {
    if (!noted) return
    const t = setTimeout(() => setNoted(false), bp === 'mobile' ? 3500 : 5000)
    return () => clearTimeout(t)
  }, [noted, bp])

  const celebrate = useCallback((wishId: string, kind: 'claimed' | 'purchased') => {
    setFresh((s) => new Set(s).add(wishId))
    if (kind === 'claimed') {
      setLastClaimed(wishId)
      setNoted(true)
    }
  }, [setFresh, setLastClaimed, setNoted])

  const l = list.data ?? joined
  const myName = member.data?.displayName ?? 'Invité'
  const ctx: GuestCtx = { slug, listId, ownerName: l.ownerName, shared: list.data?.shared, eventDate: l.eventDate, myName, celebrate }
  const actions = useGuestActions(ctx)

  const q = params.get('q') ?? ''
  const fParam = params.get('f')
  const f = GUEST_FILTERS.find((x) => x === fParam) ?? null
  /** Wishes shown in the grid. Reads the query data when called, so the hotkeys can sit above the early returns. */
  const visibleWishes = () => {
    const byWish = new Map((claims.data ?? []).map((c) => [c.id, c.data]))
    return filterWishes(wishes.data ?? [], byWish, me, q, f)
  }
  const setParam = (key: string, value: string | null) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }
  const clearFilters = () => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      next.delete('f')
      return next
    }, { replace: true })
  }
  /** Selects the wish `d` steps away in the filtered order (clamped, no wrap). */
  const stepTo = (d: number) => {
    const ids = visibleWishes().map((w) => w.id)
    if (!ids.length) return null
    const i = sel ? ids.indexOf(sel) : -1
    const id = ids[Math.min(ids.length - 1, Math.max(0, i < 0 ? 0 : i + d))]
    nav({ pathname: `/l/${slug}/wish/${id}`, search: loc.search }, { replace: true, state: { fromList: true } })
    return id
  }
  const claimOf = (id: string) => claims.data?.find((c) => c.id === id)?.data

  useHotkeys([
    { key: 'j', handler: () => { stepTo(1) } },
    { key: 'k', handler: () => { stepTo(-1) } },
    {
      key: 'r',
      handler: () => {
        if (!sel || claimOf(sel)) return
        const w = wishes.data?.find((x) => x.id === sel)
        if (w) void actions.claim(sel, w.data)
      },
    },
    {
      key: 'b',
      handler: () => {
        const c = sel ? claimOf(sel) : undefined
        if (sel && c && c.claimerUid === me && c.state !== 'purchased') void actions.markPurchased(sel)
      },
    },
    {
      key: 'Escape',
      inInput: true,
      enabled: !!sel,
      handler: () => {
        if ((loc.state as { fromList?: boolean } | null)?.fromList) nav(-1)
        else nav({ pathname: `/l/${slug}`, search: loc.search }, { replace: true })
      },
    },
  ])

  if (wishes.isError || claims.isError) return <NotFound />
  // Wait for the list too: joined docs carry no `shared`, so copy would flash singular.
  if (wishes.isPending || claims.isPending || member.isPending || list.isPending) return <Spinner page />

  const claimByWish = new Map(claims.data.map((c) => [c.id, c.data]))
  const wishIds = new Set(wishes.data.map((w) => w.id))
  const removed = claims.data.filter((c) => c.data.claimerUid === me && c.data.flag === 'removed' && !wishIds.has(c.id))
  const isChanged = (w: Wish, c?: Claim) => changedFor(w, c, me)
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

  if (bp === 'mobile') return (
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

  const account = !!user && !user.isAnonymous
  const visible = visibleWishes()
  const order = visible.map((w) => w.id)
  const tabStop = sel && order.includes(sel) ? sel : order[0]
  const countOf = (k: GuestFilter) => wishes.data.filter((w) => passes(k, claimByWish.get(w.id), isChanged(w.data, claimByWish.get(w.id)), me)).length
  const counts = { all: wishes.data.length, free: countOf('free'), mine: countOf('mine'), bought: countOf('bought'), changed: countOf('changed') }
  const onGridKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const id = stepTo(e.key === 'ArrowRight' ? 1 : -1)
    if (id) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-wish-id="${id}"] a`)?.focus())
  }

  return (
    <GuestShell>
      <div className={cn('owner-split', sel && 'owner-split--panel')}>
        <div className="owner-split__main">
          <PageHeader
            crumbs={account ? [{ label: 'Listes rejointes', to: '/app?tab=joined' }, { label: l.title }] : [{ label: l.title }]}
            search
          />
          <OccasionHeader type={l.type} compact left={<span className="header-pill guest-pill">{myName} · invitée</span>} />
          <div className="content content--list">
            <div className="guest-title-row">
              <ListTitle card ownerName={l.ownerName} title={l.title} type={l.type} extra={meta} />
              <div className="guest-secret">Chut,<br />{l.ownerName}{ctx.shared ? <><br />ne voient rien</> : ' ne voit rien'}</div>
            </div>
            {changes > 0 && (
              <div className="change-banner" role="status">
                <TriangleAlert size={20} aria-hidden="true" />
                {plural(changes, 'changement')} depuis ta dernière visite
                {changedCount > 0 && <Button variant="link" onClick={() => setParam('f', 'changed')}>Voir</Button>}
              </div>
            )}
            {wishes.data.length === 0 && removed.length === 0 ? (
              <EmptyState title="Pas encore d'idées" illustration={<EmptyBox />}>
                {l.ownerName} {agree(ctx.shared, "n'a", "n'ont")} rien ajouté pour l'instant. Repasse un peu plus tard.
              </EmptyState>
            ) : (
              <>
                <GuestChips value={f} counts={counts} onChange={(v) => setParam('f', v)} />
                <p className="sr-only" aria-live="polite">
                  {visible.length === 0 ? 'Aucune idée ne correspond' : wishCountLabel(visible.length)}
                </p>
                {visible.length === 0 && wishes.data.length > 0 && (
                  <EmptyState
                    title="Aucune idée ne correspond"
                    action={<Button variant="outline" onClick={clearFilters}>Effacer la recherche</Button>}
                  />
                )}
                {(visible.length > 0 || removed.length > 0) && (
                  <ul className="tile-grid" ref={gridRef} tabIndex={-1} onKeyDown={onGridKey}>
                    {visible.map((w) => (
                      <li key={w.id}>
                        <GuestCard
                          wish={w}
                          claim={claimByWish.get(w.id)}
                          me={me}
                          ctx={ctx}
                          fresh={fresh.has(w.id)}
                          busy={actions.busyId === w.id}
                          changed={isChanged(w.data, claimByWish.get(w.id))}
                          actions={actions}
                          layout="tile"
                          selected={w.id === sel}
                          linkTabIndex={tabStop === w.id ? 0 : -1}
                        />
                      </li>
                    ))}
                    {removed.map((c) => (
                      <li key={c.id}>
                        <WishCard
                          className="wish-card--removed"
                          title={c.data.wishSnapshot.title}
                          imageUrl={c.data.wishSnapshot.imageUrl}
                          tag={<div className="state-stack"><RemovedBadge ownerName={l.ownerName} /></div>}
                          footer={<Button variant="outline" onClick={() => void actions.ack(c.id, 'removed')}>OK, compris</Button>}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
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
          <div className="noted" role="status">
            {noted && <Tag variant="claimed">C'est noté. Chut !</Tag>}
            {noted && lastClaimed && (
              <Button variant="link" onClick={() => { void actions.release(lastClaimed); setNoted(false) }}>Annuler</Button>
            )}
          </div>
        </div>
        <Outlet context={ctx} />
      </div>
    </GuestShell>
  )
}

/** Radio group filtering the guest grid by `?f=`. The "Modifiées" chip shows only when something changed. */
function GuestChips({ value, counts, onChange }: {
  value: GuestFilter | null
  counts: Record<GuestFilter | 'all', number>
  onChange: (v: GuestFilter | null) => void
}) {
  const options: { value: GuestFilter | null; label: string; count: number }[] = [
    { value: null, label: 'Toutes', count: counts.all },
    { value: 'free', label: 'Libres', count: counts.free },
    { value: 'mine', label: 'Prises par moi', count: counts.mine },
    { value: 'bought', label: 'Achetées', count: counts.bought },
    ...(counts.changed > 0 ? [{ value: 'changed' as const, label: 'Modifiées', count: counts.changed }] : []),
  ]
  return (
    <div role="radiogroup" aria-label="Filtrer les idées" className="chips">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className="chip"
          onClick={() => onChange(o.value)}
        >
          {o.label} · {o.count}
        </button>
      ))}
    </div>
  )
}

function GuestCard({ wish, claim, me, ctx, fresh, busy, changed, actions, layout, selected, linkTabIndex }: {
  wish: WithId<Wish>
  claim?: Claim
  me?: string
  ctx: GuestCtx
  fresh: boolean
  busy: boolean
  changed: boolean
  actions: ReturnType<typeof useGuestActions>
  /** `tile` for the desktop grid; default is the mobile row */
  layout?: 'row' | 'tile'
  selected?: boolean
  linkTabIndex?: number
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
      layout={layout}
      selected={selected}
      id={layout === 'tile' ? id : undefined}
      linkTabIndex={linkTabIndex}
    />
  )
}
