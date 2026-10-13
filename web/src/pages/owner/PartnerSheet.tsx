import { useState, type ReactNode } from 'react'
import { ChevronRight, Clock, Ellipsis, EyeOff, Link as LinkIcon, Mail, MessageCircle, MessageSquare, Pencil, Send } from 'lucide-react'
import { useAuth } from '../../auth'
import { useCreatePartnerInvite, useRemovePartner, useRevokePartnerInvite } from '../../data/mutations'
import { formatShortDate } from '../../lib/format'
import type { ListDoc } from '../../types'
import { Avatar, AvatarPair, Button, ConfirmDialog, HintBanner, Sheet, toast } from '../../ui'
import { partnerInfo, partnerUrl } from './partner'

function Facts() {
  return (
    <ul className="partner-facts">
      <li><Pencil size={18} aria-hidden="true" />Vous ajoutez et modifiez les souhaits tous les deux.</li>
      <li><Send size={18} aria-hidden="true" />Vous partagez le même lien avec vos proches.</li>
      <li><EyeOff size={18} aria-hidden="true" />Aucun de vous deux ne voit qui offre quoi.</li>
    </ul>
  )
}

/** Status row under the list title: shown once a partner link is pending or a partner joined. */
export function PartnerRow({ list, onOpen }: { list: ListDoc; onOpen: () => void }) {
  const { user } = useAuth()
  const p = partnerInfo(list, user?.uid)
  if (!p.shared && !p.pending) return null
  return (
    <div className="list-group">
      {p.shared ? (
        <button type="button" className="list-row" onClick={onOpen} aria-label={`Liste gérée avec ${p.other}, voir les options`}>
          <span className="row-label"><AvatarPair names={p.names} />Avec {p.other}</span>
          <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
        </button>
      ) : (
        <button type="button" className="list-row" onClick={onOpen} aria-label="Lien partenaire en attente, gérer le lien">
          <span className="row-label"><LinkIcon size={20} aria-hidden="true" />Lien partenaire en attente</span>
          <span className="list-row__value">
            {p.expiresAt && `jusqu'au ${formatShortDate(p.expiresAt)}`}
            <ChevronRight size={20} aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  )
}

export function PartnerSheet({ open, onOpenChange, listId, list, onLeave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: string
  list: ListDoc
  /** partner view: ask to leave (owner page holds the confirm dialog) */
  onLeave: () => void
}) {
  const { user } = useAuth()
  const p = partnerInfo(list, user?.uid)
  const create = useCreatePartnerInvite(listId)
  const revoke = useRevokePartnerInvite(listId)
  const remove = useRemovePartner(listId)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const newLink = (again: boolean) => create.mutateAsync().then(
    () => { if (again) toast("Nouveau lien créé. L'ancien ne marche plus.") },
    () => toast.error('Impossible de créer le lien. Réessaie.'),
  )

  let description: string
  let body: ReactNode
  if (p.shared && p.isCreator) {
    description = `Tu gères cette liste avec ${p.other}.`
    body = (
      <>
        <div className="list-group">
          <div className="list-row guest-row">
            <Avatar name={p.other} />
            <div className="guest-row__text"><strong>{p.other}</strong><div className="guest-row__meta">Peut ajouter, modifier et partager</div></div>
          </div>
        </div>
        <HintBanner title="Pas de spoiler, pour personne">Ni toi ni {p.other} ne verrez qui prend quoi.</HintBanner>
        <Button variant="danger" large full onClick={() => setConfirmRemove(true)}>Retirer {p.other} de la liste</Button>
      </>
    )
  } else if (p.shared) {
    description = `Tu gères cette liste avec ${p.other}. C'est ${p.other} qui l'a créée.`
    body = (
      <>
        <div className="list-group">
          <div className="list-row guest-row">
            <Avatar name={p.other} />
            <div className="guest-row__text"><strong>{p.other}</strong><div className="guest-row__meta">A créé la liste</div></div>
          </div>
        </div>
        <HintBanner title="Pas de spoiler, pour personne">Ni toi ni {p.other} ne verrez qui prend quoi.</HintBanner>
        <Button variant="danger" large full onClick={onLeave}>Quitter la liste</Button>
      </>
    )
  } else if (p.pending) {
    description = "Envoie ce lien à ton/ta partenaire, et à personne d'autre."
    body = <PendingLink list={list} expiresAt={p.expiresAt}
      onNew={() => void newLink(true)} creating={create.isPending}
      onRevoke={() => revoke.mutateAsync().then(() => toast('Lien annulé'), () => toast.error("Impossible d'annuler le lien. Réessaie."))}
      revoking={revoke.isPending} />
  } else {
    description = 'Invite ton/ta partenaire à gérer cette liste avec toi.'
    body = (
      <>
        <Facts />
        <Button large full loading={create.isPending} onClick={() => void newLink(false)}>Créer le lien partenaire</Button>
        <p className="muted small">Le lien marche une seule fois, pendant 7 jours.</p>
      </>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title="Liste à deux" description={description}>
        <div className="partner-sheet">{body}</div>
      </Sheet>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Retirer ${p.other} ?`}
        description={`${p.other} ne pourra plus voir ni modifier « ${list.title} ». Les souhaits ajoutés restent sur la liste. Tu pourras l'inviter à nouveau.`}
        confirmLabel={`Retirer ${p.other}`}
        cancelLabel={`Garder ${p.other}`}
        loading={remove.isPending}
        onConfirm={() => {
          const name = p.other
          return remove.mutateAsync().then(
            () => { setConfirmRemove(false); toast(`${name} ne fait plus partie de la liste`) },
            () => toast.error(`Impossible de retirer ${name}. Réessaie.`),
          )
        }}
      />
    </>
  )
}

function PendingLink({ list, expiresAt, onNew, creating, onRevoke, revoking }: {
  list: ListDoc
  expiresAt?: Date
  onNew: () => void
  creating: boolean
  onRevoke: () => void
  revoking: boolean
}) {
  const url = partnerUrl(list.partnerInviteToken!)
  const message = `On fait notre liste « ${list.title} » à deux sur Chuut ? Ce lien est rien que pour toi (valable 7 jours) : ${url}`
  const canShare = typeof navigator.share === 'function'
  const copy = () => navigator.clipboard.writeText(url).then(
    () => toast('Lien copié'),
    () => toast.error('Copie impossible. Sélectionne le lien pour le copier.'),
  )
  const share = () => navigator.share({ title: list.title, text: message, url }).catch(() => undefined)

  return (
    <>
      <div className="share-link">
        <label htmlFor="partner-link">Lien partenaire</label>
        <div className="share-link__row">
          <input id="partner-link" className="input" readOnly value={url.replace(/^https?:\/\//, '')} onFocus={(e) => e.target.select()} />
          <Button large onClick={() => void copy()}>Copier</Button>
        </div>
      </div>
      <p className="muted small partner-expiry">
        <Clock size={16} aria-hidden="true" />
        {expiresAt ? `Valable jusqu'au ${formatShortDate(expiresAt)}, une seule fois.` : 'Valable 7 jours après sa création, une seule fois.'}
      </p>
      <div className="share-targets">
        <a className="share-target" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={22} aria-hidden="true" />WhatsApp
        </a>
        <a className="share-target" href={`sms:?&body=${encodeURIComponent(message)}`}>
          <MessageSquare size={22} aria-hidden="true" />SMS
        </a>
        <a className="share-target" href={`mailto:?subject=${encodeURIComponent(`Notre liste « ${list.title} »`)}&body=${encodeURIComponent(message)}`}>
          <Mail size={22} aria-hidden="true" />E-mail
        </a>
        {canShare && (
          <button type="button" className="share-target" onClick={() => void share()}>
            <Ellipsis size={22} aria-hidden="true" />Plus…
          </button>
        )}
      </div>
      <div className="hint-banner hint-banner--stack">
        <div className="hand">Rien que pour ton/ta partenaire.</div>
        <div className="hint-banner__text">Ce lien donne les mêmes droits que toi sur la liste. Ne le mets pas dans le groupe de famille.</div>
      </div>
      <div className="sheet__actions">
        <Button variant="outline" large full loading={creating} onClick={onNew}>Créer un nouveau lien</Button>
        <Button variant="link" loading={revoking} onClick={onRevoke}>Annuler le lien</Button>
      </div>
    </>
  )
}
