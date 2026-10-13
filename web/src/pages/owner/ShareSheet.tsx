import { Link } from 'react-router-dom'
import { Ellipsis, Mail, MessageCircle, MessageSquare } from 'lucide-react'
import type { ListDoc } from '../../types'
import { useAuth } from '../../auth'
import { agree } from '../../lib/format'
import { Button, Sheet, toast } from '../../ui'
import { partnerInfo } from './partner'

export function ShareSheet({ open, onOpenChange, listId, list, onPartner }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: string
  list: ListDoc
  /** creator of a solo list: offer to invite a partner */
  onPartner?: () => void
}) {
  const { shared, other } = partnerInfo(list, useAuth().user?.uid)
  const url = `${window.location.origin}/l/${list.slug}`
  const message = `${list.ownerName} ${agree(shared, "t'invite à sa liste", "t'invitent à leur liste")} « ${list.title} » sur Chuut : ${url}`
  const canShare = typeof navigator.share === 'function'

  const copy = () => navigator.clipboard.writeText(url).then(
    () => toast('Lien copié'),
    () => toast.error('Copie impossible. Sélectionne le lien pour le copier.'),
  )
  const share = () => navigator.share({ title: list.title, text: message, url }).catch(() => undefined)

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Partager ta liste"
      description={`Envoie le lien à tes proches. Ils choisissent un cadeau sans que ${agree(shared, 'tu le saches', 'vous le sachiez')}.`}
    >
      <div className="share-link">
        <label htmlFor="share-link">Lien de ta liste</label>
        <div className="share-link__row">
          <input id="share-link" className="input" readOnly value={url.replace(/^https?:\/\//, '')} onFocus={(e) => e.target.select()} />
          <Button large onClick={() => void copy()}>Copier</Button>
        </div>
      </div>
      <div className="share-targets">
        <a className="share-target" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={22} aria-hidden="true" />WhatsApp
        </a>
        <a className="share-target" href={`sms:?&body=${encodeURIComponent(message)}`}>
          <MessageSquare size={22} aria-hidden="true" />SMS
        </a>
        <a className="share-target" href={`mailto:?subject=${encodeURIComponent(list.title)}&body=${encodeURIComponent(message)}`}>
          <Mail size={22} aria-hidden="true" />E-mail
        </a>
        {canShare && (
          <button type="button" className="share-target" onClick={() => void share()}>
            <Ellipsis size={22} aria-hidden="true" />Plus…
          </button>
        )}
      </div>
      <div className="hint-banner hint-banner--stack">
        <div className="hand">{shared ? `Ni toi ni ${other} ne verrez qui prend quoi.` : 'Tu ne verras jamais qui prend quoi.'}</div>
        <div className="hint-banner__text">
          Tu vois seulement qui a rejoint ta liste, et quand. <Link to={`/lists/${listId}/guests`}>Voir les invités</Link>
        </div>
      </div>
      {onPartner && (
        <p className="muted small">
          Tu fais cette liste à deux ? <Button variant="link" onClick={onPartner}>Invite ton/ta partenaire</Button>
        </p>
      )}
    </Sheet>
  )
}
