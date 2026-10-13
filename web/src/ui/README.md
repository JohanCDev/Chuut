# UI kit

Import everything from `../ui`. Tokens live in `src/styles/tokens.css` (light + dark via `prefers-color-scheme`), component CSS in `src/styles/components.css`. Libraries: Radix (Checkbox, Tabs), vaul (Sheet), sonner (toast), canvas-confetti, lucide-react (import icons from `lucide-react` directly).

Rules: owner screens never show the plum `claimed` Tag. Every state = icon + label. Touch targets 44px+. Copy in French, no em-dashes.

## Page skeleton

```tsx
<Screen>                       // full-height column inside .app-column (Layout provides it)
  <OccasionHeader type="christmas" backTo="/app" right={<HeaderRound label="Menu du compte" to="/account"><User /></HeaderRound>} />
  <ScreenBody>                 // padded, flex column, gap 16
    <ListTitle ownerName="Léa" title="Noël 2026" eventDate="2026-12-25" wishCount={3} type="christmas" />
    <div className="wish-list"><WishCard ... /></div>
  </ScreenBody>
  <BottomBar><Button large>Ajouter un souhait</Button><Button large variant="secondary">Partager</Button></BottomBar>
</Screen>
```
Plain screens (forms) use `<TopBar />` instead of `OccasionHeader`. Layout and Toaster are mounted in `pages/Shell.tsx`.

## Components

- `Button` props: `variant` primary | secondary (green outline) | outline (ink outline) | social | dark | ghost | danger | link, `large` (52px), `full`, `loading`, plus button attrs. `ButtonLink` same look with `to`. `IconButton` `label` (aria, required), `bare`.
- `BottomBar` sticky footer. Props: `stacked` (column), `plain` (no top border), `note` (small text under actions). Primary button grows in a row. Put it inside the `<form>` for submit buttons.
- `TopBar` round back button (`onBack`, default history back), `hideBack`, `center`, `right`.
- `Field` `label`, `hint`, `error`, children = `TextInput` | `TextArea` | `Select` (pass normal input attrs). `Checkbox` `checked`, `onCheckedChange`, `label`, `description`, `required`.
- `Card` `pad`, `flat`, `dashed` (empty slot). Row groups: classes `list-group` + `list-row` (+ `list-row--danger`, `list-row__value`), see Account.
- `WishCard` `title`, `domain`, `note`, `price`, `imageUrl` (fallback illustration if absent), `priority` (heart for `coeur`), `to` (whole card links), `dimmed`, slots `tag` (state tags), `action` (44px trailing control bottom-right), `footer` (buttons row). Wrap lists in `<div className="wish-list">`.
- `Tag` `variant` claimed (plum, guest only) | purchased | warning | neutral, optional `icon`, `still`. Auto icon per variant.
- `PriceBadge` `price`, `seed`, `inline`. `formatPrice` is used inside.
- `OccasionHeader` `type` (ListType), `backTo`/`backLabel` (default "Mes listes"; omit `backTo` = history back), `left` (custom, replaces back pill), `right`. Helpers `HeaderPill` (`to` | `onClick` | static) and `HeaderRound` (`label`, `to` | `onClick`).
- `ListTitle` `ownerName`, `title`, `eventDate` (YYYY-MM-DD), `wishCount`, `extra` (string[] more meta parts), `type` (accent colour).
- `Sheet` `open`, `onOpenChange`, `title` (required, `hideTitle` for sr-only), `description`. Route-driven sheets: `open` true + navigate in `onOpenChange(false)`. `ConfirmDialog` `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `cancelLabel`, `loading`, `onConfirm` (closes after it resolves).
- `StickyNote` `arrow="down"`, `rotate`. `HintBanner` `title` (Caveat) + children (e.g. "Pas de spoiler ici").
- `Avatar` `name`, `size` sm | md | lg. `AvatarPair` `names` (2), `size` sm | md, overlapped initials for shared lists. `Tabs`/`TabList`/`Tab`/`TabPanel` (Radix, pill style, `value`/`onValueChange`). `EmptyState` `title`, children, `illustration`, `action`. `Spinner` `page`, `label`. `Logo` `size`, `to`, `color`.
- `toast('Lien copié')`, `toast.error(...)` (sonner). `fireConfetti()` for purchased, 16 pieces, 900ms, no-op with reduced motion.
- Illustrations: `WishFallback`, `GiftBox`, `EmptyBox`.

## lib

- `lib/format.ts`: `formatPrice(39.9)` "39,90 €", `formatDate('2026-12-25')` "25 décembre", `formatShortDate`, `daysUntil`, `countdownLabel` "plus que 74 jours", `plural`, `wishCountLabel`, `guestCountLabel`, `initialOf`.
- `lib/theme.ts`: `themeFor(listType)` -> `{ label, accent, ink, header }` (Noël, Anniversaire, Autre patterns).
- `lib/cn.ts`: class joiner.


## Tablet and desktop layout

Breakpoints: below 768px mobile (unchanged), 768-1199px tablet (icon rail, modal drawer), 1200px and up desktop (sidebar, persistent panel). Use `useBreakpoint()` (`lib/useBreakpoint.ts`) only where the JSX differs; layout-only differences live in `styles/desktop.css` inside min-width media queries.

- `AppShell`: layout route for owner screens. Bare `<Outlet />` on mobile, `Sidebar` (desktop) or rail (tablet) beside `<main id="main">` above that. `GuestShell` is the same frame for the guest list.
- `Sidebar`: lists, joined lists (with the user's own "N pris par toi" badge), account link. `collapsed` renders the rail.
- `PageHeader`: breadcrumb, optional search bound to `?q=` (`/` focuses it), and an `actions` slot that replaces `BottomBar` at >= 768. Pages render `BottomBar` only on mobile.
- `SidePanel`: flush right detail panel on desktop (non-modal, one left border), modal drawer on tablet. Children can render their footer into it with `createPortal` (see `OwnerListCtx.footerEl`).
- `Menu` / `MenuItem`: anchored dropdown with roving focus.
- `Sheet` takes `variant` (`auto`, `dialog`, `drawer`, `sheet`) and `size` (`sm`, `md`, `lg`). Mobile is always the vaul bottom sheet.
- `WishCard layout="tile"` for the grid; `quick` shows on hover and focus-within.
- `ShortcutsDialog` (`?`) and `useHotkeys` (`lib/useHotkeys.ts`): single-letter shortcuts are ignored while typing and on mobile.

Owner screens never reveal claim state: no claimed or purchased tags, counts or labels at any width. Plum (claimed) is guest-only.
