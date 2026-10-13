import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Ellipsis, Pencil, UserPlus, UserRound, Users } from 'lucide-react'
import { useAuth } from '../../auth'
import { useDeleteList, useRemovePartner } from '../../data/mutations'
import { useList, useWishes } from '../../data/queries'
import {
  BottomBar, Button, ButtonLink, Card, ConfirmDialog, EmptyState, HeaderPill, HeaderRound, HintBanner, ListTitle, OccasionHeader,
  Screen, ScreenBody, Sheet, Spinner, StickyNote, toast, WishCard,
} from '../../ui'
import { guestCountLabel } from '../../lib/format'
import { SignOutButton } from '../Shell'
import { partnerInfo, partnerMenuRow } from './partner'
import { PartnerRow, PartnerSheet } from './PartnerSheet'
import { ShareSheet } from './ShareSheet'
import './owner.css'

export function OwnerList() {
  const { listId } = useParams()
  const list = useList(listId)
  const wishes = useWishes(listId)
  const [sharing, setSharing] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [partnerOpen, setPartnerOpen] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const nav = useNavigate()
  const remove = useDeleteList(listId!)
  const leave = useRemovePartner(listId!)
  const { user } = useAuth()
  const joinedName = useRef<string | null>(null)
  const p = list.data ? partnerInfo(list.data, user?.uid) : null

  // Tell the creator when the partner joins while the page is open.
  const joined = p?.isCreator && p.shared ? p.other : p ? '' : null
  useEffect(() => {
    if (joined === null) return
    if (joinedName.current === '' && joined) toast(`${joined} a rejoint la liste`)
    joinedName.current = joined
  }, [joined])

  if (list.isPending || wishes.isPending) return <Spinner page />
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
  const items = wishes.data ?? []
  const { isCreator, shared, other } = p!
  const partnerRow = partnerMenuRow(data, user?.uid)
  const PartnerIcon = partnerRow?.icon ?? UserPlus

  return (
    <Screen>
      <OccasionHeader
        type={data.type}
        backTo="/app"
        right={
          <div className="header-actions">
            {data.guestCount > 0 && (
              <HeaderPill to={`/lists/${listId}/guests`}><Users size={18} aria-hidden="true" />{guestCountLabel(data.guestCount)}</HeaderPill>
            )}
            <HeaderRound label="Menu du compte" onClick={() => setMenu(true)}><Ellipsis size={22} /></HeaderRound>
          </div>
        }
      />
      <ScreenBody>
        <ListTitle ownerName={data.ownerName} title={data.title} eventDate={data.eventDate} wishCount={items.length} type={data.type} />
        <PartnerRow list={data} onOpen={() => setPartnerOpen(true)} />
        {items.length === 0 ? (
          <>
            <div className="wish-list">
              <Card dashed />
              <Card dashed className="card--faint" />
            </div>
            <StickyNote arrow="down">psst… ajoute ta première envie. Un lien suffit.</StickyNote>
          </>
        ) : (
          <>
            <HintBanner title="Pas de spoiler ici">
              {shared ? `Ni toi ni ${other} ne verrez qui prend quoi.` : 'Tu ne verras jamais qui prend quoi.'}
            </HintBanner>
            <div className="wish-list">
              {items.map((w) => (
                <WishCard
                  key={w.id}
                  title={w.data.title}
                  domain={w.data.domain}
                  note={w.data.note}
                  price={w.data.price}
                  imageUrl={w.data.imageUrl}
                  priority={w.data.priority}
                  to={`/lists/${listId}/wishes/${w.id}/edit`}
                  action={<Link to={`/lists/${listId}/wishes/${w.id}/edit`} className="icon-btn icon-btn--bare" aria-label={`Modifier ${w.data.title}`}><Pencil size={18} /></Link>}
                />
              ))}
            </div>
          </>
        )}
      </ScreenBody>
      <BottomBar>
        <ButtonLink to={`/lists/${listId}/wishes/new`} large>Ajouter un souhait</ButtonLink>
        <Button large variant="secondary" onClick={() => setSharing(true)}>Partager</Button>
      </BottomBar>

      <ShareSheet
        open={sharing}
        onOpenChange={setSharing}
        listId={listId!}
        list={data}
        onPartner={isCreator && !shared && !p!.pending ? () => { setSharing(false); setPartnerOpen(true) } : undefined}
      />
      <PartnerSheet
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        listId={listId!}
        list={data}
        onLeave={() => { setPartnerOpen(false); setConfirmLeave(true) }}
      />

      <Sheet open={menu} onOpenChange={setMenu} title="Menu" hideTitle>
        <div className="list-group">
          {(isCreator || shared) && (
            <button type="button" className="list-row" onClick={() => { setMenu(false); setPartnerOpen(true) }}>
              <span className="row-label"><PartnerIcon size={20} aria-hidden="true" />{partnerRow?.label ?? 'Partager avec mon/ma partenaire'}</span>
              <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
            </button>
          )}
          <Link to={`/lists/${listId}/guests`} className="list-row">
            <span className="row-label"><Users size={20} aria-hidden="true" />Invités</span>
            <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
          <Link to="/app" className="list-row">
            Mes listes
            <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
          <Link to="/account" className="list-row">
            <span className="row-label"><UserRound size={20} aria-hidden="true" />Mon compte</span>
            <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
          {isCreator ? (
            <button type="button" className="list-row list-row--danger" onClick={() => { setMenu(false); setConfirmDelete(true) }}>
              Supprimer la liste
            </button>
          ) : (
            <button type="button" className="list-row list-row--danger" onClick={() => { setMenu(false); setConfirmLeave(true) }}>
              Quitter la liste
            </button>
          )}
        </div>
        <SignOutButton />
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer « ${data.title} » ?`}
        description={shared
          ? `La liste, ses souhaits et le lien de partage disparaissent pour tout le monde, ${other} compris. C'est définitif.`
          : "La liste, ses souhaits et le lien de partage disparaissent pour tout le monde. C'est définitif."}
        confirmLabel="Supprimer la liste"
        cancelLabel="Garder"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync().then(
          () => { toast('Liste supprimée'); nav('/app', { replace: true }) },
          () => { toast.error('Impossible de supprimer la liste. Réessaie.') },
        )}
      />

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Quitter « ${data.title} » ?`}
        description={`Tu ne pourras plus voir ni modifier cette liste. Les souhaits que tu as ajoutés y restent. Pour revenir, ${other} devra t'envoyer un nouveau lien.`}
        confirmLabel="Quitter la liste"
        cancelLabel="Rester"
        loading={leave.isPending}
        onConfirm={() => leave.mutateAsync().then(
          // Leave the page before the list listener loses access.
          () => { nav('/app', { replace: true }); toast('Tu as quitté la liste') },
          () => { toast.error('Impossible de quitter la liste. Réessaie.') },
        )}
      />
    </Screen>
  )
}
