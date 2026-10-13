# Desktop layout (tablet rail + desktop workspace)

Source of truth for visuals: the approved design canvas (Main, Components, Dashboard, ListDetail, WishForm, Share, Guest, Tablet). This document turns it into an implementable change list for `web/` (React 19, TypeScript, Vite, plain CSS tokens, react-router-dom 7 with `BrowserRouter`, vaul, `@radix-ui/react-dialog`, sonner, Firebase). UI copy is French ("tu"), no em-dashes, no emojis. Every name below marked "exists" was verified in `web/src`; "new" means to be created.

## 1. Scope and non-goals

In scope
1. Three layouts driven by viewport width: `< 768` mobile (unchanged), `768-1199` tablet (72px icon rail, modal right drawer), `>= 1200` desktop (248px sidebar, tile grid, persistent non-modal detail panel, centered dialogs).
2. Owner screens: dashboard (`/app`), list (`/lists/:listId`), wish detail/new/edit as nested routes, guests (`/lists/:listId/guests`), new list (`/lists/new`), account (`/account`).
3. Guest member screen (`/l/:slug`, `/l/:slug/wish/:wishId`): tile grid, filter chips, detail panel with reserve/buy actions.
4. Keyboard shortcuts and a "?" cheat sheet. Client-side search (`/`) over already loaded data.
5. Favicon work already in the worktree (`web/public/favicon.svg`) is out of this spec.

Non-goals (do not implement)
- No change below 768px: same DOM, same CSS output, same routes behaviour. This is a hard acceptance gate (section 10).
- Unauthenticated and auth screens (`Landing`, `Signup`, `Login`, `Onboarding`, `Join`, `PartnerAccept`, `Upgrade`, `Terms`, `Privacy`, `NotFound`, `LoadError`) stay in the 480px column at all widths.
- No floating-card detail panel. The panel is flush to the right edge with a single `border-left` divider.
- No backend, Firestore rules, data model or query changes. No new npm dependency.
- Design items that need data we do not have: "Ajouté par Camille le 2 octobre" (Wish has no author/createdAt), "Trier : ajout récent" sort control, QR code, "Envoyer par e-mail" button duplicating the existing E-mail target, draft saving ("Brouillon gardé"), "Enchaîner avec un autre souhait" checkbox, image drag-and-drop on the tile. Out of scope.
- "G then L" chord and the "Vue d'ensemble" sidebar entry: out of scope (not in the approved shortcut list).
- Drag to reorder, bulk actions, multi-select: out of scope.
- Search is in scope but strictly client-side (section 7.3). No server query, no index.

Product rule that applies everywhere: **owner screens never reveal claim state.** At any width, including hover, focus, tooltips, aria labels, quick actions, search results, counts and the sidebar: no "pris", "réservé", "acheté" information about the owner's own lists. Claim UI (`Tag variant="claimed"`, `Tag variant="purchased"`, `.wish-card--mine`, etc.) exists only under `pages/guest/**`. Plum is guest only.

## 2. Breakpoints and tokens

Breakpoints (literal px in media queries, since CSS variables do not work in `@media`):

| Name | Query | JS value |
|---|---|---|
| mobile | `(max-width: 767.98px)` | `'mobile'` |
| tablet | `(min-width: 768px) and (max-width: 1199.98px)` | `'tablet'` |
| desktop | `(min-width: 1200px)` | `'desktop'` |

CSS convention: mobile rules stay untouched at the top level. All new rules live in `@media (min-width: 768px)` and `@media (min-width: 1200px)` blocks in new files (section 6). Never edit an existing top-level mobile rule except where this spec says so.

New tokens in `web/src/styles/tokens.css` (`:root`, light), plus dark overrides inside the existing `@media (prefers-color-scheme: dark) :root` block. Existing tokens are untouched.

```css
/* light */
--sidebar: 248px;
--rail: 72px;
--panel: 400px;
--drawer: 420px;
--content-max: 1280px;
--shadow-lg: 0 14px 40px rgba(60, 30, 10, .18);
--scrim: rgba(42, 30, 26, .4);
--ring: color-mix(in srgb, var(--primary) 45%, transparent);
--hairline: 1px solid var(--line);
/* dark */
--shadow-lg: 0 14px 40px rgba(0, 0, 0, .55);
--scrim: rgba(0, 0, 0, .6);
```

(`--shadow-lg` and `--scrim` values are taken from the design canvas; `--ring` is the 45% primary focus colour from the design's focus-visible spec; `--drawer` is added so 420 is not a magic number.) The global `:focus-visible { outline: 3px solid var(--gold) }` in `base.css` is kept. New desktop components (sidebar items, tiles, search) use `outline: 3px solid var(--ring); outline-offset: 2px` where the design shows the primary-tinted ring.

Fixed dimensions (exact):
- Sidebar 248px, background `var(--surface)`, `border-right: 1px solid var(--line)`, padding `18px 14px`, gap 18px. Rail 72px, same surface, items 48x48, radius 14px.
- Nav item: min-height 40px, padding `0 10px`, radius 10px, font 15px/500. Section label: 12px/700 uppercase, letter-spacing .08em, `var(--muted)`.
- Top bar (PageHeader): padding `12px 28px`, `border-bottom: 1px solid var(--line)`, search pill min-height 38px, width 260px (max 100%).
- Content: `max-width: var(--content-max)`, horizontal padding 28px, centered inside the main column.
- Compact occasion band: height 112px (existing mobile value 124px is unchanged below 768).
- Title card overlap: `.list-title--card { padding: 14px 18px 0; margin-left: -18px; border-radius: 18px 18px 0 0; background: var(--bg); }` with a negative top margin of 28px so the card sits over the bottom of the band (both top corners rounded, as approved; the band's own 44px fade is hidden at >= 768 because the card provides the transition).
- Tile grid: `display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 20px;` at >= 1200. At 768-1199: `minmax(190px, 1fr)`. Tile radius 16px, media height 130px, body padding `12px 14px 14px`, title 15.5px/700.
- Detail panel (desktop): width `var(--panel)` (400px), flush right, `border-left: 1px solid var(--line)`, background `var(--surface)`, no shadow, no radius, no margin. Header padding `10px 12px 10px 20px` with bottom hairline; body padding 20px, gap 14px, scrolls; footer padding `14px 20px` with top hairline, sticky.
- Drawer (tablet): `position: fixed; top:0; right:0; bottom:0; width: min(var(--drawer), 100%)`, modal, scrim `var(--scrim)`, `box-shadow: -12px 0 40px rgba(0,0,0,.35)`.
- Dialog (desktop and tablet): centered, radius 22px, `box-shadow: var(--shadow-lg)`, width `min(560px, 100% - 48px)` default, `min(860px, 100% - 48px)` for share (`size="lg"`), confirm dialogs `min(440px, ...)` (`size="sm"`). Head padding `26px 28px 6px`, body `18px 28px 22px`, foot `14px 28px` with top hairline.
- Kbd hint: min-width 20, height 20, padding `0 5px`, radius 5px, 1px currentColor border, 11px/600, opacity .65. Shown only when `@media (min-width: 1200px) and (hover: hover) and (pointer: fine)`.

Hover behaviour only under `@media (hover: hover)`. Under `prefers-reduced-motion: reduce`: no translate on tile hover, shadow only (the global reduce-motion rule in `base.css` already collapses durations).

## 3. Route changes

Current routes (verified, `web/src/App.tsx`): `/app`, `/lists/new`, `/lists/:listId`, `/lists/:listId/wishes/new`, `/lists/:listId/wishes/:wishId/edit`, `/lists/:listId/guests`, `/l/:slug` (Resolver) with child `wish/:wishId`, `/account`, plus public routes. Each owner route is wrapped individually with the local helper `acct()`.

Target (replace the owner block; public/guest routes unchanged except where noted):

```tsx
<Route element={<Layout />}>
  ...public routes unchanged...
  <Route element={<RequireAccount><AppShell /></RequireAccount>}>      {/* new layout route; AppShell renders <Outlet/> */}
    <Route path="/app" element={<Dashboard />} />
    <Route path="/lists/new" element={<NewList />} />
    <Route path="/lists/:listId" element={<OwnerList />}>               {/* OwnerList now renders its child via <Outlet/> */}
      <Route path="wishes/new" element={<WishForm mode="new" />} />
      <Route path="wishes/:wishId" element={<WishDetail />} />          {/* new */}
      <Route path="wishes/:wishId/edit" element={<WishForm mode="edit" />} />
    </Route>
    <Route path="/lists/:listId/guests" element={<Guests />} />
    <Route path="/account" element={<Account />} />
  </Route>
  ...
</Route>
```
`acct()` becomes unused and is removed. `/onboarding` keeps `RequireAccount allowIncomplete` outside the shell. `WishDetail` is added to `web/src/pages/Owner.tsx` exports and lazy-loaded in `App.tsx` like the other owner pages. `Account` is currently imported eagerly from `./pages/Account`; keep it eager.

Behaviour per breakpoint for the nested wish routes:

| URL | mobile | tablet | desktop |
|---|---|---|---|
| `/lists/:id/wishes/new` | full-page WishForm (as today; `OwnerList` renders only its child) | list + modal drawer containing the form | list + persistent panel containing the form |
| `/lists/:id/wishes/:wishId/edit` | full-page WishForm (as today) | list + drawer | list + panel |
| `/lists/:id/wishes/:wishId` | `<Navigate to=".../edit" replace />` (this route is never linked on mobile; guards deep links) | list + drawer with detail | list + panel with detail |

Navigation rules:
- Card/tile primary link target: mobile `.../edit` (unchanged), tablet/desktop `.../wishes/:wishId`. Decided in `OwnerList` via `useBreakpoint()`.
- Opening detail from the grid uses `navigate(path)` (push). Moving the selection with J/K or arrows uses `navigate(path, { replace: true })` so Back leaves the list rather than stepping through every wish.
- Closing a panel/drawer (X, Esc, Annuler) navigates to `/lists/:listId` preserving `location.search` (the `?q=` filter). After a successful save in `WishFields`, today's `nav('/lists/:id', { replace: true })` becomes: desktop/tablet go to `/lists/:id/wishes/:wishId` (the saved wish's detail; for create use the id returned by the mutation if `useSaveWish` exposes it, otherwise `/lists/:id`), mobile unchanged. Implementation note: check `useSaveWish` in `web/src/data/mutations.ts` for the returned id before wiring; fall back to the list URL if it returns void.
- Delete wish (existing `ConfirmDialog` in `WishFields`) navigates to `/lists/:listId` with replace (unchanged).
- `/lists/:listId/guests` stays a route at all widths. On desktop the same content is also shown inside the Share dialog (section 5.9) and the "Invités" count pill in the list header links to it. No tab, no new query param.
- Search state lives in the URL query `?q=` on `/app`, `/lists/:listId` and `/l/:slug`, via `useSearchParams` with `replace: true`. Filter chip state uses `?f=` (values below). Both survive opening/closing a panel because navigation helpers carry `location.search`.
- Guest: `/l/:slug/wish/:wishId` already nested under `Resolver` and rendered through `<Outlet context={ctx}/>`; unchanged route. Selection moves use `replace`; the existing `state.fromList` logic in `WishSheet.close()` stays (open pushes with `fromList`, close does `nav(-1)`; selection moves with replace must forward `{ state: { fromList: true } }`).

## 4. Shared infrastructure (new)

### 4.1 `web/src/lib/useBreakpoint.ts` (new)
```ts
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
export function useBreakpoint(): Breakpoint
export const useMediaQuery: (query: string) => boolean
```
Implemented with `useSyncExternalStore` and `window.matchMedia` for `(min-width: 768px)` and `(min-width: 1200px)`; synchronous first value so there is no mobile flash on desktop. Server snapshot returns `'mobile'`. Only components whose JSX differs per breakpoint call it; pure layout differences use CSS.

### 4.2 `web/src/lib/useHotkeys.ts` (new), no dependency
```ts
export interface Hotkey {
  /** KeyboardEvent.key, case-insensitive for letters: 'n', 'a', '/', '?', 'Escape', 'Enter' */
  key: string
  handler: (e: KeyboardEvent) => void
  /** modifier chord, e.g. { mod: true } = Cmd (mac) or Ctrl (others). Default: no modifier allowed */
  mod?: boolean
  /** fire even while a text field is focused (Escape, Mod+Enter). Default false */
  inInput?: boolean
  /** extra enabling condition. Default true */
  enabled?: boolean
  /** shown in ShortcutsDialog; omit to hide */
  label?: string
}
export function useHotkeys(bindings: Hotkey[]): void
```
Rules (acceptance-relevant):
1. One `keydown` listener on `window`, attached in an effect, latest bindings read through a ref.
2. Ignore the event when `e.repeat`, `e.isComposing`, or `e.defaultPrevented`.
3. Single-letter and `/` and `?` bindings are ignored when the event target (or `document.activeElement`) is `input`, `textarea`, `select`, `[contenteditable]`, or inside `[role="combobox"]`, unless `inInput`.
4. Ignored when Alt/Ctrl/Meta is pressed unless the binding has `mod`. Shift is allowed (`?` needs it).
5. While a modal dialog is open (`document.querySelector('[role="dialog"][data-state="open"][aria-modal="true"], [data-vaul-drawer][data-state="open"]')`), only `Escape` bindings run (Radix already handles its own Escape; `inInput`+`Escape` bindings on a non-modal panel remain active).
6. No-op below 768px: the hook reads `useBreakpoint()` and registers nothing on mobile (touch UI; avoids any behaviour change).
7. `preventDefault()` only when a binding handled the event (so `/` does not type into a field it focuses; `Mod+Enter` does not insert a newline).

### 4.3 `web/src/ui/ShortcutsDialog.tsx` (new)
```ts
export function ShortcutsDialog({ open, onOpenChange, context }: { open: boolean; onOpenChange: (o: boolean) => void; context: 'owner' | 'guest' })
```
Uses `Sheet variant="dialog" size="sm"` (section 5.2). Title "Raccourcis clavier". Groups and rows below. Opened by `?` (registered in `AppShell`). A static table in the file, not derived from bindings.

| Group | Key | Label | Context |
|---|---|---|---|
| Partout | `/` | Rechercher | both |
| Partout | `N` | Créer une liste | owner |
| Partout | `Échap` | Fermer panneau ou dialogue | both |
| Partout | `?` | Cette aide | both |
| Dans ma liste | `A` | Ajouter un souhait | owner |
| Dans ma liste | `S` | Partager | owner |
| Dans ma liste | `J` `K` | Souhait suivant / précédent | owner |
| Dans ma liste | `E` | Modifier | owner |
| Dans ma liste | `⌘ ↵` | Enregistrer le formulaire | owner |
| Invité | `J` `K` | Idée suivante / précédente | guest |
| Invité | `R` | Je m'en occupe | guest |
| Invité | `B` | J'ai acheté | guest |

Footer note: "Les raccourcis à une lettre sont ignorés quand tu écris dans un champ."

### 4.4 Toaster
`web/src/ui/Toast.tsx` (exists): `position` becomes `'top-center'` below 768 and `'top-right'` from 768 (use `useBreakpoint`). Mobile output identical.

## 5. File-by-file change list

Legend: edit = exists, new = create.

### 5.1 Styles
| File | Status | Change |
|---|---|---|
| `web/src/styles/tokens.css` | edit | Add tokens of section 2 (light + dark). |
| `web/src/styles/base.css` | edit | Append only: `@media (min-width: 768px) { .app-column:has(> .app-shell) { max-width: none; box-shadow: none; padding-bottom: 0 } }`. The two `.app-column > :not(.screen)` margin rules are not affected because `AppShell` is the single child. Do not touch `#root` (it already centers a full-width column). |
| `web/src/styles/desktop.css` | new | All new layout rules, wrapped in `@media (min-width: 768px)` / `(min-width: 1200px)` / `(hover: hover)`. Sections: `.app-shell`, `.sidebar`, `.rail`, `.page-header`, `.search`, `.kbd`, `.content`, `.tile-grid`, `.wish-tile`, `.side-panel`, `.drawer`, `.dialog`, `.list-title--card`, `.occasion-header--compact`, `.chips`, `.shortcuts`. |
| `web/src/index.css` | edit | Add `@import './styles/desktop.css';` as the last import (after `components.css`). `guest.css` is still loaded only with the guest bundle (`pages/Guest.tsx`); guest tile rules go in `desktop.css` only for classes that exist in shared UI, and guest-specific desktop rules go at the bottom of `guest.css` inside media queries. |
| `web/src/pages/owner/owner.css` | edit | Append owner-only desktop rules (dashboard grid `.list-cards`, hover actions) inside media queries. |

### 5.2 `web/src/ui/Sheet.tsx` (exists) -> overlay variants
Keep the export names `Sheet` and `ConfirmDialog` (no rename churn in 7 importers). Add props:
```ts
Sheet({ open, onOpenChange, title, hideTitle, description, children,
  variant = 'auto', size = 'md' }: {
  ...existing
  /** 'auto' = bottom sheet < 768, drawer 768-1199, dialog >= 1200. 'dialog' = bottom sheet < 768, centered dialog >= 768.
   *  'sheet' = always bottom sheet (guest and menu sheets that must not change). */
  variant?: 'auto' | 'dialog' | 'drawer' | 'sheet'
  size?: 'sm' | 'md' | 'lg'   // dialog widths 440 / 560 / 860
})
```
- Resolve the effective presentation with `useBreakpoint()`. `mobile` -> existing vaul code path, byte-for-byte same DOM and classes (zero regression). `drawer` and `dialog` -> `@radix-ui/react-dialog` (`Dialog.Root/Portal/Overlay/Content/Title/Description`; already a direct dependency), classes `.dialog-overlay`, `.dialog` / `.drawer`, close X button (`IconButton label="Fermer"`). Focus trap, Esc and overlay click close come from Radix. Return focus to the trigger is automatic; for route-driven drawers the opener is gone after navigation, so `SidePanel` handles focus restoration (5.4).
- Default `variant` per call site: `ShareSheet` -> `dialog`, `size="lg"`; `PartnerSheet` -> `dialog`, `size="md"`; `ConfirmDialog` -> `dialog`, `size="sm"`; list menu sheet in `OwnerList` -> replaced by `Menu` at >= 768 (5.7); guest `WishSheet` -> not a `Sheet` at >= 768 (5.10).
- `ConfirmDialog` footer: at >= 768 buttons are a row, right aligned, secondary left of primary, `large` removed (40px). On mobile stacked as today.

### 5.3 `web/src/ui/AppShell.tsx` (new)
```ts
export function AppShell(): JSX.Element   // layout route element
```
- mobile: `return <Outlet />` (no wrapper: DOM identical to today).
- tablet/desktop: `<div className="app-shell app-shell--{tablet|desktop}"><Sidebar collapsed={bp==='tablet'} /><main className="app-shell__main"><Outlet /></main></div>`, plus global hotkeys (`N` -> `/lists/new`, `?` -> open `ShortcutsDialog context="owner"`, `/` -> focus `#global-search` if present) and a skip link "Aller au contenu" (visually hidden until focus) targeting `main`'s `id="main"`.
- `Layout` in `web/src/pages/Shell.tsx` (exists) is unchanged except nothing: it still renders `.app-column` + `Toaster`.

### 5.4 `web/src/ui/Sidebar.tsx` (new)
```ts
export function Sidebar({ collapsed }: { collapsed: boolean }): JSX.Element
```
- Data: `useMyLists()`, `useJoined()`, `useMyClaims()` (all exist in `web/src/data/queries.ts`), `useAuth()` for name.
- Desktop (`collapsed=false`), `<nav aria-label="Navigation principale">`:
  1. `Logo` (exists, `to="/app"`), then primary `ButtonLink to="/lists/new"` "Créer une liste" with `<kbd>N</kbd>` hint.
  2. Section "Mes listes": one `NavLink` per list (`/lists/:id`): occasion swatch (12px square using `themeFor(type).header`), title, and `wishCount`. `aria-current="page"` when active (NavLink default). Empty: muted "Aucune liste".
  3. Section "Listes rejointes": one `NavLink` per joined list to `/l/${slug}` showing title and, if the user holds claims there, a plum badge "N pris par toi" (count of `useMyClaims()` where `parentId === j.id`, the same derivation as `Dashboard`). Plum is allowed here: it is the user's own guest data, never about their own lists.
  4. Footer (`margin-top:auto`, top hairline): `Avatar` + display name linking to `/account` ("Mon compte"), and a `?` icon button opening the shortcuts dialog.
- Tablet (`collapsed=true`): 72px rail, `<nav aria-label="Navigation principale">` with icon buttons 48x48, each with `aria-label` and a `title`: Logo mark, "Mes listes" (list icon -> `/app`), "Listes rejointes" (-> `/app?tab=joined`, plum dot badge with number of joined lists that have a changed claim, else none), "Créer une liste" (`+`), "Mon compte". Active state = filled surface-alt + 3px primary indicator on the left edge.
- Sidebar is never shown on mobile.
- No claim information about owned lists in any form (the swatch, counts and badges above are wish counts and the user's own guest claims only).

### 5.5 `web/src/ui/PageHeader.tsx` (new)
```ts
export interface Crumb { label: string; to?: string }
export function PageHeader({ crumbs, actions, search }: {
  crumbs: Crumb[]                 // last crumb is current page (aria-current="page", not a link)
  actions?: ReactNode             // the buttons that used to be in BottomBar (same Button/ButtonLink elements)
  search?: boolean                // show topbar search bound to ?q=
}): JSX.Element
```
- Renders `<header className="page-header">`: `<nav aria-label="Fil d'Ariane"><ol>` crumbs separated by a decorative "/" (`aria-hidden`), then `SearchBox` if `search`, then actions. Rendered by pages only when `useBreakpoint() !== 'mobile'`.
- `SearchBox` (internal, same file): `<input id="global-search" type="search" aria-label="Rechercher" placeholder="Rechercher">` with `<kbd>/</kbd>`; value mirrors `searchParams.get('q')`, updates with `setSearchParams(next, { replace: true })` debounced 150ms; `Escape` in the field clears it and blurs. Has a visible clear button when non-empty.
- Action buttons inside `.page-header` render at 40px: CSS `.page-header .btn--lg { min-height: 40px }`; pages pass the same `large` props they pass to `BottomBar` today so markup stays shared. Optional `<kbd>` hints are rendered by the page inside the button children (see 5.7), only displayed on desktop+fine pointer by CSS.
- Mobile keeps `TopBar` (exists), `OccasionHeader` back pill and `BottomBar` (exists) untouched.

### 5.6 `web/src/ui/BottomBar.tsx` (exists)
No code change. Pages render `BottomBar` only when `useBreakpoint() === 'mobile'`; otherwise they pass the same children to `PageHeader actions`. (Do not hide `BottomBar` with CSS: avoids duplicate DOM and duplicate focus stops.) Note: public screens (`Landing`, auth, `NotFound`...) keep their BottomBar at all widths.

### 5.7 `web/src/ui/WishCard.tsx` (exists) -> tile layout
Add props, defaults keep the current row layout:
```ts
layout?: 'row' | 'tile'          // default 'row'
selected?: boolean               // tile: aria-current="true", 2.5px primary outline
quick?: ReactNode                // tile: hover/focus-within quick actions (top-right overlay), owner only
```
- `layout="tile"` changes the className set (`wish-card wish-card--tile`) and structure: media on top (height 130, radius `15px 15px 0 0`), body below, `PriceBadge` unchanged, `footer` always visible (guest buttons), `quick` appears on `:hover` (under `@media (hover:hover)`) and `:focus-within`, never `display:none` so it stays keyboard reachable. Tile hover: `transform: translateY(-2px)` + stronger shadow; reduced motion: shadow only. The existing stretched link (`.wish-card__title a::after`) keeps the whole tile clickable; `quick` and `footer` stay above it (`position: relative; z-index: 1`).
- Selected tile: `outline: 2.5px solid var(--primary); outline-offset: -2.5px` plus `aria-current="true"` on the `<article>`.
- Roving focus for J/K and arrows is implemented by the page (5.8), not by `WishCard`; `WishCard` exposes `data-wish-id` via a new optional `id?: string` prop applied as `data-wish-id`.
- Owner usage (`OwnerList`): `quick` = `[Modifier]` link icon-button (`aria-label="Modifier {title}"`) and `[Supprimer]` icon-button (opens the existing delete `ConfirmDialog`). No claim info, no tags. `tag` stays unset. Existing `action` (pencil) is kept for the row layout on mobile.
- Guest usage (`GuestCard` in `pages/guest/GuestList.tsx`): unchanged props, plus `layout="tile"`, `selected`, `id`.

### 5.8 `web/src/ui/SidePanel.tsx` (new)
```ts
export function SidePanel({ title, onClose, children, footer, headerActions, returnFocusTo }: {
  title: string                    // visible h2 in the header, also aria-label of the region
  onClose: () => void              // navigates away (URL-driven)
  children: ReactNode              // scrolling body
  footer?: ReactNode               // sticky footer (action buttons)
  headerActions?: ReactNode        // e.g. previous/next buttons and "Souhait 3 sur 12"
  returnFocusTo?: () => HTMLElement | null  // element to focus on close (the selected tile link)
}): JSX.Element
```
- desktop: `<aside className="side-panel" aria-label={title}>` (non-modal, no scrim, no focus trap; sits as the right grid column, `var(--panel)` wide, `border-left` only). Header: `<h2 tabIndex={-1}>`{title}, `headerActions`, close `IconButton label="Fermer le panneau"`. On mount (including when the route changes to another wish) focus moves to the `h2` only if the change came from user activation of a tile/edit button (i.e. focus was inside the grid or on a trigger); programmatic selection via J/K must NOT steal focus from the grid (keep focus on the newly selected tile link). On close: focus goes to `returnFocusTo()` (tile link of the last selected wish) or, if absent, the grid container (`tabIndex=-1`).
- tablet: renders its content through `Sheet variant="drawer"` (modal Radix dialog: scrim, trap, Esc, `aria-modal`), `title` as dialog title. Closing returns focus via `returnFocusTo`.
- Esc: Radix handles it on tablet; on desktop `OwnerList` registers `Escape` (with `inInput: true` so it also works from the form fields) calling `onClose`. If the form has unsaved changes the Esc still closes (no draft feature; same as the mobile X). 
- Used by: `OwnerList` (wish detail, new, edit; partner info is a dialog, not a panel) and `GuestList` (guest wish detail).

### 5.9 `web/src/pages/owner/OwnerList.tsx` (exists)
Split:
- `OwnerList` (thin, exported, same name): reads `useBreakpoint()` and `useOutlet()`. If `bp === 'mobile' && outlet` return `outlet` (the child renders its own `Screen`, exactly as the old separate routes did; the list view is not mounted, same as today). Otherwise render `<OwnerListView outlet={outlet} bp={bp} />`.
- `OwnerListView` (new, same file): today's body. Changes:
  - mobile branch: current JSX unchanged (OccasionHeader with back pill, `ListTitle`, `PartnerRow`, wishes, `BottomBar`, `Sheet` menu).
  - tablet/desktop branch:
    - `PageHeader crumbs=[{label:'Mes listes', to:'/app'},{label: data.title}] search actions={...}`; actions = `ButtonLink to=".../wishes/new"` "Ajouter un souhait" (`<kbd>A</kbd>`, primary) and `Button variant="secondary"` "Partager" (`<kbd>S</kbd>`), same handlers as today.
    - `OccasionHeader` with new prop `compact` (5.11), `left={null}`-equivalent via `hideBack`; right side keeps the guests pill (`HeaderPill to=.../guests`, label `guestCountLabel`) and replaces the `HeaderRound` "Menu du compte" with `Menu` (5.12).
    - `ListTitle` with new prop `card` (5.11).
    - `PartnerRow` (exists) unchanged, opens `PartnerSheet` as a dialog.
    - Filter chips `.chips` (new inline component `FilterChips`): "Tous", "Coup de cœur · n", "Sans prix · n" bound to `?f=` (`coeur`, `noprice`; absent = all). Counts are over loaded wishes only. Chips are `role="radio"` in a `role="radiogroup" aria-label="Filtrer les souhaits"`.
    - `HintBanner` "Pas de spoiler ici" (exists) unchanged, text unchanged.
    - Grid: `<div className="tile-grid" role="list" ref=gridRef>` of `WishCard layout="tile"` (`role="listitem"` wrapper not needed; use `<ul>`/`<li>` for semantics). Filtering: `q` matches case-insensitive and accent-insensitive (`normalize('NFD')` strip diacritics) on `title`, `domain`, `note`; `f` applies priority/price filter. Empty result: `EmptyState` "Aucun souhait ne correspond" with a "Effacer la recherche" button. Empty list (no wishes): existing dashed `Card` placeholders + `StickyNote` unchanged.
    - Layout: `.owner-split` = CSS grid `minmax(0, 1fr) var(--panel)` at >= 1200 only when `outlet` is present; otherwise single column. The grid column reflows (auto-fill) when the panel opens.
    - Panel: when `outlet` exists, desktop renders `<SidePanel ...>{outlet}</SidePanel>`; tablet renders the same `SidePanel` (drawer). The child (`WishDetail` / `WishForm`) receives its chrome through an outlet context (below), not its own `Screen`.
  - Outlet context (new, exported type from `OwnerList.tsx`):
    ```ts
    export interface OwnerListCtx {
      bp: Breakpoint
      listId: string
      /** wish ids in the current filtered order, for J/K */
      order: string[]
      /** navigates to the list, keeping ?q and ?f */
      closePanel: () => void
      /** which child hosts the footer: panel footer slot */
      setFooter: (node: ReactNode | null) => void
      setTitle: (title: string) => void
    }
    ```
    Children read it with `useOutletContext<OwnerListCtx | undefined>()`; undefined on mobile where they run standalone (see 5.13/5.14).
  - Selection & keyboard (desktop and tablet), via `useHotkeys`:
    `A` -> `/lists/:id/wishes/new`; `S` -> open share dialog; `J`/`K` -> select next/previous in `order` (starts at first if none; clamps at ends, no wrap) and `navigate(..., {replace: true})`; `E` -> `/lists/:id/wishes/:selected/edit` when a wish is selected; `Escape` -> `closePanel()` when an outlet is open; `/` handled by `AppShell`. Arrow Left/Right on a focused tile link behave like K/J (roving: the tile for the selected wish has `tabIndex=0`, others `-1`; with no selection the first tile has `0`). No `R`/`B` bindings on owner screens.
  - Paste-to-add: a `paste` listener on `document` (desktop+tablet only), ignored if target is an input/textarea/contenteditable or a dialog is open; if clipboard text matches `/^https?:\/\/\S+$/i` navigate to `wishes/new` with `state: { url }` (WishFields prefill, 5.13). Low priority work package.
  - Share: `ShareSheet` rendered through the dialog variant (5.2/5.15). `PartnerSheet`, both `ConfirmDialog`s: unchanged props.
  - Menu: the existing `Sheet` menu stays for mobile; desktop uses `Menu` (5.12) with the same rows (partner row, "Invités", "Mes listes", "Mon compte", delete/leave, `SignOutButton`). Same handlers, no new logic.
  - Unchanged: partner-join toast effect (`joinedName`), delete/leave `ConfirmDialog`s and mutations.

### 5.10 `web/src/pages/owner/Dashboard.tsx` (exists)
- mobile: unchanged JSX (Tabs, BottomBar, `dash-head`).
- tablet/desktop: no `Tabs`, no `dash-head`, no `BottomBar`. `PageHeader crumbs=[{label:'Mes listes'}] search actions={<ButtonLink to="/lists/new">Créer une liste <kbd>N</kbd></ButtonLink>}`. Body: greeting `dash-title` ("Bonjour {displayName}", h1 "Tes listes") with a summary line computed client side: nearest future `eventDate` among `mine.data` ("Noël dans 73 jours" using `daysUntil` from `lib/format`) and total `guestCount` ("8 proches ont ouvert ton lien"); omit the segment that cannot be computed.
- Two stacked sections, each an `<h2>` + `.list-cards` grid (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px`): "Mes listes · n" (existing `MineCard`, plus a final dashed "Nouvelle liste" card linking to `/lists/new`) and "Listes rejointes · n" (existing `JoinedCard`). The `?tab=joined` URL still works: it scrolls the joined section into view and the rail link in 5.4 targets it. Empty states reuse the existing `EmptyState`s.
- `?q=` filters both sections by title (and `ownerName` for joined).
- Hover/focus-within on `MineCard`: quick actions "Ouvrir" (the card link) and "Partager" (link to `/lists/:id` with `state={{ share: true }}`; `OwnerList` opens the share dialog on mount when `location.state?.share`, then clears it with `replace`). `MineCard` must still show only wish count and guest count; no claim data.
- Keyboard: arrow Left/Right move focus among cards (roving tabindex), Enter opens (native link). No extra letter shortcuts beyond global `N`.

### 5.11 `web/src/ui/OccasionHeader.tsx` and `ListTitle.tsx` (exist)
- `OccasionHeader`: add `compact?: boolean` and `hideBack?: boolean`. `compact` adds class `occasion-header--compact` (112px band, no fade, bar padding 12px 28px). `hideBack` omits the default back pill (the sidebar and breadcrumb replace it). Without these props output is unchanged. Guest screens currently pass `left={<span className="header-pill guest-pill">...}`; keep it at all widths.
- `ListTitle`: add `card?: boolean` -> adds class `list-title--card` (values in section 2). The kicker, h1 and meta line content are unchanged.

### 5.12 `web/src/ui/Menu.tsx` (new)
```ts
export function Menu({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }): JSX.Element
```
Anchored dropdown (no new dependency): button `aria-haspopup="menu" aria-expanded`, popover `role="menu"` positioned absolute under the trigger (right aligned), items `role="menuitem"` (reuse `.list-row` look), roving focus with ArrowUp/Down, Home/End, Escape closes and returns focus to the trigger, click outside closes, focus moves to the first item on open. Used only at >= 768 in `OwnerList`.

### 5.13 `web/src/pages/owner/WishForm.tsx` (exists)
- Keep `WishForm({ mode })` and `WishFields`. Add `const ctx = useOutletContext<OwnerListCtx | undefined>()`.
- Standalone (mobile, or any render without ctx): unchanged `Screen` with `top-bar`, `ScreenBody`, `BottomBar` (all current markup).
- Embedded (ctx present, i.e. tablet/desktop): `WishFields` renders `<form id="wish-form" onSubmit={submit}>` containing only the fields (image + title row, link row, price/note pair, priority fieldset, edit hint). No `Screen`, `top-bar`, `BottomBar`. It calls `ctx.setTitle(editing ? 'Modifier le souhait' : 'Nouveau souhait')` and `ctx.setFooter(...)` in an effect: footer = `[Supprimer ce souhait]` (edit only, ghost) + `Button variant="secondary"` "Annuler" (`<kbd>Échap</kbd>`, calls `ctx.closePanel()`) + `Button type="submit" form="wish-form"` "Enregistrer" / "Ajouter à ma liste" (`<kbd>⌘↵</kbd>`, `loading={save.isPending}`). The `ConfirmDialog` for delete stays in `WishFields`.
- `Cmd/Ctrl+Enter` saves: `onKeyDown` on the `<form>`: if `(e.metaKey || e.ctrlKey) && e.key === 'Enter'` -> `e.preventDefault(); formRef.current?.requestSubmit()`. Active at all widths where a physical keyboard is used (harmless on mobile; but add only in the embedded branch to keep mobile identical).
- Prefill: initial `url` state falls back to `(useLocation().state as {url?: string} | null)?.url` for `mode="new"`; if set, `fetchMeta` runs on mount (existing function).
- Focus: when the form mounts in the panel/drawer from a user action, focus the Titre input (mode new: the Lien input, so a pasted link is the first thing typed). 
- The preview-in-panel ("Aperçu en direct") from the design: a small live `WishCard layout="tile"` preview above the form on desktop only, fed from the current state (`title`, `domain`, `price`, `imageUrl`/`preview`, `note`, `priority`). Included, cheap; no claim info.
- Save success: see section 3.

### 5.14 `web/src/pages/owner/WishDetail.tsx` (new, export from `pages/Owner.tsx`)
```ts
export function WishDetail(): JSX.Element
```
- Reads `listId`, `wishId` from `useParams`, `useWish(listId, wishId)` (exists), `ctx = useOutletContext<OwnerListCtx | undefined>()`.
- No ctx (mobile deep link): `<Navigate to={`/lists/${listId}/wishes/${wishId}/edit`} replace />`.
- Loading: `Spinner`. Missing: `EmptyState` "Ce souhait est introuvable" with a button calling `ctx.closePanel()`.
- Content (panel body): large image (`WishFallback` when none), `PriceBadge` (exists), priority line "Coup de cœur" with heart when `priority === 'coeur'`, title (Fraunces, `h3`), domain + external link "Voir sur {domain}" (`target="_blank" rel="noopener noreferrer"`, only if `url` is http(s) as `WishSheet` does), note in Caveat. Information box (`hint-banner`): "Tes invités voient ce souhait. Tu ne sauras jamais s'il est pris." No author line, no claim state.
- Header actions via `ctx.setTitle(wish.title)`; position text "Souhait {i} sur {n}" with previous/next `IconButton`s (`aria-label="Souhait précédent"`/`"Souhait suivant"`) based on `ctx.order`.
- Footer via `ctx.setFooter`: `Button variant="outline"` "Supprimer" (opens a `ConfirmDialog`, same copy and mutation as `WishFields`: `useDeleteWish`) and `ButtonLink` "Modifier" (`<kbd>E</kbd>`) to `.../edit`.

### 5.15 Dialog content components (exist)
- `web/src/pages/owner/ShareSheet.tsx`: pass `variant="dialog" size="lg"` to `Sheet`. At >= 1200 the body becomes two columns (`.dlg-body` flex-wrap): left = existing link field ("Copier" button gets `<kbd>⌘C</kbd>` hint only visually, no new handler), share targets and `hint-banner`; right = partner summary (if shared: `AvatarPair`, "Liste à deux avec {other}", "Gérer" button calling a new optional prop `onManagePartner`) and "Tes invités · n" list rendered by a new extracted `GuestRows` component. Footer: "Terminé" button closes (`<kbd>Échap</kbd>` hint). The "Voir les invités" link remains for < 1200.
- `web/src/pages/owner/Guests.tsx`: extract the list markup into `export function GuestRows({ listId }: { listId: string })` (new, same file or `owner/GuestRows.tsx`) using `useMembers`; `Guests` page uses it unchanged for mobile. Guest rows show only displayName and join date (existing); no claim info.
- `web/src/pages/owner/PartnerSheet.tsx`: `Sheet` call gets `variant="dialog" size="md"`; content unchanged.
- `ConfirmDialog` (in `Sheet.tsx`): `variant="dialog" size="sm"` (5.2).
- `web/src/pages/owner/NewList.tsx` and `web/src/pages/Account.tsx`: render inside the shell with the same `Screen`; at >= 768 add class `screen--narrow` via CSS on `.screen-body` (max-width 560px, margin auto), `top-bar` back button hidden when the sidebar is visible (CSS `display:none` is acceptable here because these two bars are page chrome, not duplicated actions), and `BottomBar` rendered in flow (CSS `position: static`) at the end of the narrow body. `PageHeader` with crumbs is added to both (`Mes listes / Nouvelle liste`, `Mon compte`). Behaviour and mutations unchanged. (If time is short, ship with only the narrow-column CSS.)

### 5.16 Guest side
- `web/src/pages/guest/GuestList.tsx` (exists, `Resolver` + `GuestList` + `GuestCard`):
  - mobile: unchanged.
  - tablet/desktop: Guest shell. `GuestList` is rendered in the same `AppShell`-like frame but guests may be anonymous (no `RequireAccount`). Add `GuestShell` (new, `web/src/ui/GuestShell.tsx`): same grid as `AppShell` but `Sidebar` shows only "Listes rejointes" (from `useJoined()` when available) plus a "Créer ma liste" link to `/signup`; `Resolver` wraps `GuestList` output in it at >= 768. Not used for `JoinScreen`, `NotFound`, `LoadError`.
  - `PageHeader crumbs=[{label:'Listes rejointes', to:'/app?tab=joined'} (only when account; plain text label for anonymous), {label:title}] search`. `OccasionHeader compact` keeps the existing "{myName} · invitée" pill; `ListTitle card`.
  - Existing `change-banner` stays; a "Voir" button filters chips to the changed ones (sets `?f=changed`).
  - Chips: "Toutes · n", "Libres · n", "Prises par moi · n", "Achetées · n" (+ "Modifiées · n" when n > 0), `?f=` values `free`, `mine`, `bought`, `changed`. Computed from `claimByWish` already in the component. This is a guest view, claim state is allowed.
  - Grid of `GuestCard` with `layout="tile"`; footer buttons as today; the stretched link goes to `/l/:slug/wish/:wishId` with `state: { fromList: true }` (unchanged).
  - `upgrade-prompt` (`aside`): at desktop it moves into the detail panel body (below the actions) when a panel is open, and otherwise stays where it is; mobile unchanged. The "C'est noté. Chut !" `noted` status tag renders inside the content area top-right (CSS position) with an "Annuler" action that calls `actions.unclaim` on the wish just claimed (5 s, reusing `noted` timer; keep `role="status"`). If `useGuestActions` exposes no unclaim, use `release(wishId)` (exists, used in `WishSheet.confirmRelease`).
  - Keyboard (desktop+tablet): `J`/`K` select next/previous idea (replace navigation to `/l/:slug/wish/:id` with `state: { fromList: true }`), `R` reserves the selected free wish (`actions.claim`), `B` marks the selected wish bought if it is mine and not purchased (`actions.markPurchased`), `Escape` closes the panel. `R` and `B` do nothing when the state does not allow it (no toast spam; at most `aria-live` text "Déjà pris").
- `web/src/pages/guest/WishSheet.tsx` (exists): keep component and route. At >= 768 render via `SidePanel` (title = wish title) instead of `Sheet` (`Sheet` branch kept for mobile). Body content and modes (`detail`, `release`, `bravo`) are reused as is; the large action buttons move from body to the `footer` slot (`Je m'en occupe  R`, `J'ai acheté  B`, `Libérer`). `close()` logic unchanged. Panel content retains the plum "Les autres invités verront..." note for guests.

### 5.17 `web/src/App.tsx` (exists)
Route block of section 3, lazy `WishDetail`, import `AppShell`, remove `acct`. `Resolver` stays at `/l/:slug` with its child; `GuestShell` wrapping happens inside `Resolver`/`GuestList`, not in routes.

### 5.18 `web/src/ui/index.ts` (exists)
Add exports: `AppShell`, `Sidebar`, `PageHeader`, `SidePanel`, `Menu`, `ShortcutsDialog`, `GuestShell`. `useBreakpoint` and `useHotkeys` are imported from `lib/`.

### 5.19 `web/src/ui/README.md` (exists)
Append a short section documenting the new components and the "owner never shows claims" rule for tiles.

## 6. CSS structure

`desktop.css` outline (all selectors prefixed by component, no element selectors, no `!important`):

```
@media (min-width: 768px) {
  .app-shell { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); min-height: 100dvh; background: var(--bg); }
  .app-shell__main { min-width: 0; display: flex; flex-direction: column; }
  .rail, .sidebar { position: sticky; top: 0; height: 100dvh; ... }
  .page-header { ... } .search { ... } .kbd { display: none }
  .content { width: 100%; max-width: var(--content-max); margin: 0 auto; padding: 0 28px 40px; }
  .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 20px; padding: 0; list-style: none }
  .wish-card--tile { ... } .wish-card--tile .wish-card__media { width: auto; height: 130px; border-radius: 15px 15px 0 0 }
  .occasion-header--compact { height: 112px } .occasion-header--compact .occasion-header__fade { display: none }
  .list-title--card { padding: 14px 18px 0; margin: -28px 0 0 -18px; border-radius: 18px 18px 0 0; background: var(--bg); position: relative }
  .dialog-overlay, .dialog, .drawer, .dialog__head/.body/.foot ...
  .screen-body (inside .app-shell) { max-width: var(--content-max) ... }   /* NewList/Account narrow variant */
}
@media (min-width: 1200px) {
  .app-shell { grid-template-columns: var(--sidebar) minmax(0, 1fr); }
  .tile-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); }
  .owner-split { display: grid; grid-template-columns: minmax(0, 1fr); } .owner-split--panel { grid-template-columns: minmax(0, 1fr) var(--panel); }
  .side-panel { position: sticky; top: 0; height: 100dvh; border-left: 1px solid var(--line); background: var(--surface); ... }
}
@media (min-width: 1200px) and (hover: hover) and (pointer: fine) { .kbd { display: inline-flex } }
@media (hover: hover) { .wish-card--tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg) } .wish-card--tile:hover .wish-card__quick, ... }
.wish-card--tile:focus-within .wish-card__quick { opacity: 1 }     /* inside the 768 query */
@media (prefers-reduced-motion: reduce) { .wish-card--tile:hover { transform: none } }
```
Because `.app-shell__main` hosts `.occasion-header`, the band spans the full main width (edge to edge) while `.content` constrains the body. The panel is a grid column of `.owner-split`, so the tile grid reflows when it opens; there is no overlay and no `box-shadow` or `border-radius` on `.side-panel` at >= 1200. The sidebar, header band and panel are sticky/`100dvh` so only the grid column scrolls on tall lists (use `overflow: auto` on `.owner-split > :first-child` only if page scroll proves awkward; default is normal document scroll with sticky sidebar/panel).

Dark theme: only tokens differ; no hard-coded colours except the occasion band (existing `themeFor`). Verify contrast of kbd hints (opacity .65 on `--muted`) in both themes.

## 7. Keyboard behaviour

7.1 Matrix (all disabled < 768; ignored in text fields unless noted; ignored while a modal dialog is open except Esc):

| Key | Owner | Guest | Action |
|---|---|---|---|
| `N` | everywhere in shell | n/a (anonymous) / account guests: link to `/signup` is not a shortcut | go to `/lists/new` |
| `A` | list screen | n/a | go to `.../wishes/new` |
| `S` | list screen | n/a | open share dialog |
| `/` | any screen with a search box | same | focus search, select its text |
| `J` / `K` | list screen | guest list | select next / previous wish (replace navigation, no focus steal) |
| `E` | list, wish selected | n/a | edit selected |
| `R` | no-op | guest list, wish selected and free | reserve (`actions.claim`) |
| `B` | no-op | selected wish is mine and not purchased | mark bought (`actions.markPurchased`) |
| `Esc` | panel open -> close; search focused -> clear; dialog -> Radix closes | same | close |
| `?` | shortcuts dialog | same | open (Shift+/) |
| `Cmd/Ctrl+Enter` | in wish form | n/a | submit (works while typing) |

7.2 Deliberate absences: no shortcut deletes anything (Supprimer always goes through the confirmation dialog); no shortcut on the owner screens touches claims.
7.3 Search scope: `/app` (list titles; joined titles and owner names), `/lists/:id` (wish title, domain, note), `/l/:slug` (wish title, domain; claim-agnostic). Matching is a case/accents-insensitive `includes`. No highlight, no ranking.
7.4 Hint visibility: kbd badges only at >= 1200 with `(hover: hover) and (pointer: fine)`.

## 8. Accessibility

- Landmarks: skip link first in tab order, `<nav aria-label="Navigation principale">` (sidebar/rail), `<main id="main">`, `<header>` (page header) containing `<nav aria-label="Fil d'Ariane">`, detail panel `<aside aria-label="{title}">`. Exactly one `h1` per page (the list/dashboard title); the panel title is `h2`.
- Tab order (as in the design): skip link, sidebar, page header (crumbs, search, actions), filter chips, grid (one tab stop via roving tabindex; Left/Right/J/K inside), panel. Tab from the grid goes to the panel; Shift+Tab returns to the selected tile.
- Desktop panel is non-modal: no focus trap, no `aria-modal`, page behind stays interactive. Tablet drawer and all dialogs are modal (Radix: trap, `aria-modal`, `Esc`, labelled by title via `Dialog.Title`, described by `Dialog.Description`).
- Focus rules: opening panel by click/Enter/E/A moves focus to the panel `h2` (form: first field); selecting with J/K or arrows keeps focus on the grid; closing returns focus to the originating tile link, else the grid container; closing a dialog returns focus to its trigger (Radix) or the list header actions button when opened by a shortcut (store `document.activeElement` before opening).
- Live regions: search result count `aria-live="polite"` ("12 souhaits", "Aucun souhait ne correspond"); position text "Souhait 3 sur 12" is in the header and announced with `aria-live="polite"` only on J/K selection; existing `role="status"` regions (`noted`, link lookup) kept.
- Tiles: the title link has an accessible name of the wish title; `quick` buttons have explicit `aria-label`s including the title; `aria-current="true"` for the selected tile; hover-only affordances are also revealed by `:focus-within`.
- Owner secrecy in AT: no sr-only text, `title` attributes or labels may mention reservations on owner screens.
- State is never colour only (existing rule): selected tile = outline + `aria-current`; active nav = indicator bar + `aria-current="page"`; filter chips use `role="radio"` with `aria-checked`.
- Targets: nav items 40px, header buttons 40px (desktop pointer), rail 48px, tiles whole-card clickable; touch sizes on mobile unchanged (44/52px).
- `prefers-reduced-motion` honoured (section 2); dark mode via tokens only.
- Page title (`document.title`) is not set by the app today; out of scope.

## 9. Acceptance criteria

General notes for testers: browser devtools responsive mode at 375x812, 1024x768, 1440x900, light and dark (`prefers-color-scheme`). Account with at least one own list (12 wishes incl. 3 "coup de coeur" and 2 without price, one guest joined), one joined list (with one claim by the tester), and a second browser profile as a guest. Build gate: `cd web && npm run build && npm run lint` pass.

### 9.1 Mobile, 375px (regression gate)
- Every screen is visually and structurally identical to `main` before this work: `/`, `/signup`, `/login`, `/app` (both tabs), `/lists/new`, `/lists/:id`, `/lists/:id/wishes/new`, `/lists/:id/wishes/:w/edit`, `/lists/:id/guests`, `/account`, `/l/:slug`, `/l/:slug/wish/:w`, `/partner/:token`.
- No sidebar, no rail, no PageHeader, no search, no kbd hints. Sticky BottomBar present on list/dashboard/forms. Bottom sheets (vaul) with drag handle for share, partner, confirm, menu, guest wish sheet.
- Keyboard shortcuts do nothing (typing `n`, `a`, `/`, `?` has no effect).
- `/lists/:id/wishes/:w` redirects to `.../edit`. Edit/new open full-page as before; Back from edit returns to the list; save returns to the list (replace).
- Toasts appear top-center.
- Resize from 1440 to 375 live: layout switches to the mobile UI without reload errors; an open panel/drawer closes its presentation but the URL stays valid (full-page form or redirect).

### 9.2 Tablet, 1024px
- `/app`: 72px icon rail at left (no labels; tooltips and aria-labels present); page header with breadcrumb "Mes listes", search, "Créer une liste" button; no Tabs, no BottomBar; cards in a grid with at least 2 columns; "Listes rejointes" section below with plum "N pris par toi" badges.
- `/lists/:id`: compact 112px band, title card overlapping with both top corners rounded, header actions "Ajouter un souhait" and "Partager" (40px), chips, grid of tiles with min column 190px (3 columns at 1024 minus rail).
- Click a tile: URL becomes `/lists/:id/wishes/:w`, a modal 420px drawer opens from the right with scrim; focus is inside; Tab cycles inside the drawer; Esc closes it, URL returns to `/lists/:id` (query kept), focus returns to the tile.
- "Ajouter un souhait" opens the form in the drawer (`/wishes/new`); pasting a URL in "Lien" fills title/image/price as today; Cmd+Enter saves; after save the drawer shows the new wish detail (or closes if the id is unavailable).
- Share opens a centered dialog (not a bottom sheet), Esc closes.
- Browser Back after opening a tile returns to the list with the drawer closed. Reloading on `/lists/:id/wishes/:w` shows list + drawer.
- No kbd hints visible (below 1200). Shortcuts N, A, S, /, J, K, E, ? work with a hardware keyboard.
- Toasts appear top-right.

### 9.3 Desktop, 1440px
- Shell: 248px sidebar with logo, "Créer une liste N", "Mes listes" (swatch, title, wish count), "Listes rejointes" (plum "N pris par toi" only where the tester holds claims), footer with avatar + "Mon compte" and "?" button. Active list highlighted with `aria-current="page"`. Content max width 1280 centered.
- `/app`: header with breadcrumb, search (`/` focuses it), "Créer une liste" button with `N` hint; summary line; card grid; "Nouvelle liste" dashed card; joined section. `?q=noël` filters both sections.
- `/lists/:id`: tiles in auto-fill grid (210px min, 20px gap). Hover a tile: lifts 2px (not with reduced motion) and shows Modifier/Supprimer quick actions; Tab onto a tile shows them too. **No tile, tooltip, count, chip or panel text on this screen mentions reservations/claims.**
- Click or Enter on a tile: persistent 400px panel appears flush right, one 1px left divider, no shadow, no rounded corners, no margin around it; the grid reflows to the remaining width; the page behind stays interactive (click another tile swaps panel content without closing). URL tracks `/wishes/:id`. Panel shows "Souhait i sur n", prev/next, image, price, title, link, note, the "Tes invités voient ce souhait. Tu ne sauras jamais s'il est pris." box, footer "Supprimer" and "Modifier E".
- Keys: `J`/`K` move the selection (outline 2.5px primary, panel updates, focus stays on the grid, Back history does not grow), `E` opens the edit form in the panel, `A` opens new, `S` opens the share dialog, `Esc` closes the panel and puts focus back on the selected tile, `/` focuses search, `?` opens the cheat sheet, `N` goes to `/lists/new`. None of these fire while typing in the title field or search. In the form, Cmd+Enter saves; footer shows "Annuler Échap" and "Enregistrer ⌘↵".
- Share dialog: centered, 860px wide, two columns (link/targets/hint on the left; partner summary and "Tes invités · n" on the right), Esc closes, focus trapped, "Terminé" closes. Partner dialog and delete confirmations are centered dialogs (440-560px), with the same copy as mobile.
- Title card: overlaps the band by about 28px with 18px radius on both top corners and 18px left overhang; heading text aligned with the grid's left edge.
- Filters: "Coup de cœur · 3" shows 3 tiles, "Sans prix · 2" shows 2; `?f=` survives opening a panel; typing in search narrows tiles live and the count is announced.
- Guest view `/l/:slug` (as joined guest): tiles show "Pris par {nom}" / "Acheté par {nom}" with plum/green styling; chips "Toutes/Libres/Prises par moi/Achetées"; clicking a tile opens the same flush panel; `R` reserves a free selected wish (tile updates to "Pris par toi", toast "C'est noté. Chut !" top-right with Annuler for 5 s), `B` marks bought, "Libérer" opens the release confirmation inside the panel; anonymous users see "Garde ta réservation" prompt in the panel; the owner of the list opening this URL is redirected to the owner view (unchanged).
- Public screens (`/`, `/login`, `/signup`, join, partner) remain a centered 480px column.
- Dark mode: all of the above legible, no light-only colours, panel/dialog/drawer surfaces use `--surface`.
- Console: no React warnings (keys, act, hydration), no failed network calls caused by the new code.

## 10. Work packages (ordered, independent where noted)

Each package ends with `cd web && npm run build && npm run lint` green and a mobile spot check at 375px. Do not commit unless asked. WP numbering is the implementation order; "depends" lists hard dependencies.

**WP1. Tokens and breakpoint hook**
- Files: `web/src/styles/tokens.css` (edit), `web/src/lib/useBreakpoint.ts` (new), `web/src/styles/desktop.css` (new, empty media blocks + `.kbd` base), `web/src/index.css` (edit: import).
- Done: tokens present in light and dark; `useBreakpoint()` returns the correct value at 375/1024/1440 and updates on resize; no visual change anywhere.

**WP2. Hotkeys hook and shortcuts dialog shell**
- Files: `web/src/lib/useHotkeys.ts` (new). Depends: WP1.
- Done: all seven rules of 4.2 hold (verify with a temporary binding or by use in WP6); no-op below 768.

**WP3. Sheet variants (dialog and drawer)**
- Files: `web/src/ui/Sheet.tsx` (edit), `web/src/styles/desktop.css` (dialog/drawer rules), `web/src/pages/owner/ShareSheet.tsx`, `web/src/pages/owner/PartnerSheet.tsx` (edit: pass variant/size). Depends: WP1.
- Done: at 375 all sheets are vaul bottom sheets exactly as before; at 1024 and 1440 share/partner/confirm are centered dialogs with trap, Esc, overlay click, focus return, visible title; `size` widths match 2.

**WP4. AppShell, Sidebar/rail, route restructure**
- Files: `web/src/ui/AppShell.tsx`, `web/src/ui/Sidebar.tsx` (new), `web/src/App.tsx` (edit routes per section 3, except `WishDetail`), `web/src/styles/base.css` (edit: `:has` rule), `web/src/styles/desktop.css`, `web/src/ui/index.ts`. Depends: WP1, WP2.
- Done: owner routes render inside the shell at >= 768 (rail at 1024, sidebar at 1440) and unchanged at 375; public routes unchanged; sidebar data live; active item `aria-current`; `N` and skip link work; the shell route wraps `RequireAccount` (signed-out access still redirects to `/login` with `state.from`).

**WP5. PageHeader, SearchBox, compact header and title card**
- Files: `web/src/ui/PageHeader.tsx` (new), `web/src/ui/OccasionHeader.tsx`, `web/src/ui/ListTitle.tsx` (edit), `web/src/styles/desktop.css`, `web/src/ui/index.ts`. Depends: WP4.
- Done: component renders breadcrumb, search bound to `?q=` (debounced, `/` focuses, Esc clears), actions slot; `compact`, `hideBack`, `card` props add classes only; defaults unchanged output.

**WP6. Wish tile and dashboard**
- Files: `web/src/ui/WishCard.tsx` (edit), `web/src/pages/owner/Dashboard.tsx` (edit), `web/src/pages/owner/owner.css`, `web/src/styles/desktop.css`. Depends: WP5.
- Done: `WishCard layout="tile"` per 5.7 (default row output unchanged); dashboard per 5.10 at >= 768 with search filtering; mobile Dashboard JSX unchanged.

**WP7. SidePanel and Menu**
- Files: `web/src/ui/SidePanel.tsx`, `web/src/ui/Menu.tsx` (new), `web/src/styles/desktop.css`, `web/src/ui/index.ts`. Depends: WP3.
- Done: desktop non-modal flush panel (single left border, no shadow/radius/margin); tablet drawer via `Sheet variant="drawer"`; focus rules of 5.8 and 8; Menu keyboard behaviour of 5.12.

**WP8. OwnerList master/detail and WishDetail**
- Files: `web/src/pages/owner/OwnerList.tsx` (edit: split, outlet, grid, chips, hotkeys, menu, context), `web/src/pages/owner/WishDetail.tsx` (new), `web/src/pages/Owner.tsx` (edit: export), `web/src/App.tsx` (edit: nested child routes + lazy), `web/src/pages/owner/owner.css`. Depends: WP4-WP7.
- Done: sections 3, 5.9 and 5.14; mobile `OwnerList` output identical (`useOutlet` early return); J/K/E/A/S/Esc behave as 7.1; no claim text anywhere; Back/refresh/deep link on `/wishes/:id` work; chips and `?q` filter.

**WP9. WishForm embedded mode**
- Files: `web/src/pages/owner/WishForm.tsx` (edit). Depends: WP8.
- Done: form works standalone on mobile unchanged and embedded in panel/drawer with footer buttons, Cmd+Enter, URL prefill state, live preview (desktop), delete confirmation, save navigation of section 3.

**WP10. Share dialog, guests rows, partner dialog polish, menu rows**
- Files: `web/src/pages/owner/ShareSheet.tsx`, `web/src/pages/owner/Guests.tsx` (edit: extract `GuestRows`), `web/src/pages/owner/OwnerList.tsx` (edit: pass `onManagePartner`, `state.share`), `web/src/styles/desktop.css`. Depends: WP3, WP8.
- Done: 5.15 two-column share dialog at >= 1200; `/lists/:id/guests` page unchanged on mobile and works as a page at all widths; guests list shows names and join dates only.

**WP11. NewList and Account in the shell**
- Files: `web/src/pages/owner/NewList.tsx`, `web/src/pages/Account.tsx` (edit: PageHeader + breakpoint branches), `web/src/styles/desktop.css`. Depends: WP5.
- Done: both screens centered at 560px with breadcrumb at >= 768, actions in flow; mobile unchanged.

**WP12. Shortcuts dialog and toaster position**
- Files: `web/src/ui/ShortcutsDialog.tsx` (new), `web/src/ui/AppShell.tsx` (edit: `?`), `web/src/ui/Toast.tsx` (edit), `web/src/ui/index.ts`. Depends: WP2, WP3, WP4.
- Done: `?` opens the dialog with content of 4.3 (owner vs guest context); Esc closes; toasts top-right from 768.

**WP13. Guest desktop view**
- Files: `web/src/ui/GuestShell.tsx` (new), `web/src/pages/guest/GuestList.tsx` (edit), `web/src/pages/guest/WishSheet.tsx` (edit), `web/src/styles/guest.css` (edit, media queries only), `web/src/styles/desktop.css`. Depends: WP5-WP7.
- Done: 5.16 and the guest bullets of 9.3; `Join`, `NotFound`, `LoadError` still in the 480 column; mobile unchanged; R/B/J/K behave; "C'est noté" with Annuler.

**WP14. Paste-to-add link (optional)**
- Files: `web/src/pages/owner/OwnerList.tsx` (edit). Depends: WP9.
- Done: pasting an http(s) URL on the list screen (not in a field, no dialog open) opens `wishes/new` with the URL prefilled and the lookup run.

**WP15. Docs and final QA**
- Files: `web/src/ui/README.md` (edit). Depends: all.
- Done: README updated; run the full section 9 checklist at 375, 1024, 1440 in light and dark; `npm run build` and `npm run lint` green; verify via grep that no file under `web/src/pages/owner/**` or the owner branch of shared UI imports `Tag variant="claimed"|"purchased"`, "Pris par" or "Acheté par".

## 11. Risks and decisions to flag

- `.app-column:has(> .app-shell)` needs `:has()` support (all current evergreen browsers; fallback is a 480px column, still usable). If a fallback is wanted, `Layout` can add a class from `useLocation` instead.
- Mobile identity relies on `AppShell` returning a bare `<Outlet/>` and `Sheet` keeping the vaul branch verbatim. Reviewers must diff mobile DOM (`document.body.innerHTML` before/after at 375 on the 6 owner screens).
- `OwnerList` becoming a layout route changes its remount behaviour: ensure queries (`useList`, `useWishes`) are not re-subscribed on child navigation (they live in `OwnerListView`, which stays mounted across child route changes).
- Wish `rev`/`lastChange`, author and creation date are not available for "Ajouté par" and "ajout récent" (section 1).
- `useSaveWish` return value is unverified for create-then-select; WP9 must read `web/src/data/mutations.ts` first and use the fallback in section 3 if it returns nothing.
