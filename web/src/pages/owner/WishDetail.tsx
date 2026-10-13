import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { ArrowUpRight, Heart, Info } from 'lucide-react'
import { useDeleteWish } from '../../data/mutations'
import { useWish } from '../../data/queries'
import { Button, ButtonLink, ConfirmDialog, EmptyState, PriceBadge, Spinner, toast, WishFallback } from '../../ui'
import type { OwnerListCtx } from './OwnerList'
import './owner.css'

/** /lists/:listId/wishes/:wishId, shown in the list page side panel on desktop. */
export function WishDetail() {
  const { listId = '', wishId = '' } = useParams()
  const ctx = useOutletContext<OwnerListCtx | undefined>()
  const wish = useWish(listId, wishId)
  const remove = useDeleteWish(listId)
  const { search } = useLocation()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const title = wish.data?.title ?? ''
  const setTitle = ctx?.setTitle
  useEffect(() => {
    if (title) setTitle?.(title)
  }, [setTitle, title])

  if (!ctx) return <Navigate to={`/lists/${listId}/wishes/${wishId}/edit`} replace />
  if (wish.isPending) return <Spinner />
  if (!wish.data) {
    return <EmptyState title="Ce souhait est introuvable" action={<Button variant="outline" onClick={ctx.closePanel}>Retour à la liste</Button>} />
  }

  const { imageUrl, price, priority, url, domain, note } = wish.data
  const link = url && /^https?:\/\//.test(url) ? url : null

  return (
    <>
      <div className="wish-detail">
        <div className="wish-detail__media">
          <div className="wish-detail__img">{imageUrl ? <img src={imageUrl} alt="" /> : <WishFallback title={title} />}</div>
          {price != null && <PriceBadge price={price} seed={title} />}
        </div>
        {priority === 'coeur' && (
          <div className="wish-detail__priority"><Heart size={14} fill="currentColor" aria-hidden="true" />Coup de cœur</div>
        )}
        <h3 className="wish-detail__title">{title}</h3>
        {link && (
          <a className="wish-detail__link" href={link} target="_blank" rel="noopener noreferrer">
            Voir sur {domain ?? 'le site'}<ArrowUpRight size={16} aria-hidden="true" />
          </a>
        )}
        {note && <p className="wish-detail__note">{note}</p>}
        <div className="hint-banner">
          <Info size={20} aria-hidden="true" style={{ flex: 'none' }} />
          <div className="hint-banner__text">Tes invités voient ce souhait. Tu ne sauras jamais s'il est pris.</div>
        </div>
      </div>

      {ctx.footerEl && createPortal(
        <>
          <Button variant="outline" onClick={() => setConfirmDelete(true)}>Supprimer</Button>
          <ButtonLink to={{ pathname: `/lists/${listId}/wishes/${wishId}/edit`, search }}>Modifier<kbd className="kbd">E</kbd></ButtonLink>
        </>,
        ctx.footerEl,
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer « ${title} » ?`}
        description="Il disparaîtra de ta liste. Si quelqu'un avait prévu de l'offrir, il sera prévenu à sa prochaine visite."
        confirmLabel="Supprimer"
        cancelLabel="Garder"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync(wishId).then(
          () => ctx.closePanel(),
          () => toast.error('Suppression impossible. Réessaie.'),
        )}
      />
    </>
  )
}
