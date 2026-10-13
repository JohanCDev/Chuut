import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react'
import { Link, Outlet, useLocation, useNavigate, useOutlet, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Ellipsis, Pencil, Trash2, UserPlus, UserRound, Users } from 'lucide-react'
import { useAuth } from '../../auth'
import { useDeleteList, useDeleteWish, useRemovePartner } from '../../data/mutations'
import { useList, useWishes } from '../../data/queries'
import {
  BottomBar, Button, ButtonLink, Card, ConfirmDialog, EmptyState, HeaderPill, HeaderRound, HintBanner, IconButton, ListTitle, Menu, MenuItem,
  OccasionHeader, PageHeader, Screen, ScreenBody, Sheet, SidePanel, Spinner, StickyNote, toast, WishCard,
} from '../../ui'
import { cn } from '../../lib/cn'
import { guestCountLabel, wishCountLabel } from '../../lib/format'
import { matches } from '../../lib/search'
import { useBreakpoint, type Breakpoint } from '../../lib/useBreakpoint'
import { useHotkeys } from '../../lib/useHotkeys'
import { SignOutButton } from '../Shell'
import { partnerInfo, partnerMenuRow } from './partner'
import { PartnerRow, PartnerSheet } from './PartnerSheet'
import { ShareSheet } from './ShareSheet'
import './owner.css'

/** Context the list page gives to the wish panel children (WishDetail, WishForm). Undefined on mobile where they run standalone. */
export interface OwnerListCtx {
  bp: Breakpoint
  listId: string
  /** wish ids in the current filtered order, for J/K */
  order: string[]
  /** navigates to the list, keeping ?q and ?f */
  closePanel: () => void
  setTitle: (title: string) => void
  /** footer slot of the panel: children render their footer into it with createPortal */
  footerEl: HTMLElement | null
}

/** Mobile with a child route renders the child's own screen; otherwise the list view wraps the outlet in its panel. */
export function OwnerList() {
  const bp = useBreakpoint()
  const outlet = useOutlet()
  if (bp === 'mobile' && outlet) return outlet
  return <OwnerListView outlet={outlet} bp={bp} />
}

function OwnerListView({ outlet, bp }: { outlet: ReactElement | null; bp: Breakpoint }) {
  const { listId } = useParams()
  const list = useList(listId)
  const wishes = useWishes(listId)
  const loc = useLocation()
  // The dashboard opens the share dialog through router state.
  const [sharing, setSharing] = useState(() => !!(loc.state as { share?: boolean } | null)?.share)
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

  const [params, setParams] = useSearchParams()
  const gridRef = useRef<HTMLUListElement>(null)
  const [panelTitle, setPanelTitle] = useState('Souhait')
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null)
  const [deleteWish, setDeleteWish] = useState<string | null>(null)
  const lastSelected = useRef<string | null>(null)
  const removeWish = useDeleteWish(listId!)
  const items = wishes.data ?? []

  const q = params.get('q') ?? ''
  const fParam = params.get('f')
  const f = fParam === 'coeur' || fParam === 'noprice' ? fParam : null
  const visible = items.filter((w) =>
    matches(q, w.data.title, w.data.domain, w.data.note)
    && (f === 'coeur' ? w.data.priority === 'coeur' : f === 'noprice' ? w.data.price == null : true))
  const order = visible.map((w) => w.id)
  const counts = {
    all: items.length,
    coeur: items.filter((w) => w.data.priority === 'coeur').length,
    noprice: items.filter((w) => w.data.price == null).length,
  }
  const wishMatch = /\/wishes\/([^/]+)(?:\/edit)?$/.exec(loc.pathname)
  const selectedId = wishMatch && wishMatch[1] !== 'new' ? wishMatch[1] : null
  const selectedIdx = selectedId ? order.indexOf(selectedId) : -1
  const tabStop = selectedIdx >= 0 ? selectedId : order[0]
  const base = `/lists/${listId}`
  const dialogOpen = sharing || partnerOpen || confirmDelete || confirmLeave || deleteWish !== null

  const closePanel = () => nav({ pathname: base, search: loc.search })
  /** Id of the wish `d` steps from the selection, clamped to the filtered order. */
  const nextId = (d: number) => {
    if (!order.length) return null
    return order[Math.min(order.length - 1, Math.max(0, selectedIdx < 0 ? 0 : selectedIdx + d))]
  }
  const selectBy = (d: number) => {
    const id = nextId(d)
    if (id) nav({ pathname: `${base}/wishes/${id}`, search: loc.search }, { replace: true })
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
  const onGridKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const d = e.key === 'ArrowRight' ? 1 : -1
    const id = nextId(d)
    selectBy(d)
    if (id) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-wish-id="${id}"] a`)?.focus())
  }

  useHotkeys([
    { key: 'a', label: 'Ajouter un souhait', handler: () => nav({ pathname: `${base}/wishes/new`, search: loc.search }) },
    { key: 's', label: 'Partager', handler: () => setSharing(true) },
    { key: 'j', handler: () => selectBy(1) },
    { key: 'k', handler: () => selectBy(-1) },
    { key: 'e', enabled: !!selectedId, handler: () => nav({ pathname: `${base}/wishes/${selectedId}/edit`, search: loc.search }) },
    { key: 'Escape', inInput: true, enabled: !!outlet && !dialogOpen, handler: closePanel },
  ])

  useEffect(() => {
    if (selectedId) lastSelected.current = selectedId
  }, [selectedId])

  // Pasting a link anywhere on the list opens the new-wish panel with the link prefilled.
  useEffect(() => {
    if (bp === 'mobile') return
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null
      if (el?.closest('input, textarea, [contenteditable]')) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      const text = e.clipboardData?.getData('text').trim() ?? ''
      if (!/^https?:\/\/\S+$/i.test(text)) return
      e.preventDefault()
      nav({ pathname: `/lists/${listId}/wishes/new`, search: loc.search }, { state: { url: text } })
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [bp, listId, loc.search, nav])

  // Clear the share flag so a reload does not reopen the dialog.
  useEffect(() => {
    if ((loc.state as { share?: boolean } | null)?.share) nav({ pathname: loc.pathname, search: loc.search }, { replace: true, state: null })
  }, [loc.pathname, loc.search, loc.state, nav])

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
  const { isCreator, shared, other } = p!
  const partnerRow = partnerMenuRow(data, user?.uid)
  const PartnerIcon = partnerRow?.icon ?? UserPlus

  if (bp === 'mobile') {
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
          onManagePartner={isCreator || shared ? () => { setSharing(false); setPartnerOpen(true) } : undefined}
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

  const ctx: OwnerListCtx = { bp, listId: listId!, order, closePanel, setTitle: setPanelTitle, footerEl }
  const deleting = items.find((w) => w.id === deleteWish)?.data.title ?? ''
  const headerActions = selectedIdx >= 0 ? (
    <>
      <span aria-live="polite">Souhait {selectedIdx + 1} sur {order.length}</span>
      <IconButton label="Souhait précédent" bare disabled={selectedIdx <= 0} onClick={() => selectBy(-1)}><ChevronLeft size={18} /></IconButton>
      <IconButton label="Souhait suivant" bare disabled={selectedIdx >= order.length - 1} onClick={() => selectBy(1)}><ChevronRight size={18} /></IconButton>
    </>
  ) : undefined

  const dialogs = (
    <>
      <ShareSheet
        open={sharing}
        onOpenChange={setSharing}
        listId={listId!}
        list={data}
        onPartner={isCreator && !shared && !p!.pending ? () => { setSharing(false); setPartnerOpen(true) } : undefined}
        onManagePartner={isCreator || shared ? () => { setSharing(false); setPartnerOpen(true) } : undefined}
      />
      <PartnerSheet
        open={partnerOpen}
        onOpenChange={setPartnerOpen}
        listId={listId!}
        list={data}
        onLeave={() => { setPartnerOpen(false); setConfirmLeave(true) }}
      />
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
          () => { nav('/app', { replace: true }); toast('Tu as quitté la liste') },
          () => { toast.error('Impossible de quitter la liste. Réessaie.') },
        )}
      />
      <ConfirmDialog
        open={deleteWish !== null}
        onOpenChange={(o) => { if (!o) setDeleteWish(null) }}
        title={`Supprimer « ${deleting} » ?`}
        description="Il disparaîtra de ta liste. Si quelqu'un avait prévu de l'offrir, il sera prévenu à sa prochaine visite."
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        loading={removeWish.isPending}
        onConfirm={() => removeWish.mutateAsync(deleteWish!).then(
          () => { if (deleteWish === selectedId) closePanel() },
          () => { toast.error('Suppression impossible. Réessaie.') },
        )}
      />
    </>
  )

  return (
    <>
      <div className={cn('owner-split', outlet && 'owner-split--panel')}>
        <div className="owner-split__main">
          <PageHeader
            crumbs={[{ label: 'Mes listes', to: '/app' }, { label: data.title }]}
            search
            actions={
              <>
                <ButtonLink to={{ pathname: `${base}/wishes/new`, search: loc.search }}>Ajouter un souhait<kbd className="kbd">A</kbd></ButtonLink>
                <Button variant="secondary" onClick={() => setSharing(true)}>Partager<kbd className="kbd">S</kbd></Button>
              </>
            }
          />
          <OccasionHeader
            type={data.type}
            compact
            hideBack
            right={
              <div className="header-actions">
                {data.guestCount > 0 && (
                  <HeaderPill to={`${base}/guests`}><Users size={18} aria-hidden="true" />{guestCountLabel(data.guestCount)}</HeaderPill>
                )}
                <Menu label="Menu du compte" trigger={<Ellipsis size={22} />}>
                  {(isCreator || shared) && (
                    <MenuItem onClick={() => setPartnerOpen(true)}>
                      <span className="row-label"><PartnerIcon size={20} aria-hidden="true" />{partnerRow?.label ?? 'Partager avec mon/ma partenaire'}</span>
                    </MenuItem>
                  )}
                  <MenuItem to={`${base}/guests`}>
                    <span className="row-label"><Users size={20} aria-hidden="true" />Invités</span>
                  </MenuItem>
                  <MenuItem to="/app">Mes listes</MenuItem>
                  <MenuItem to="/account">
                    <span className="row-label"><UserRound size={20} aria-hidden="true" />Mon compte</span>
                  </MenuItem>
                  {isCreator ? (
                    <MenuItem danger onClick={() => setConfirmDelete(true)}>Supprimer la liste</MenuItem>
                  ) : (
                    <MenuItem danger onClick={() => setConfirmLeave(true)}>Quitter la liste</MenuItem>
                  )}
                  <SignOutButton />
                </Menu>
              </div>
            }
          />
          <div className="content content--list">
            <ListTitle card ownerName={data.ownerName} title={data.title} eventDate={data.eventDate} wishCount={items.length} type={data.type} />
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
                <FilterChips
                  value={f}
                  counts={counts}
                  onChange={(v) => setParam('f', v)}
                />
                <HintBanner title="Pas de spoiler ici">
                  {shared ? `Ni toi ni ${other} ne verrez qui prend quoi.` : 'Tu ne verras jamais qui prend quoi.'}
                </HintBanner>
                <p className="sr-only" aria-live="polite">
                  {visible.length === 0 ? 'Aucun souhait ne correspond' : wishCountLabel(visible.length)}
                </p>
                {visible.length === 0 ? (
                  <EmptyState
                    title="Aucun souhait ne correspond"
                    action={<Button variant="outline" onClick={clearFilters}>Effacer la recherche</Button>}
                  />
                ) : (
                  <ul className="tile-grid" ref={gridRef} tabIndex={-1} onKeyDown={onGridKey}>
                    {visible.map((w) => (
                      <li key={w.id}>
                        <WishCard
                          layout="tile"
                          id={w.id}
                          selected={w.id === selectedId}
                          linkTabIndex={tabStop === w.id ? 0 : -1}
                          title={w.data.title}
                          domain={w.data.domain}
                          note={w.data.note}
                          price={w.data.price}
                          imageUrl={w.data.imageUrl}
                          priority={w.data.priority}
                          to={`${base}/wishes/${w.id}${loc.search}`}
                          quick={
                            <>
                              <Link to={{ pathname: `${base}/wishes/${w.id}/edit`, search: loc.search }} className="icon-btn" aria-label={`Modifier ${w.data.title}`}>
                                <Pencil size={16} />
                              </Link>
                              <IconButton label={`Supprimer ${w.data.title}`} onClick={() => setDeleteWish(w.id)}><Trash2 size={16} /></IconButton>
                            </>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
        {outlet && (
          <SidePanel
            title={panelTitle}
            onClose={closePanel}
            footerRef={setFooterEl}
            returnFocusTo={() => gridRef.current?.querySelector<HTMLElement>(`[data-wish-id="${lastSelected.current}"] a`) ?? gridRef.current}
            headerActions={headerActions}
          >
            <Outlet context={ctx} />
          </SidePanel>
        )}
      </div>
      {dialogs}
    </>
  )
}

/** Radio group filtering the wish grid by `?f=`. */
function FilterChips({ value, counts, onChange }: {
  value: 'coeur' | 'noprice' | null
  counts: { all: number; coeur: number; noprice: number }
  onChange: (v: 'coeur' | 'noprice' | null) => void
}) {
  const options = [
    { value: null, label: 'Tous', count: counts.all },
    { value: 'coeur', label: 'Coup de cœur', count: counts.coeur },
    { value: 'noprice', label: 'Sans prix', count: counts.noprice },
  ] as const
  return (
    <div role="radiogroup" aria-label="Filtrer les souhaits" className="chips">
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
