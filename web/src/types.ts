import type { Timestamp } from 'firebase/firestore'

export type ListType = 'christmas' | 'birthday' | 'other'
export type Priority = 'bof' | 'jaime' | 'coeur'

export interface Profile {
  displayName?: string
  ageConfirmedAt?: Timestamp
}

export interface ListDoc {
  /** creator: only they delete the list or manage the partner */
  ownerId: string
  /** creator first, then the partner if any (missing on lists not yet backfilled) */
  ownerIds?: string[]
  ownerNames?: string[]
  shared?: boolean
  partnerInviteToken?: string
  partnerInviteExpiresAt?: Timestamp
  type: ListType
  title: string
  eventDate?: string | null
  slug: string
  /** "Anna" or "Anna et Tom" */
  ownerName: string
  wishCount: number
  guestCount: number
}

export interface Wish {
  title: string
  url?: string | null
  domain?: string | null
  price?: number | null
  imageUrl?: string | null
  note?: string | null
  priority: Priority
  rev: number
  lastChange?: { field: string; from: unknown; to: unknown }
}

export interface Claim {
  claimerUid: string
  claimerName: string
  state: 'claimed' | 'purchased'
  seenRev: number
  flag?: 'changed' | 'removed'
  flagAckAt?: Timestamp
  wishSnapshot: { title: string; imageUrl?: string | null }
}

export interface Joined {
  listId: string
  slug: string
  title: string
  type: ListType
  eventDate?: string | null
  ownerName: string
}

export const TYPE_LABEL: Record<ListType, string> = {
  christmas: 'Noël',
  birthday: 'Anniversaire',
  other: 'Autre',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  bof: 'Bof',
  jaime: "J'aime",
  coeur: 'Coup de coeur',
}
