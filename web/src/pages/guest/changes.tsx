import type { ReactNode } from 'react'
import { Pencil, X } from 'lucide-react'
import { formatPrice } from '../../lib/format'
import type { Wish } from '../../types'

const show = (field: string, v: unknown): ReactNode => {
  if (v == null || v === '') return 'rien'
  return field === 'price' && typeof v === 'number' ? formatPrice(v) : String(v)
}

const LABELS: Record<string, string> = { title: 'Nom', note: 'Petit mot', price: 'Prix' }

/** "Petit mot : bleu marine → gris chiné." Link and photo changes have no readable values. */
function ChangeText({ change }: { change?: Wish['lastChange'] }) {
  if (!change) return <>Ce souhait a changé.</>
  if (change.field === 'url') return <>Le lien a changé.</>
  if (change.field === 'imageUrl') return <>La photo a changé.</>
  return (
    <>{LABELS[change.field] ?? change.field} : <s>{show(change.field, change.from)}</s> → <strong>{show(change.field, change.to)}</strong>.</>
  )
}

export function ChangedBadge({ change }: { change?: Wish['lastChange'] }) {
  return (
    <>
      <span className="pill-state pill-state--changed"><Pencil size={14} aria-hidden="true" />Modifié</span>
      <p className="change-note"><ChangeText change={change} /> Vérifie avant d'acheter.</p>
    </>
  )
}

export function RemovedBadge({ ownerName }: { ownerName: string }) {
  return (
    <>
      <span className="pill-state pill-state--removed"><X size={14} aria-hidden="true" />Retiré par {ownerName}</span>
      <p className="change-note" style={{ color: 'var(--muted)' }}>
        Ta réservation est annulée. Si tu l'as déjà acheté, garde-le pour une autre occasion.
      </p>
    </>
  )
}
