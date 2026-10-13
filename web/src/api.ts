import { httpsCallable } from 'firebase/functions'
import { fns } from './firebase'
import type { ListType } from './types'

export interface Invite {
  ownerName: string
  title: string
  type: ListType
  eventDate: string | null
  wishCount: number
  shared?: boolean
}

export interface PartnerInvite {
  listId: string
  ownerName: string
  title: string
  type: ListType
  eventDate: string | null
  wishCount: number
  /** the caller already owns this list */
  isOwner: boolean
}

export interface LinkMeta {
  title?: string
  price?: number
  imageUrl?: string
  domain: string
}

const call = <I, O>(name: string) => {
  const fn = httpsCallable<I, O>(fns, name)
  return async (data: I): Promise<O> => (await fn(data)).data
}

export const getInvite = call<{ slug: string }, Invite>('getInvite')
export const joinList = call<{ slug: string; displayName: string }, { listId: string }>('joinList')
export const fetchLinkMeta = call<{ url: string }, LinkMeta>('fetchLinkMeta')
export const mergeGuest = call<{ oldIdToken: string }, { merged: number }>('mergeGuest')
export const exportMyData = call<Record<string, never>, unknown>('exportMyData')
export const deleteAccount = call<Record<string, never>, { deleted: boolean }>('deleteAccount')
export const deleteList = call<{ listId: string }, { deleted: boolean }>('deleteList')
export const createPartnerInvite = call<{ listId: string }, { token: string; expiresAt: number }>('createPartnerInvite')
export const revokePartnerInvite = call<{ listId: string }, { revoked: boolean }>('revokePartnerInvite')
export const getPartnerInvite = call<{ token: string }, PartnerInvite>('getPartnerInvite')
export const acceptPartnerInvite = call<{ token: string }, { listId: string }>('acceptPartnerInvite')
export const removePartner = call<{ listId: string }, { removed: boolean }>('removePartner')
