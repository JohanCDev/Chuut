import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signInAnonymously, signOut } from 'firebase/auth'
import {
  collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../firebase'
import { useAuth } from '../auth'
import {
  acceptPartnerInvite, createPartnerInvite, deleteAccount, deleteList, exportMyData, fetchLinkMeta, joinList,
  removePartner, revokePartnerInvite,
} from '../api'
import type { Claim, ListType, Priority, Wish } from '../types'
import { keys } from './keys'
import type { WithId } from './live'

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
const rand = () => Math.random().toString(36).slice(2, 6)

const uidOrThrow = () => {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('not signed in')
  return uid
}

/** Onboarding and Account: set display name; pass confirmAge on onboarding. */
export function useSaveProfile() {
  const { profile } = useAuth()
  return useMutation({
    mutationFn: ({ displayName, confirmAge }: { displayName: string; confirmAge?: boolean }) =>
      setDoc(doc(db, 'users', uidOrThrow()), {
        displayName: displayName.trim(),
        ...(confirmAge ? { ageConfirmedAt: serverTimestamp() } : {}),
        ...(profile ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true }),
  })
}

/** Create a list and its shareLink. Resolves with the new listId. */
export function useCreateList() {
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ title, type, eventDate }: { title: string; type: ListType; eventDate?: string }) => {
      const ownerId = uidOrThrow()
      const listRef = doc(collection(db, 'lists'))
      const slug = `${slugify(title) || 'liste'}-${rand()}`
      const ownerName = profile?.displayName ?? ''
      const clean = title.trim()
      const batch = writeBatch(db)
      batch.set(listRef, {
        ownerId, ownerIds: [ownerId], ownerNames: [ownerName], shared: false, type, title: clean, eventDate: eventDate || null, slug, ownerName,
        wishCount: 0, guestCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      batch.set(doc(db, 'shareLinks', slug), {
        listId: listRef.id, ownerName, title: clean, type, eventDate: eventDate || null, wishCount: 0,
      })
      await batch.commit()
      return listRef.id
    },
  })
}

/** Creator: new single-use partner link (revokes the previous one). */
export const useCreatePartnerInvite = (listId: string) =>
  useMutation({ mutationFn: () => createPartnerInvite({ listId }) })

export const useRevokePartnerInvite = (listId: string) =>
  useMutation({ mutationFn: () => revokePartnerInvite({ listId }) })

/** Creator removes the partner, or the partner leaves. */
export const useRemovePartner = (listId: string) =>
  useMutation({ mutationFn: () => removePartner({ listId }) })

export const useAcceptPartnerInvite = () =>
  useMutation({ mutationFn: (token: string) => acceptPartnerInvite({ token }).then((r) => r.listId) })

export function useUpdateList(listId: string) {
  return useMutation({
    mutationFn: ({ title, type, eventDate }: { title: string; type: ListType; eventDate?: string }) =>
      updateDoc(doc(db, 'lists', listId), {
        title: title.trim(), type, eventDate: eventDate || null, updatedAt: serverTimestamp(),
      }),
  })
}

export interface WishInput {
  title: string
  url?: string
  domain?: string
  price?: number | null
  imageUrl?: string
  note?: string
  priority: Priority
  /** new image picked by the user (max 2 MB, enforced by storage rules) */
  file?: File | null
}

/** Create (no wishId) or update a wish. Uploads the image first when `file` is set. */
export function useSaveWish(listId: string) {
  return useMutation({
    mutationFn: async ({ wishId, input }: { wishId?: string; input: WishInput }) => {
      const uid = uidOrThrow()
      const id = wishId ?? doc(collection(db, 'lists', listId, 'wishes')).id
      let imageUrl = input.imageUrl || null
      if (input.file) {
        const r = ref(storage, `users/${uid}/wishes/${id}.jpg`)
        await uploadBytes(r, input.file, { contentType: input.file.type })
        imageUrl = await getDownloadURL(r)
      }
      const url = input.url?.trim() || null
      const data = {
        title: input.title.trim(),
        url,
        domain: url ? input.domain || null : null,
        price: input.price ?? null,
        imageUrl,
        note: input.note?.trim() || null,
        priority: input.priority,
        updatedAt: serverTimestamp(),
      }
      const target = doc(db, 'lists', listId, 'wishes', id)
      if (wishId) await updateDoc(target, data)
      else await setDoc(target, { ...data, rev: 0, createdAt: serverTimestamp() })
      return id
    },
  })
}

export function useDeleteWish(listId: string) {
  return useMutation({
    mutationFn: (wishId: string) => deleteDoc(doc(db, 'lists', listId, 'wishes', wishId)),
  })
}

/** Owner: prefill a wish form from a URL (title, price, imageUrl, domain). */
export function useFetchLinkMeta() {
  return useMutation({ mutationFn: (url: string) => fetchLinkMeta({ url }) })
}

/** Guest: enter a list. Signs in anonymously if needed. Resolves with the listId. */
export function useJoinList() {
  return useMutation({
    mutationFn: async ({ slug, displayName }: { slug: string; displayName: string }) => {
      if (!auth.currentUser) await signInAnonymously(auth)
      return (await joinList({ slug, displayName: displayName.trim() })).listId
    },
  })
}

/* Claims (guest only). Optimistic on the live claims cache, rolled back on error. */

function useClaimCache(listId: string) {
  const qc = useQueryClient()
  const key = keys.claims(listId)
  type Cache = WithId<Claim>[] | undefined
  return {
    optimistic: async (change: (docs: WithId<Claim>[]) => WithId<Claim>[]) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Cache>(key)
      if (prev) qc.setQueryData<Cache>(key, change(prev))
      return { prev }
    },
    rollback: (ctx?: { prev: Cache }) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
  }
}

/** "Je m'en occupe". Fails (onError) if someone else claimed first. */
export function useClaim(listId: string) {
  const { user } = useAuth()
  const cache = useClaimCache(listId)
  return useMutation({
    mutationFn: ({ wishId, wish, claimerName }: { wishId: string; wish: Wish; claimerName: string }) =>
      setDoc(doc(db, 'lists', listId, 'claims', wishId), {
        claimerUid: uidOrThrow(),
        claimerName,
        state: 'claimed',
        claimedAt: serverTimestamp(),
        seenRev: wish.rev ?? 0,
        wishSnapshot: { title: wish.title, imageUrl: wish.imageUrl ?? null },
      }),
    onMutate: ({ wishId, wish, claimerName }) =>
      cache.optimistic((docs) => [
        ...docs.filter((d) => d.id !== wishId),
        {
          id: wishId, parentId: listId,
          data: {
            claimerUid: user!.uid, claimerName, state: 'claimed', seenRev: wish.rev ?? 0,
            wishSnapshot: { title: wish.title, imageUrl: wish.imageUrl ?? null },
          },
        },
      ]),
    onError: (_e, _v, ctx) => cache.rollback(ctx),
  })
}

/** Release a claim ("Libérer"), also used to dismiss a removed-wish claim. */
export function useUnclaim(listId: string) {
  const cache = useClaimCache(listId)
  return useMutation({
    mutationFn: (wishId: string) => deleteDoc(doc(db, 'lists', listId, 'claims', wishId)),
    onMutate: (wishId) => cache.optimistic((docs) => docs.filter((d) => d.id !== wishId)),
    onError: (_e, _v, ctx) => cache.rollback(ctx),
  })
}

/** "J'ai acheté" (purchased: true) or "Annuler acheté" (purchased: false). */
export function useSetPurchased(listId: string) {
  const cache = useClaimCache(listId)
  return useMutation({
    mutationFn: ({ wishId, purchased }: { wishId: string; purchased: boolean }) =>
      updateDoc(doc(db, 'lists', listId, 'claims', wishId), purchased
        ? { state: 'purchased', purchasedAt: serverTimestamp() }
        : { state: 'claimed' }),
    onMutate: ({ wishId, purchased }) =>
      cache.optimistic((docs) => docs.map((d) =>
        d.id === wishId ? { ...d, data: { ...d.data, state: purchased ? 'purchased' : 'claimed' } } : d)),
    onError: (_e, _v, ctx) => cache.rollback(ctx),
  })
}

/** "OK, compris" on a changed/removed badge. Removed claims are deleted, changed ones acknowledged. */
export function useAckFlag(listId: string) {
  const cache = useClaimCache(listId)
  return useMutation({
    mutationFn: ({ wishId, flag, rev }: { wishId: string; flag: 'changed' | 'removed'; rev?: number }) => {
      const target = doc(db, 'lists', listId, 'claims', wishId)
      return flag === 'removed' ? deleteDoc(target) : updateDoc(target, { flagAckAt: serverTimestamp(), seenRev: rev ?? 0 })
    },
    onMutate: ({ wishId, flag }) =>
      cache.optimistic((docs) => flag === 'removed'
        ? docs.filter((d) => d.id !== wishId)
        : docs.map((d) => (d.id === wishId ? { ...d, data: { ...d.data, flagAckAt: {} as never } } : d))),
    onError: (_e, _v, ctx) => cache.rollback(ctx),
  })
}

/** Owner list menu: deletes the list and everything under it (server side, owner only). */
export function useDeleteList(listId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => deleteList({ listId }),
    // Drop the live subscriptions on the deleted docs; the dashboard's own list query updates by itself.
    onSuccess: () => {
      for (const key of [keys.list(listId), keys.wishes(listId), keys.members(listId)]) qc.removeQueries({ queryKey: key })
    },
  })
}

/** Account: resolves with the export payload (JSON-serialisable). */
export function useExportData() {
  return useMutation({ mutationFn: () => exportMyData({}) })
}

/** Account: deletes everything, signs out and clears the cache. */
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await deleteAccount({})
      await signOut(auth)
      qc.clear()
    },
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await signOut(auth)
      qc.clear()
    },
  })
}
