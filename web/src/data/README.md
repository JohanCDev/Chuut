# Data layer

All Firebase access goes through `src/data/*`. Pages never call Firestore or callables directly.
React Query is the single cache. Firestore reads are realtime: the first snapshot resolves the query, later snapshots are pushed with `setQueryData` (`staleTime: Infinity`, unsubscribed when the query is garbage-collected or the cache is cleared). The cache is cleared whenever the auth uid changes (sign in/out, merge).

Docs lists come back as `WithId<T>[]` = `{ id, parentId?, data }`. Doc reads return `T | null` (null = does not exist). Each hook returns the normal `useQuery` result (`data`, `isPending`, `isError`).

`keys.ts` is the query key factory. Live queries never need manual invalidation.

## Reads (`data/queries.ts`)

| Hook | Args | Data | Used by |
| --- | --- | --- | --- |
| `useProfile()` | none | `Profile \| null \| undefined` (same as `useAuth().profile`) | Account, Onboarding |
| `useMyLists()` | none | `WithId<ListDoc>[]`, newest first | Dashboard (mine tab) |
| `useList(listId)` | listId | `ListDoc \| null` | OwnerList, Guests, WishForm, GuestList |
| `useOwnedListBySlug(slug)` | slug | query + `owned: WithId<ListDoc> \| null` | Resolver (owner redirect) |
| `useWishes(listId)` | listId | `WithId<Wish>[]`, newest first | OwnerList, GuestList |
| `useWish(listId, wishId)` | both | `Wish \| null` | WishForm (edit), WishSheet |
| `useMembers(listId)` | listId | `WithId<{ displayName }>[]` (id = uid; `joinedAt` is on the doc) | Guests (owner) |
| `useJoined()` | none | `WithId<Joined>[]` | Dashboard (joined tab), Upgrade |
| `useJoinedBySlug(slug)` | slug | query + `joined: Joined \| null` | Resolver, WishSheet |
| `useClaims(listId)` | listId | `WithId<Claim>[]`, id = wishId. GUEST screens only | GuestList, WishSheet |
| `useMyClaims()` | none | `WithId<Claim>[]`, `parentId` = listId | Dashboard joined tab counts |
| `useInvite(slug, enabled?)` | slug | `Invite \| null` (callable, cached 60s) | Resolver, Join |

Never call `useClaims` from an owner screen: rules deny it.

## Mutations (`data/mutations.ts`)

Each returns a `useMutation` result; call `mutate`/`mutateAsync`, use `isPending`, `error`.

| Hook | Variables | Resolves | Notes |
| --- | --- | --- | --- |
| `useSaveProfile()` | `{ displayName, confirmAge? }` | void | Onboarding (confirmAge), Account rename |
| `useCreateList()` | `{ title, type, eventDate? }` | listId | creates list + shareLink |
| `useUpdateList(listId)` | `{ title, type, eventDate? }` | void | |
| `useSaveWish(listId)` | `{ wishId?, input: WishInput }` | wishId | uploads `input.file` first; no wishId = create |
| `useDeleteWish(listId)` | wishId | void | |
| `useFetchLinkMeta()` | url | `LinkMeta` | owner prefill |
| `useJoinList()` | `{ slug, displayName }` | listId | signs in anonymously if needed |
| `useClaim(listId)` | `{ wishId, wish, claimerName }` | void | optimistic; error if already taken |
| `useUnclaim(listId)` | wishId | void | optimistic |
| `useSetPurchased(listId)` | `{ wishId, purchased }` | void | optimistic; false = "Annuler acheté" |
| `useAckFlag(listId)` | `{ wishId, flag, rev? }` | void | removed: deletes claim; changed: sets flagAckAt |
| `useExportData()` | none | JSON payload | |
| `useDeleteAccount()` | none | void | signs out and clears cache |
| `useSignOut()` | none | void | signs out and clears cache |

Auth flows (email/social sign in, link, merge) stay in `src/authActions.ts`.
