import { useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowUpRight, Check, Heart } from 'lucide-react'
import { useClaims, useWishes } from '../../data/queries'
import { agree, formatDate } from '../../lib/format'
import { Button, PriceBadge, Sheet, SidePanel, Spinner, Tag, WishFallback } from '../../ui'
import { useBreakpoint } from '../../lib/useBreakpoint'
import { useAuth } from '../../auth'
import { useGuestActions, type GuestCtx } from './actions'
import { ChangedBadge, RemovedBadge } from './changes'
import { Lips } from './Lips'

type Mode = 'detail' | 'release' | 'bravo'

/** /l/:slug/wish/:wishId, rendered over the list (child route of the resolver). */
export function WishSheet() {
  const ctx = useOutletContext<GuestCtx>()
  const { wishId = '' } = useParams()
  const nav = useNavigate()
  const loc = useLocation()
  const { user } = useAuth()
  const state = loc.state as { fromList?: boolean; release?: boolean } | null
  const wishes = useWishes(ctx.listId)
  const claims = useClaims(ctx.listId)
  const actions = useGuestActions(ctx)
  const [mode, setMode] = useState<Mode>(state?.release ? 'release' : 'detail')
  const [lifting, setLifting] = useState(false)

  const close = () => (state?.fromList ? nav(-1) : nav(`/l/${ctx.slug}`, { replace: true }))

  const wish = wishes.data?.find((w) => w.id === wishId)?.data
  const claim = claims.data?.find((c) => c.id === wishId)?.data
  const mine = !!claim && claim.claimerUid === user?.uid
  const purchased = claim?.state === 'purchased'
  const removed = !wish && claim?.flag === 'removed' && mine
  const changed = !!wish && mine && !!claim && claim.seenRev < wish.rev
  const title = wish?.title ?? claim?.wishSnapshot.title ?? 'Souhait'
  const ready = !wishes.isPending && !claims.isPending
  const bp = useBreakpoint()

  const confirmRelease = async () => {
    setLifting(true)
    await new Promise((r) => setTimeout(r, 350))
    if (await actions.release(wishId)) close()
    else setLifting(false)
  }

  const body = () => {
    if (!ready) return <Spinner />
    if (mode === 'release') {
      return (
        <>
          <div className="release-preview"><Tag variant="claimed" className={lifting ? 'tag--lift' : undefined} still>Pris par toi</Tag></div>
          <h2 className="sheet__title">Libérer « {title} » ?</h2>
          <p className="muted">Il redevient libre pour les autres invités. Pas de souci, ça arrive. {ctx.ownerName} {agree(ctx.shared, "n'en saura", "n'en sauront")} rien.</p>
          <div className="sheet__actions">
            <Button large full loading={lifting} onClick={() => void confirmRelease()}>Libérer</Button>
            <Button large full variant="secondary" disabled={lifting} onClick={() => (state?.release ? close() : setMode('detail'))}>Je le garde</Button>
          </div>
        </>
      )
    }
    if (mode === 'bravo') {
      return (
        <>
          <div className="bravo">
            <div className="hand">Bravo !</div>
            <p>Il ne reste plus qu'à l'emballer. {ctx.ownerName} {agree(ctx.shared, "n'en saura", "n'en sauront")} rien{ctx.eventDate ? ` jusqu'au ${formatDate(ctx.eventDate)}` : ''}.</p>
          </div>
          <div className="sheet__actions">
            <Button large full variant="secondary" onClick={close}>Retour à la liste</Button>
            <Button variant="link" onClick={() => { void actions.cancelPurchased(wishId); setMode('detail') }}>Annuler « acheté »</Button>
          </div>
        </>
      )
    }
    if (!wish && !removed) {
      return (
        <>
          <h2 className="sheet__title">Ce souhait n'existe plus</h2>
          <p className="muted">{ctx.ownerName} {agree(ctx.shared, "l'a", "l'ont")} retiré de la liste.</p>
          <Button large full variant="secondary" onClick={close}>Retour à la liste</Button>
        </>
      )
    }
    const image = wish?.imageUrl ?? claim?.wishSnapshot.imageUrl
    const link = wish?.url && /^https?:\/\//.test(wish.url) ? wish.url : null
    return (
      <div className="guest-sheet">
        <div className="guest-sheet__media">
          <div className="guest-sheet__img">{image ? <img src={image} alt="" /> : <WishFallback title={title} />}</div>
          {wish?.price != null && <PriceBadge price={wish.price} seed={title} />}
        </div>
        <div>
          {wish?.priority === 'coeur' && (
            <div className="guest-sheet__priority"><Heart size={14} fill="currentColor" aria-hidden="true" />Coup de cœur de {ctx.ownerName}</div>
          )}
          <p className="guest-sheet__title" aria-hidden="true">{title}</p>
        </div>
        {wish?.note && <p className="guest-sheet__note">{wish.note}</p>}
        {link && (
          <a className="guest-sheet__link" href={link} target="_blank" rel="noopener noreferrer">
            Voir sur {wish?.domain ?? 'le site'}<ArrowUpRight size={16} aria-hidden="true" />
          </a>
        )}
        {changed && <div className="state-stack"><ChangedBadge change={wish?.lastChange} /></div>}
        {removed && <div className="state-stack"><RemovedBadge ownerName={ctx.ownerName} /></div>}
        {claim && !removed && (
          <div className="guest-sheet__tags">
            {purchased
              ? <div className="state-line"><Check size={16} strokeWidth={2.6} aria-hidden="true" />Acheté par {mine ? 'toi' : claim.claimerName}</div>
              : <Tag variant="claimed" still>Pris par {mine ? 'toi' : claim.claimerName}</Tag>}
          </div>
        )}
        {actionsFor()}
      </div>
    )
  }

  const actionsFor = () => {
    const busy = actions.busyId === wishId
    if (removed) {
      return <Button large full variant="outline" onClick={() => void actions.ack(wishId, 'removed').then(close)}>OK, compris</Button>
    }
    if (!wish) return null
    if (!claim) {
      return (
        <>
          <Button large full loading={busy} onClick={() => void actions.claim(wishId, wish).then((ok) => ok && close())}>Je m'en occupe</Button>
          <div className="plum-note"><Lips size={22} /><span>Les autres invités verront « Pris par {ctx.myName} ». {ctx.ownerName}, rien du tout.</span></div>
        </>
      )
    }
    if (!mine) {
      return (
        <>
          <p className="muted">Quelqu'un s'en occupe déjà. Il y a d'autres idées sur la liste.</p>
          <Button large full variant="secondary" onClick={close}>Retour à la liste</Button>
        </>
      )
    }
    return (
      <div className="sheet__actions">
        {changed && <Button large full variant="outline" onClick={() => void actions.ack(wishId, 'changed', wish.rev)}>OK, compris</Button>}
        {purchased ? (
          <Button large full variant="outline" onClick={() => void actions.cancelPurchased(wishId)}>Annuler « acheté »</Button>
        ) : (
          <>
            <Button large full className="btn--purchase" loading={busy} onClick={(e) => void actions.markPurchased(wishId, e).then((ok) => ok && setMode('bravo'))}>J'ai acheté</Button>
            <Button large full variant="secondary" onClick={() => setMode('release')}>Je ne le prends plus</Button>
          </>
        )}
      </div>
    )
  }

  if (bp === 'mobile') {
    return (
      <Sheet open onOpenChange={(open) => !open && close()} title={title} hideTitle>
        {body()}
      </Sheet>
    )
  }

  return (
    <SidePanel title={title} onClose={close} returnFocusTo={() => document.querySelector<HTMLElement>(`[data-wish-id="${wishId}"] a`)}>
      {body()}
    </SidePanel>
  )
}
