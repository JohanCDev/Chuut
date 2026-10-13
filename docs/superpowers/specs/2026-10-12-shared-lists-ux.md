# Shared lists: UX and UI

Date: 2026-10-12. Companion to `2026-10-12-shared-lists-design.md` (data model, functions and decisions are fixed there). This doc only specifies screens, states, copy and components.

Conventions used below:

- `me` = current uid. `isCreator = list.ownerId === me`. `isShared = list.shared === true` (fallback `(list.ownerIds?.length ?? 1) > 1`).
- `other` = the other owner's name: `ownerNames[ownerIds.indexOf(me) === 0 ? 1 : 0]`. In examples, Anna is the creator, Tom the partner.
- `pending = isCreator && !isShared && !!list.partnerInviteToken`.
- Partner link URL: `${origin}/partner/${token}`.
- All copy in French, "tu", no em-dashes, every state = icon + label (UI kit rules). Owner screens never use plum.

## 1. Entry points on the owner list page (`OwnerList.tsx`)

Most lists are solo, so the page stays calm when there is no partner: no inline element, the entry lives in the menu and the share sheet. Once a link exists or a partner joined, a status row appears under the title.

### 1.1 Status row (new `PartnerRow`, under `ListTitle`, above `HintBanner`)

Markup reuses the Account row pattern: `<div className="list-group"><button className="list-row">` + `.row-label` + `.list-row__value` with `ChevronRight`. Tap opens `PartnerSheet`.

| State | Viewer | Shown | Left (`row-label`) | Right (`list-row__value`) |
|---|---|---|---|---|
| No partner, no link | creator | hidden | | |
| Link pending | creator | yes | `Link` icon + "Lien partenaire en attente" | "jusqu'au {formatShortDate(expiresAt)}" if known, else nothing; + chevron |
| Partner joined | creator | yes | `AvatarPair` (Anna, Tom) + "Avec {other}" | chevron |
| Partner joined | partner | yes | `AvatarPair` (Anna, Tom) + "Avec {other}" | chevron |

`aria-label` on the button: pending "Lien partenaire en attente, gérer le lien"; joined "Liste gérée avec {other}, voir les options".

Live change: when `ownerIds.length` goes 1 -> 2 while the creator is on the page (keep previous length in a ref), `toast('{other} a rejoint la liste')`.

### 1.2 Menu sheet (existing `Sheet` "Menu" in `OwnerList.tsx`)

Rows in order. New rows use the same `list-row` + `row-label` + icon pattern.

| Row | Creator, solo | Creator, pending | Creator, shared | Partner |
|---|---|---|---|---|
| `UserPlus` "Partager avec mon/ma partenaire" | yes | "Lien partenaire" (`Link` icon) | "Liste à deux" (`HeartHandshake`) | "Liste à deux" (`HeartHandshake`) |
| Invités | yes | yes | yes | yes |
| Mes listes | yes | yes | yes | yes |
| Mon compte | yes | yes | yes | yes |
| `list-row--danger` "Supprimer la liste" | yes | yes | yes | no |
| `list-row--danger` "Quitter la liste" | no | no | no | yes |

All four partner rows close the menu and open `PartnerSheet`. "Quitter la liste" closes the menu and opens the leave `ConfirmDialog` (section 2.4).

### 1.3 Share sheet hook (`ShareSheet.tsx`)

Creator, solo, no pending link only: after the existing hint banner, one line:

"Tu fais cette liste à deux ? <button link>Invite ton/ta partenaire</button>"

`Button variant="link"`; closes `ShareSheet`, opens `PartnerSheet`. `ShareSheet` gets an optional `onPartner?: () => void` prop; the line renders only when it is passed (OwnerList passes it, Guests does not).

## 2. Partner sheet (new `pages/owner/PartnerSheet.tsx`)

Built like `ShareSheet`: `Sheet` with `title` + `description`, `.share-link` block, `.share-targets`, `hint-banner hint-banner--stack`. Props: `open`, `onOpenChange`, `listId`, `list` (`WithId<ListDoc>` data), `onLeft` (navigate after leave).

Title for every state: "Liste à deux".

### 2.1 Creator, no link

- Description: "Invite ton/ta partenaire à gérer cette liste avec toi."
- Three facts (`ul.partner-facts`, icon + text, icons `aria-hidden`):
  - `Pencil` "Vous ajoutez et modifiez les souhaits tous les deux."
  - `Send` "Vous partagez le même lien avec vos proches."
  - `EyeOff` "Aucun de vous deux ne voit qui offre quoi."
- `Button large full` "Créer le lien partenaire" (`loading` while `createPartnerInvite` runs).
- Note under it (`.muted.small`): "Le lien marche une seule fois, pendant 7 jours."
- Error: `toast.error('Impossible de créer le lien. Réessaie.')`.

### 2.2 Creator, link pending

- Description: "Envoie ce lien à ton/ta partenaire, et à personne d'autre."
- `.share-link`: label "Lien partenaire", read-only input showing the URL without protocol, `Button large` "Copier". Toasts reuse ShareSheet's: "Lien copié" / "Copie impossible. Sélectionne le lien pour le copier."
- Expiry line (`.muted.small`, `Clock` icon): "Valable jusqu'au {formatShortDate(expiresAt)}, une seule fois." When `expiresAt` is unknown (sheet reopened later, see Open questions): "Valable 7 jours après sa création, une seule fois."
- `.share-targets`: WhatsApp, SMS, E-mail, "Plus…" (native share if `navigator.share`), same hrefs as ShareSheet with this message:
  - Message: "On fait notre liste « {title} » à deux sur Chuut ? Ce lien est rien que pour toi (valable 7 jours) : {url}"
  - E-mail subject: "Notre liste « {title} »"
- Warning banner (`hint-banner hint-banner--stack`): hand "Rien que pour ton/ta partenaire." text "Ce lien donne les mêmes droits que toi sur la liste. Ne le mets pas dans le groupe de famille."
- Secondary actions, stacked `sheet__actions`:
  - `Button variant="outline" large full` "Créer un nouveau lien": calls `createPartnerInvite` (revokes the old one). Toast "Nouveau lien créé. L'ancien ne marche plus."
  - `Button variant="link"` "Annuler le lien": calls `revokePartnerInvite`, no confirmation (reversible by creating a new one). Toast "Lien annulé". Sheet returns to 2.1.

### 2.3 Creator, partner joined

- Description: "Tu gères cette liste avec {other}."
- Partner card: `list-group` > `list-row guest-row` (cursor default) with `Avatar` + `<strong>{other}</strong>` + `.guest-row__meta` "Peut ajouter, modifier et partager".
- Reassurance: `HintBanner title="Pas de spoiler, pour personne"` "Ni toi ni {other} ne verrez qui prend quoi."
- `Button variant="danger" large full` "Retirer {other} de la liste" -> confirm:

| Field | Copy |
|---|---|
| title | "Retirer {other} ?" |
| description | "{other} ne pourra plus voir ni modifier « {title} ». Les souhaits ajoutés restent sur la liste. Tu pourras l'inviter à nouveau." |
| confirmLabel | "Retirer {other}" |
| cancelLabel | "Garder {other}" |
| success | `toast('{other} ne fait plus partie de la liste')`, sheet back to 2.1 |
| error | `toast.error('Impossible de retirer {other}. Réessaie.')` |

### 2.4 Partner view

- Description: "Tu gères cette liste avec {other}. C'est {other} qui l'a créée."
- Same partner card, showing the creator, meta "A créé la liste".
- Same `HintBanner` as 2.3.
- `Button variant="danger" large full` "Quitter la liste" -> confirm (same dialog as the menu row):

| Field | Copy |
|---|---|
| title | "Quitter « {title} » ?" |
| description | "Tu ne pourras plus voir ni modifier cette liste. Les souhaits que tu as ajoutés y restent. Pour revenir, {other} devra t'envoyer un nouveau lien." |
| confirmLabel | "Quitter la liste" |
| cancelLabel | "Rester" |
| success | `nav('/app', { replace: true })` then `toast('Tu as quitté la liste')`. Navigate before the list listener reports `permission-denied`, so no "introuvable" flash. |
| error | `toast.error('Impossible de quitter la liste. Réessaie.')` |

Removed partner still on the page: the list read fails and `OwnerList` shows its existing "Cette liste est introuvable" empty state. Acceptable, no new copy.

## 3. Accept page `/partner/:token` (new `pages/owner/PartnerAccept.tsx`)

Route in `App.tsx`, not wrapped in `RequireAccount` (the page handles auth itself): `<Route path="/partner/:token" element={<PartnerAccept />} />`, lazy from the owner bundle (`Owner.tsx` re-export).

### 3.1 Layout (reuse Join)

Reuse Join's hero and intro: `join-hero` ribbon (`themeFor(type).header`), `join-intro`, then a body, then `join-foot`-like bottom. Content:

- Kicker (`.kicker`): "Liste à deux"
- h1: "{ownerName} te propose de gérer « {title} » à deux"
- Meta (`.muted.small`): `formatDate(eventDate)` when present.
- Facts (same `ul.partner-facts` as 2.1, partner wording):
  - `Pencil` "Vous ajoutez et modifiez les souhaits tous les deux."
  - `Users` "Vos proches verront « Liste de {ownerName} et {me or 'toi'} »." (use `profile.displayName` when signed in and complete, else "toi")
  - `EyeOff` "Comme {ownerName}, tu ne verras jamais qui offre quoi."

### 3.2 States and actions

`getPartnerInvite({token})` runs first, for every auth state.

| State | Detection | Body / actions |
|---|---|---|
| Loading | auth `loading` or preview pending | `Spinner page` |
| Preview network error | callable throws non `not-found` | reuse `LoadError` (`onRetry` refetch) |
| Signed out | `!user` | `BottomBar stacked plain`, note "Il te faut un compte pour gérer une liste. Le lien t'attend ici." Buttons: `ButtonLink large full` "Créer mon compte" -> `/signup`; `ButtonLink large full variant="secondary"` "J'ai déjà un compte" -> `/login`. Both with `state={{ from: '/partner/' + token }}`. |
| Anonymous guest | `user.isAnonymous` | Same two buttons and targets. Note: "Tu es ici en invité·e. Crée ton compte pour gérer la liste, tes réservations sont gardées." (Signup links the anonymous account, login merges it: existing `authActions`.) |
| Account, incomplete onboarding | `!profile?.ageConfirmedAt \|\| !profile.displayName` | Auto `<Navigate to="/onboarding" state={{ from: pathname }} replace />` (same rule as `RequireAccount`). Onboarding returns here. |
| Account, ready | otherwise | Note `.muted.small`: "Tu rejoins en tant que {displayName}." Primary `Button large full` "Accepter et gérer la liste" (`loading` during `acceptPartnerInvite`). Under it `Button variant="link"` "Ce n'est pas toi ? Changer de compte": signs out, then `nav('/login', { state: { from } })`. |
| Success | callable resolves `{listId}` | `nav('/lists/' + listId, { replace: true })`, `toast('C'est fait, vous gérez « {title} » à deux')` |
| Generic accept error | any other code | inline `<p className="error" role="alert">Une erreur est survenue. Réessaie.</p>` above the button, page stays |

Return-to-token chain: Signup/Login already navigate to `state.from` (`AuthForm`). New account -> `/partner/:token` -> incomplete profile -> `/onboarding` with `from` -> back to `/partner/:token` -> taps Accept. Accept is always an explicit tap, never automatic.

Optional: when `from` starts with `/partner/`, Signup/Login `AuthHeader` uses kicker "Liste à deux" and body "Crée ton compte pour gérer la liste avec la personne qui t'a invité·e." No data needed.

### 3.3 Error screens

Full-screen, replacing the preview. Pattern = `NotFound` in `Shell.tsx`: `top-bar top-bar--left` with `Logo`, `ScreenBody gap={24}`, illustration, `h1` (2rem) + `p.muted` (fs-18), `BottomBar stacked plain`. Build one `PartnerError` component with `title`, `body`, `actions`. Focus the `h1` on mount (`tabIndex={-1}`) so screen readers announce the switch.

"Home" action below = `ButtonLink to="/app"` "Mes listes" when signed in with an account, else `ButtonLink to="/"` "Découvrir Chuut".

| Code (source) | Title | Body | Actions |
|---|---|---|---|
| `not-found` (preview or accept): expired, used, revoked or bad token | "Ce lien ne marche plus" | "Il a peut-être expiré (il dure 7 jours), déjà servi, ou été remplacé par un nouveau. Demande un nouveau lien partenaire à la personne qui te l'a envoyé." | Home |
| `resource-exhausted` (list full) | "Cette liste est déjà à deux" | "{ownerName} gère déjà « {title} » avec quelqu'un. Une liste ne peut avoir que deux propriétaires." | Home |
| `already-exists` (already owner, e.g. creator opens own link) | "C'est déjà ta liste" | "Ce lien sert à inviter ton/ta partenaire. Envoie-le-lui, il ne marche qu'une fois." | `ButtonLink to="/app"` "Mes listes" |
| `failed-precondition` + `has-claims` | "Tu as des réservations sur cette liste" | "Tu as déjà réservé des cadeaux sur « {title} » en tant qu'invité·e. Libère-les d'abord, puis reviens sur ce lien. Chut, {ownerName} n'en saura rien." Second paragraph `.muted.small`: "Marqué comme acheté ? Annule « acheté », puis libère-le." | Primary `ButtonLink to="/app?tab=joined"` "Voir mes listes rejointes". Secondary `Button variant="secondary"` "J'ai tout libéré, réessayer" (re-calls accept; link is still valid since unused). |

`ownerName` and `title` come from the preview already loaded; if the preview failed with `not-found`, only the first row can occur.

Illustrations: `EmptyBox` for not-found and full, `GiftBox` for has-claims and already-exists.

## 4. Dashboard (`Dashboard.tsx`)

- `useMyLists` queries `ownerIds array-contains me` (spec), so shared lists appear in "Mes listes" for both owners, ordered by `createdAt` like the rest.
- `MineCard`: when `isShared`, add a line under `list-card__meta`:
  `<div className="list-card__shared"><AvatarPair names={ownerNames} size="sm" />Partagée avec {other}</div>`
  Same text for creator ("Partagée avec Tom") and partner ("Partagée avec Anna"). No "créée par" marker; the partner sees creator status inside `PartnerSheet`.
- Pending invites show nothing on the dashboard.
- Pre-migration list (no `ownerNames`): no marker.
- `JoinedCard` unchanged: "Liste de Anna et Tom" reads correctly.

## 5. Plural copy (guest-facing and shared messages)

Source of `shared`:

- `Join.tsx`: `invite.shared` (add `shared?: boolean` to `Invite` in `api.ts`).
- `GuestList.tsx` / `WishSheet.tsx`: `list.data?.shared`, passed as `shared: boolean` on `GuestCtx` (`actions.ts`). Add `list.isPending` to the spinner condition in `GuestList` so copy never flashes singular then plural (`Joined` docs carry no `shared`).
- `ShareSheet.tsx`: `list.shared`.

Helper (new, `lib/format.ts`): `export const agree = (shared: boolean | undefined, one: string, many: string) => (shared ? many : one)`.

| File | Singular (today) | Plural (`shared`) |
|---|---|---|
| `Join.tsx` OCCASION_COPY christmas | "sa liste de Noël" | "leur liste de Noël" |
| `Join.tsx` OCCASION_COPY birthday | "sa liste d'anniversaire" | "leur liste d'anniversaire" |
| `Join.tsx` OCCASION_COPY other | "sa liste « {title} »" | "leur liste « {title} »" |
| `Join.tsx` h1 | "{ownerName} t'invite à {occasion}" | "{ownerName} t'invitent à {occasion}" |
| `Join.tsx` plum note | "{ownerName} ne verra pas ce que tu réserves." | "{ownerName} ne verront pas ce que tu réserves." |
| `GuestList.tsx` `.guest-secret` | "Chut,<br/>{ownerName} ne voit rien" | "Chut,<br/>{ownerName}<br/>ne voient rien" |
| `GuestList.tsx` empty state | "{ownerName} n'a rien ajouté pour l'instant. Repasse un peu plus tard." | "{ownerName} n'ont rien ajouté pour l'instant. Repasse un peu plus tard." |
| `WishSheet.tsx` release | "Il redevient libre pour les autres invités. Pas de souci, ça arrive. {ownerName} n'en saura rien." | "... {ownerName} n'en sauront rien." |
| `WishSheet.tsx` bravo | "Il ne reste plus qu'à l'emballer. {ownerName} n'en saura rien{ jusqu'au date}." | "... {ownerName} n'en sauront rien{ jusqu'au date}." |
| `WishSheet.tsx` wish gone | "{ownerName} l'a retiré de la liste." | "{ownerName} l'ont retiré de la liste." |
| `ShareSheet.tsx` message | "{ownerName} t'invite à sa liste « {title} » sur Chuut : {url}" | "{ownerName} t'invitent à leur liste « {title} » sur Chuut : {url}" |

Reviewed, no change needed (no verb or possessive agreement): `Join.tsx` kicker "Une invitation de {ownerName}"; `ListTitle` "Liste de {ownerName}"; `WishSheet.tsx` "Coup de cœur de {ownerName}" and "Les autres invités verront « Pris par {myName} ». {ownerName}, rien du tout."; `changes.tsx` `RemovedBadge` "Retiré par {ownerName}"; `Upgrade.tsx` "{title} · liste de {ownerName}" and "Tes réservations restent invisibles pour {ownerName}, ..."; `Dashboard.tsx` `JoinedCard` "Liste de {ownerName}". `changes.tsx` needs no `shared` prop.

Owner-facing variants (the "tu" viewer is one of two owners):

| File | Solo (today) | Shared |
|---|---|---|
| `OwnerList.tsx` `HintBanner` text | "Tu ne verras jamais qui prend quoi." | "Ni toi ni {other} ne verrez qui prend quoi." |
| `ShareSheet.tsx` description | "Envoie le lien à tes proches. Ils choisissent un cadeau sans que tu le saches." | "Envoie le lien à tes proches. Ils choisissent un cadeau sans que vous le sachiez." |
| `ShareSheet.tsx` hint hand | "Tu ne verras jamais qui prend quoi." | "Ni toi ni {other} ne verrez qui prend quoi." |
| `OwnerList.tsx` delete confirm description | "La liste, ses souhaits et le lien de partage disparaissent pour tout le monde. C'est définitif." | "La liste, ses souhaits et le lien de partage disparaissent pour tout le monde, {other} compris. C'est définitif." |
| `Account.tsx` delete account description | "Ton compte, tes listes et tes souhaits seront supprimés définitivement. Cette action est irréversible." | when the user is on any shared list, append: " Les listes que tu as créées disparaissent aussi pour ton/ta partenaire. Celles qu'on t'a partagées restent à la personne qui les a créées." |

Name display: always render `ownerName` as stored ("Anna" or "Anna et Tom", creator first, computed by functions). The client never joins names itself except `other` (single name) and `AvatarPair`.

Layout: `.guest-secret` is `flex: none`; with two names it can squeeze the title. Change to `flex: 0 1 auto; max-width: 45%; overflow-wrap: anywhere;` in `styles/guest.css`.

## 6. Partner restrictions

| Capability | Creator | Partner |
|---|---|---|
| Add / edit / delete wishes (any author) | yes | yes |
| Share guest link, see Invités | yes | yes |
| Create / revoke partner link | yes (solo only) | no (list already has 2 owners) |
| Remove partner | yes | no |
| "Quitter la liste" | no | yes (menu + PartnerSheet) |
| "Supprimer la liste" | yes | hidden (row not rendered, not just disabled) |

Gate everything on `isCreator` in the client; the server and rules enforce it anyway.

## 7. Components, files, accessibility, mobile

### New

- `ui/Avatar.tsx`: `AvatarPair({ names, size })`: two `Avatar`s overlapped (`.avatar-pair`, second with `margin-left: -10px` and `border: 2px solid var(--surface)`), wrapper `aria-hidden`. Export from `ui/index.ts`, add one line to `ui/README.md`.
- `pages/owner/PartnerSheet.tsx`, `PartnerRow` (inside `OwnerList.tsx` or same file as the sheet).
- `pages/owner/PartnerAccept.tsx` (+ `PartnerError`), exported via `pages/Owner.tsx`.
- CSS in `pages/owner/owner.css`: `.partner-facts` (column, gap 10, icon `color: var(--purchased)`), `.list-card__shared` (inline-flex, gap 8, fs-14, muted), `.avatar-pair`. Tokens only, no plum.

### Reused

`Sheet`, `ConfirmDialog`, `Button` (`danger`, `link`, `outline`, `secondary`), `ButtonLink`, `HintBanner`, `.hint-banner--stack`, `.share-link`, `.share-targets` / `.share-target`, `list-group` / `list-row` / `row-label` / `list-row__value` / `list-row--danger`, `guest-row`, `Avatar`, `toast`, `Spinner page`, `LoadError`, `BottomBar stacked plain`, `Logo`, `EmptyBox` / `GiftBox`, `join-hero` / `join-intro`, `themeFor`, `formatDate`, `formatShortDate`. Icons from `lucide-react`: `UserPlus`, `Link`, `HeartHandshake`, `Pencil`, `Send`, `EyeOff`, `Users`, `Clock`, `ChevronRight`.

### Files to touch

`App.tsx` (route), `pages/Owner.tsx` (export), `pages/owner/OwnerList.tsx`, `pages/owner/ShareSheet.tsx`, `pages/owner/Dashboard.tsx`, `pages/owner/owner.css`, `pages/Account.tsx` (Onboarding honours `state.from`; delete copy), `guards.tsx` (`RequireAccount` passes `state={{ from }}` to `/onboarding`), `pages/Shell.tsx` (optional partner header in Signup/Login), `pages/guest/Join.tsx`, `pages/guest/GuestList.tsx`, `pages/guest/WishSheet.tsx`, `pages/guest/actions.ts` (`GuestCtx.shared`), `styles/guest.css`, `api.ts` (`Invite.shared`, new callables), `types.ts` (`ListDoc.ownerIds`, `ownerNames`, `shared`, `partnerInviteToken`), `data/queries.ts` (`useMyLists`, `useOwnedListBySlug` on `ownerIds`), `data/mutations.ts` (create/revoke/accept/remove hooks), `lib/format.ts` (`agree`), `ui/Avatar.tsx`, `ui/index.ts`, `ui/README.md`.

### Accessibility

- Sheets and dialogs: vaul/Radix already give focus trap, Esc, `aria-modal`, title + description.
- Every new control is 44px+; `PartnerRow` is a real `<button>` with an `aria-label` carrying the full state.
- Copy, create, revoke, remove, leave: result announced via sonner toast (live region); inline errors use `role="alert"`.
- Accept page: one `h1` per state; error screens move focus to the `h1`. Buttons expose `aria-busy` through `loading`.
- Expiry and status are text, never colour only. Avatars are decorative (`aria-hidden`), names are in text.
- Danger actions always behind `ConfirmDialog` with the name of the person and of the list in the title.

### Mobile

- Partner URL is long: read-only input truncates, `onFocus` selects all, "Copier" stays visible (existing `.share-link__row`).
- Native share first on phones ("Plus…"), WhatsApp/SMS deep links as in ShareSheet.
- Long names ("Marie-Charlotte et Jean-Baptiste") wrap: `overflow-wrap: anywhere` on `.guest-secret`, `.list-card__shared`, `PartnerRow` label; `join-intro h1` already uses `text-wrap: balance`.
- Accept page actions sit in the sticky `BottomBar` so they stay in thumb reach.

## Open questions (need a spec owner decision, not changed here)

1. Expiry after reopening the sheet: the list stores only `partnerInviteToken`, not `expiresAt`, so the creator sees the exact date only right after creating the link, and an expired link still shows as "en attente". Proposal: also store `partnerInviteExpiresAt` on the list (functions-written, owners read). Until then use the fallback copy in 2.2.
2. `ownerNames` is a snapshot: if an owner renames themselves in Account, "Anna et Tom" and "Partagée avec Tom" keep the old name. Proposal: have the profile rename path call the same recompute as `removePartner`.
