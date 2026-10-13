# Shared lists (co-owned wishlists)

Date: 2026-10-12. Status: approved design, pending implementation.

## Goal

Two people (typically a couple) own one wishlist together, for joint gifts
(wedding, housewarming, baby). Both curate it; neither can see claims. Guests
see one list from both, e.g. "Liste de Anna et Tom".

## Decisions

- Max 2 owners per list: the creator and one partner.
- Partner joins through a private partner link, separate from the guest link.
- Link: one active per list, single use, expires after 7 days. Creating a new
  one revokes the previous one.
- Works on any list, new or existing.
- Rights: both owners edit list fields and wishes, see guests, share the guest
  link. Only the creator deletes the list. The creator can remove the partner;
  the partner can leave. Afterwards the list is the creator's alone again.
- If the partner is already a guest on the list: with no claims, the guest
  membership is dropped and they become owner; with any claim, accepting is
  refused ("release your reservations first").
- Partner must be a real (non-anonymous) account with `ageConfirmedAt`.

## Data model

`lists/{l}`:

- `ownerId` (unchanged): the creator. Governs delete and the creator-only
  partner actions.
- `ownerIds: string[]` (new): `[creator]` or `[creator, partner]`. Drives every
  "is owner" check and the dashboard query.
- `ownerNames: string[]` (new): display names, same order as `ownerIds`.
- `ownerName` (unchanged field, new meaning): the display string, `"Anna"` or
  `"Anna et Tom"`. Recomputed by functions when owners change. The existing
  `onListUpdate` trigger already propagates it to `shareLinks` and guests'
  `joined` docs.
- `shared: boolean` (new): `ownerIds.length > 1`, also copied to `shareLinks`
  so the guest Join page (which reads `shareLinks` via `getInvite`) can use
  plural French copy.

`partnerInvites/{token}` (new, functions-only, no client access):
`{listId, createdBy, createdAt, expiresAt, usedAt, usedBy}`. `token` is a
random 32-char URL-safe id. The list also stores `partnerInviteToken` and
`partnerInviteExpiresAt` (absent when no link is pending) so the owner UI can show and revoke the current link; only readable by
owners because the list doc is.

Migration: one-off admin script `functions/scripts/backfillOwners.ts` sets
`ownerIds=[ownerId]`, `ownerNames=[ownerName]`, `shared=false` on every list
lacking them. The web client also tolerates missing `ownerIds` until it runs.

New index: `lists` on `ownerIds` (array-contains) + `createdAt` desc.

## Cloud Functions (callables, europe-west1, App Check as today)

- `createPartnerInvite({listId})`: caller must be `ownerId`, list must have
  one owner. Deletes the previous invite if any, creates a new one, writes
  `partnerInviteToken`. Returns `{token, expiresAt}`.
- `revokePartnerInvite({listId})`: creator only. Deletes invite, clears token.
- `getPartnerInvite({token})`: public preview: `{ownerName, title, type,
  eventDate}`, or `not-found` if missing, used or expired.
- `acceptPartnerInvite({token})`: real account required. In one transaction:
  validate invite (exists, unused, not expired), list exists, caller not
  already an owner, `ownerIds.length < 2`, caller has no claim on the list
  (query `lists/{l}/claims` where `claimerUid == uid`, run before the
  transaction and re-checked inside by doc reads). Then: delete caller's
  `members/{uid}` and `users/{uid}/joined/{l}` (decrement `guestCount` if a
  member existed), append to `ownerIds`/`ownerNames`, recompute `ownerName`,
  set `shared=true`, mark invite used, clear `partnerInviteToken`, set
  `shareLinks/{slug}.shared=true`. Returns `{listId}`.
  Errors: `not-found` (bad/used/expired link), `already-exists` (caller is
  owner), `resource-exhausted` (list full), `failed-precondition` with message
  `has-claims`.
- `removePartner({listId})`: caller is creator or partner. Removes the partner
  from `ownerIds`/`ownerNames`, recomputes `ownerName`, `shared=false`, updates
  `shareLinks`.

Existing code to update:

- `joinList`: refuse when `ownerIds` contains caller (not only `ownerId`).
- `mergeGuest`: treat any owner like the creator.
- `deleteList`: unchanged (creator only).
- `deleteUserData`: lists where the user is creator are deleted as today. Lists
  where the user is partner: run the `removePartner` logic, then clear
  `imageUrl` on wishes whose image is under `users/{uid}/` (their Storage
  files are wiped).
- `exportMyData`: include lists where the user is partner.
- `deleteListCascade`: delete wish images under every owner's prefix.
- `getInvite`: also return `shared`.

## Security rules

- `isOwner(l)`: `request.auth.uid in listDoc(l).data.ownerIds`.
  Claim blindness (`!isOwner`) therefore covers both owners automatically.
- `lists` read: `uid in resource.data.ownerIds || isMember(l)`.
- `lists` create: also require `ownerIds == [uid]`, `ownerNames.size() == 1`,
  `shared == false`, no `partnerInviteToken`.
- `lists` update: any owner, `affectedKeys().hasOnly(['title', 'type',
  'eventDate', 'updatedAt'])`. `ownerName` leaves this list: only functions
  change it now (nothing in the web app updates it today).
- `lists` delete: `ownerId == uid` (unchanged).
- `partnerInvites`: `allow read, write: if false`.
- Wishes, members, claims: unchanged text, new `isOwner`.
- Storage: unchanged. Each owner uploads under `users/{own uid}/wishes/`.

## UI (French, existing design system)

Detailed screens come from the UX pass. Scope:

- Owner list page: "Partager avec mon/ma partenaire" entry, a sheet to create,
  copy/share, revoke the link, see the joined partner, remove or leave.
- `/partner/:token` accept page: preview, sign-in/sign-up gate, accept, error
  states (expired, used, full, has-claims, already owner).
- Dashboard: shared lists appear for both owners with a "Partagée avec X"
  marker.
- Plural copy wherever `ownerName` is the subject on guest screens
  ("ne voient rien", "t'invitent", "leur liste") when `shared`.
- Delete list action hidden for the partner; "Quitter la liste" instead.

## Testing

- `tests/rules.test.mjs`: partner reads list and wishes, creates/edits/deletes
  wishes, cannot read claims, cannot delete list, cannot write `ownerIds`,
  `ownerName`, `shared` or `partnerInviteToken`; nobody reads
  `partnerInvites`; list create rejects bad `ownerIds`.
- Functions, against the emulator: accept happy path; expired, used, full,
  has-claims, already-owner; guest-without-claims becomes owner and
  `guestCount` drops; remove and leave; account deletion of partner and of
  creator.
- Web: build and typecheck; manual run in the emulator of both flows.

## Out of scope

More than 2 owners, email invites, transferring list creation rights, new list
types.
