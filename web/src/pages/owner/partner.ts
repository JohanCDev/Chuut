import { HeartHandshake, Link as LinkIcon } from 'lucide-react'
import type { ListDoc } from '../../types'

/** Who owns what on a list, from the viewer's side. */
export function partnerInfo(list: ListDoc, uid: string | undefined) {
  const ids = list.ownerIds ?? [list.ownerId]
  const names = list.ownerNames ?? [list.ownerName]
  const isCreator = list.ownerId === uid
  const shared = list.shared ?? ids.length > 1
  const me = ids.indexOf(uid ?? '')
  const other = shared ? names[me === 0 ? 1 : 0] ?? '' : ''
  const expiresAt = list.partnerInviteExpiresAt?.toDate()
  const pending = isCreator && !shared && !!list.partnerInviteToken && (!expiresAt || expiresAt > new Date())
  return { names, isCreator, shared, other, pending, expiresAt }
}

export const partnerUrl = (token: string) => `${window.location.origin}/partner/${token}`

/** Label and icon of the menu row that opens the sheet. */
export function partnerMenuRow(list: ListDoc, uid: string | undefined) {
  const p = partnerInfo(list, uid)
  if (p.shared) return { icon: HeartHandshake, label: 'Liste à deux' }
  if (p.pending) return { icon: LinkIcon, label: 'Lien partenaire' }
  return null
}
