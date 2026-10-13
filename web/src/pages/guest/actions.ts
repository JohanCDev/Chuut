import type { MouseEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { useAckFlag, useClaim, useSetPurchased, useUnclaim } from '../../data/mutations'
import { fireConfetti, toast } from '../../ui'
import type { Wish } from '../../types'

export interface GuestCtx {
  slug: string
  listId: string
  ownerName: string
  /** the list has two owners: plural copy ("n'en sauront rien") */
  shared?: boolean
  eventDate?: string | null
  myName: string
  /** a claim or purchase just happened: animate its tag, and show "C'est noté" for claims */
  celebrate: (wishId: string, kind: 'claimed' | 'purchased') => void
}

const ERROR_COPY = 'Une erreur est survenue. Réessaie.'

export function useGuestActions({ listId, myName, celebrate }: Pick<GuestCtx, 'listId' | 'myName' | 'celebrate'>) {
  const claimM = useClaim(listId)
  const purchaseM = useSetPurchased(listId)
  const unclaimM = useUnclaim(listId)
  const ackM = useAckFlag(listId)

  /** One claim per wish: the rules reject a second claim on a wish someone else already took. */
  const claim = async (wishId: string, wish: Wish) => {
    try {
      await claimM.mutateAsync({ wishId, wish, claimerName: myName })
      celebrate(wishId, 'claimed')
      return true
    } catch (e) {
      const taken = e instanceof FirebaseError && e.code === 'permission-denied'
      toast.error(taken ? "Trop tard, quelqu'un vient de prendre ce souhait." : ERROR_COPY)
      return false
    }
  }

  const markPurchased = async (wishId: string, e?: MouseEvent) => {
    fireConfetti(e ? { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } : undefined)
    try {
      await purchaseM.mutateAsync({ wishId, purchased: true })
      celebrate(wishId, 'purchased')
      return true
    } catch {
      toast.error(ERROR_COPY)
      return false
    }
  }

  const cancelPurchased = (wishId: string) =>
    purchaseM.mutateAsync({ wishId, purchased: false }).catch(() => toast.error(ERROR_COPY))

  const release = async (wishId: string) => {
    try {
      await unclaimM.mutateAsync(wishId)
      return true
    } catch {
      toast.error(ERROR_COPY)
      return false
    }
  }

  const ack = (wishId: string, flag: 'changed' | 'removed', rev?: number) =>
    ackM.mutateAsync({ wishId, flag, rev }).catch(() => toast.error(ERROR_COPY))

  return {
    claim, markPurchased, cancelPurchased, release, ack,
    busyId: claimM.isPending ? claimM.variables?.wishId : purchaseM.isPending ? purchaseM.variables?.wishId : undefined,
  }
}
