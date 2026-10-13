import { useQuery } from '@tanstack/react-query'
import { collection, collectionGroup, orderBy, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth'
import { getInvite, getPartnerInvite, type Invite, type PartnerInvite } from '../api'
import type { Claim, Joined, ListDoc, Wish } from '../types'
import { keys } from './keys'
import { useLiveDoc, useLiveDocs, type WithId } from './live'

export type Member = { displayName: string; joinedAt?: Timestamp }

/** Profile of the signed-in user. undefined while loading, null when no profile doc. */
export const useProfile = () => useAuth().profile

/** Owner dashboard: lists I own alone or with a partner, newest first. */
export function useMyLists() {
  const uid = useAuth().user?.uid
  return useLiveDocs<ListDoc>(
    keys.myLists(uid ?? ''),
    uid ? () => query(collection(db, 'lists'), where('ownerIds', 'array-contains', uid), orderBy('createdAt', 'desc')) : null,
  )
}

/** Lists doc by id (owner or member). data is null when missing. */
export const useList = (listId: string | undefined) =>
  useLiveDoc<ListDoc>(keys.list(listId ?? ''), listId ? `lists/${listId}` : null)

/** Owner-only: does this account (co-)own the list with this slug? data = the list or null. */
export function useOwnedListBySlug(slug: string | undefined) {
  const { user } = useAuth()
  const uid = user && !user.isAnonymous ? user.uid : undefined
  const q = useLiveDocs<ListDoc>(
    keys.ownedBySlug(uid ?? '', slug ?? ''),
    uid && slug ? () => query(collection(db, 'lists'), where('ownerIds', 'array-contains', uid), where('slug', '==', slug)) : null,
  )
  return { ...q, owned: q.data?.[0] ?? null }
}

export const useWishes = (listId: string | undefined) =>
  useLiveDocs<Wish>(
    keys.wishes(listId ?? ''),
    listId ? () => query(collection(db, 'lists', listId, 'wishes'), orderBy('createdAt', 'desc')) : null,
  )

/** Single wish doc. data is null when it does not exist (deleted). */
export const useWish = (listId: string | undefined, wishId: string | undefined) =>
  useLiveDoc<Wish>(keys.wish(listId ?? '', wishId ?? ''), listId && wishId ? `lists/${listId}/wishes/${wishId}` : null)

/** Owner: who joined (name + joinedAt). Never contains claim info. */
export const useMembers = (listId: string | undefined) =>
  useLiveDocs<Member>(keys.members(listId ?? ''), listId ? () => collection(db, 'lists', listId, 'members') : null)

/** Guest: my own member doc (my display name on this list). */
export function useMyMember(listId: string | undefined) {
  const uid = useAuth().user?.uid
  return useLiveDoc<Member>(keys.member(listId ?? '', uid ?? ''), listId && uid ? `lists/${listId}/members/${uid}` : null)
}

/** Lists I joined as a guest (users/{uid}/joined). */
export function useJoined() {
  const uid = useAuth().user?.uid
  return useLiveDocs<Joined>(keys.joined(uid ?? ''), uid ? () => collection(db, 'users', uid, 'joined') : null)
}

/** The joined entry for an invite slug. joined is null when I am not a member. */
export function useJoinedBySlug(slug: string | undefined) {
  const q = useJoined()
  return { ...q, joined: q.data?.find((j) => j.data.slug === slug)?.data ?? null }
}

/**
 * GUEST views only (rules deny the owner). All claims of a list, live.
 * Index by wishId: `new Map(claims.map((c) => [c.id, c.data]))`.
 */
export const useClaims = (listId: string | undefined) =>
  useLiveDocs<Claim>(keys.claims(listId ?? ''), listId ? () => collection(db, 'lists', listId, 'claims') : null)

/** My claims across all lists (collection group by claimerUid). parentId = listId. Dashboard counts. */
export function useMyClaims() {
  const uid = useAuth().user?.uid
  return useLiveDocs<Claim>(
    keys.myClaims(uid ?? ''),
    uid ? () => query(collectionGroup(db, 'claims'), where('claimerUid', '==', uid)) : null,
  )
}

/** Public invite preview (callable). data is null when the slug is unknown. */
const isNotFound = (err: unknown) => (err as { code?: string } | null)?.code === 'functions/not-found'

export const useInvite = (slug: string | undefined, enabled = true) =>
  useQuery<Invite | null>({
    queryKey: keys.invite(slug ?? ''),
    enabled: !!slug && enabled,
    staleTime: 60_000,
    // Only a real 'not-found' means the link is dead; network or server errors retry and surface as isError.
    retry: (count, err) => !isNotFound(err) && count < 2,
    queryFn: () => getInvite({ slug: slug! }).catch((err) => {
      if (isNotFound(err)) return null
      throw err
    }),
  })

/** Partner link preview (callable). data is null when the link is dead (expired, used, revoked). */
export function usePartnerInvite(token: string | undefined) {
  // Keyed by viewer: isOwner depends on who asks.
  const uid = useAuth().user?.uid ?? ''
  return useQuery<PartnerInvite | null>({
    queryKey: keys.partnerInvite(token ?? '', uid),
    enabled: !!token,
    retry: (count, err) => !isNotFound(err) && count < 2,
    queryFn: () => getPartnerInvite({ token: token! }).catch((err) => {
      if (isNotFound(err)) return null
      throw err
    }),
  })
}

export type { WithId }
