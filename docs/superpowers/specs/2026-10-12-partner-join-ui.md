# Partner join screen, UI redesign (`/partner/:token`)

Replaces the visual design of `web/src/pages/owner/PartnerAccept.tsx`. Behaviour (data, auth chain, error codes, onboarding redirect, success toast) stays as in `2026-10-12-shared-lists-ux.md` section 3, except where noted below. Viewport target: 410px wide, mobile first. Light and dark via tokens.

## 0. Why the current screen looks bad

1. **Root cause: the hero CSS is missing.** `.join-hero*`, `.join-intro` live in `styles/guest.css`, which is imported only by the guest bundle (`pages/Guest.tsx`). `PartnerAccept` is in the owner bundle. On a cold open of a partner link (the normal case), the hero divs render as empty static blocks and the h1 sits flush against the screen edge with no padding.
2. Three icon bullets (`.partner-facts`) are a pattern that appears nowhere in the MVP design. They read like a terms list.
3. The h1 is long and puts the list title in quotes ("Anna te propose de gérer « Noël 2026 » à deux"), plus a redundant "Liste à deux" kicker.
4. Actions sit in a sticky `BottomBar` with a muted paragraph inside it, far from the content they answer. The design's join screen keeps actions in the flow, right under the question.
5. "Changer de compte" uses `Button variant="link"`, which is plum. Plum is reserved for guest claims; this is an owner screen.

## 1. PDF references (`Chut MVP Design.pdf`, 23 pages)

| Page | Screen | What we take |
|---|---|---|
| **13** | Guest invite / join ("Léa t'invite à sa liste de Noël") | Main template: occasion ribbon hero, Fraunces h1 overlapping the fade, one meta line "4 idées · 25 décembre", actions in the flow (primary, "ou" divider, green outline secondary), a hand-written note pinned at the bottom. |
| **20** | Guest to account ("Camille, on garde tout") | Preview panel structure: small uppercase eyebrow title, then a row "icon + bold name + sub line", then a short reassurance sentence. We reuse the structure, in owner colours (no plum). |
| **9** | Share sheet (owner) | Owner-side secrecy note: surface-alt card with a Caveat line "Tu ne verras jamais qui prend quoi." and a small muted line under it (`.hint-banner--stack`). Replaces the plum lips note of p13 on this owner screen. |
| **4 / 21** | Dashboard list cards | "Liste de X" in Caveat above a Fraunces title: the preview card mirrors how the list will look once shared. |
| **3** | Onboarding | Confirms the chain (signup, then name, then back here) and the 2rem h1 size for form screens. |
| **23** | "Cette liste est introuvable" | Error template, already implemented by `NotFound` and `PartnerError`: logo top left, illustration, 2rem h1, fs-18 muted body, stacked primary + secondary at the bottom. Kept. |
| 12 / 18 | Confirm sheets | Checked; not used. Accepting is a full page entry point (cold link), not an in-app confirmation, so a sheet does not fit. |

## 2. Layout per state (top to bottom)

Examples: Anna (creator) invites Tom. Christmas list "Noël 2026", 4 wishes, 25 décembre.

### Common top (all non-error states)

1. **Hero**: `join-hero join-hero--short` (240px, occasion pattern via `themeFor(type).header`, ribbon and bow, fade to `--bg`). Decorative, `aria-hidden`.
2. **Intro** (`join-intro`, overlaps the fade by 34px):
   - h1 (2rem, balanced): headline by type
     - christmas: "Anna veut gérer sa liste de Noël avec toi"
     - birthday: "Anna veut gérer sa liste d'anniversaire avec toi"
     - other: "Anna veut gérer sa liste « {title} » avec toi"
   - meta `.muted.small`: "4 idées · 25 décembre" (date omitted when null; same rule as Join).
3. **Preview card** (`.partner-preview`), inside `.partner-join` (padding 20, gap 14):
   - eyebrow: "CE QUE VERRONT TES PROCHES"
   - row: `AvatarPair` (md: Anna, Tom; signed out or anonymous: Anna, "?") + text column:
     - Caveat, primary colour: "Liste de Anna et Tom" (signed out / anonymous: "Liste de Anna et toi")
     - Fraunces 22: "Noël 2026"
   - note under a hairline: "Vous ajoutez et modifiez les souhaits tous les deux."

### Common bottom (all non-error states)

**Foot** (`.partner-join__foot`, pushed to the bottom with `margin-top: auto`): `.hint-banner.hint-banner--stack`
- Caveat: "Tu ne verras jamais qui prend quoi."
- small: "Comme Anna, tu vois seulement qui a rejoint la liste."

### State A: signed out (`!user`)

Between card and foot:
1. `p.muted.small`: "Pour gérer une liste, il te faut un compte. Le lien t'attend ici."
2. Primary `ButtonLink large full` "Créer mon compte" to `/signup`, `state={{ from: pathname }}`
3. `.divider` "ou"
4. Secondary (green outline) `ButtonLink large full` "J'ai déjà un compte" to `/login`, same state.

### State B: anonymous guest (`user.isAnonymous`)

Same as A, only the sentence changes:
"Crée ton compte pour gérer la liste. Tes réservations sont gardées."

### State C: signed in, profile complete (ready)

Between card and foot:
1. (only after a generic accept failure) `p.error[role=alert]`: "Une erreur est survenue. Réessaie."
2. Primary `Button large full` "Accepter l'invitation" (`loading` while accepting).
3. `p.partner-join__who`: "Tu rejoins en tant que **Tom**." + inline text button "Changer de compte" (green, underlined, 44px tall). Same action as today: sign out, then `/login` with `from`.

Signed in with incomplete profile: unchanged, `<Navigate to="/onboarding" ...>`.

Success: unchanged. Navigate to `/lists/{listId}` and toast "C'est fait, vous gérez « Noël 2026 » à deux".

### State D: loading

Unchanged: `<Spinner page />`. Preview network error: unchanged `<LoadError />`.

### State E: errors (`PartnerError`)

Layout already matches p23; keep it. Copy only, shorter:

| Kind | Illustration | h1 | Body | Actions |
|---|---|---|---|---|
| `not-found` | `EmptyBox` | Ce lien ne marche plus | Il a peut-être expiré ou déjà servi. Demande un nouveau lien à la personne qui te l'a envoyé. | Account: "Mes listes". Otherwise: "Découvrir Chuut". |
| `list-full` | `EmptyBox` | Cette liste est déjà à deux | Anna gère déjà « Noël 2026 » avec quelqu'un. Une liste se gère à deux maximum. | same as above |
| `already-owner` | `GiftBox` | C'est déjà ta liste | Ce lien sert à inviter ton ou ta partenaire. Envoie-le-lui, il ne marche qu'une fois. | "Mes listes" |
| `has-claims` | `GiftBox` | Tu as déjà réservé sur cette liste | Libère d'abord tes réservations sur « Noël 2026 », puis reviens sur ce lien. Chut, Anna n'en saura rien. Small line kept: "Marqué comme acheté ? Annule « acheté », puis libère-le." | Primary "Voir mes listes rejointes", secondary "J'ai tout libéré, réessayer" (unchanged) |

## 3. Implementation

### 3.1 CSS

**Move** (no change in values) from `web/src/styles/guest.css` to the end of `web/src/styles/components.css`, under a new comment `/* Gift hero (guest join, partner join) */`:
`.join-hero`, `.join-hero > *`, `.join-hero__fade`, `.join-hero__h`, `.join-hero__v`, `.join-hero__loop`, `.join-hero__loop--l`, `.join-hero__loop--r`, `.join-hero__knot`, `.join-intro`, `.join-intro h1`.
Leave `.join-form` and `.join-foot` in `guest.css` (guest only). This fixes the cold-load bug for both bundles.

**Add** to `components.css`, right after the moved block:

```css
.join-hero--short { height: 240px; }
.join-hero--short .join-hero__v { height: 240px; }
```

**Add** to `web/src/pages/owner/owner.css`, replacing the `.partner-accept .partner-facts` line:

```css
/* Partner accept page */
.partner-join { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.partner-join__foot { padding: 0 20px 20px; margin-top: auto; }
.partner-preview {
  display: flex; flex-direction: column; gap: 12px; padding: 16px;
  border: 1px solid var(--line); border-radius: var(--radius-card); background: var(--surface); box-shadow: var(--shadow-card);
}
.partner-preview__row { display: flex; align-items: center; gap: 12px; }
.partner-preview__text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.partner-preview__names { font-family: var(--font-hand); font-weight: 600; font-size: var(--fs-22); line-height: 1.05; color: var(--primary); overflow-wrap: anywhere; }
.partner-preview__title { font-family: var(--font-display); font-weight: 700; font-size: var(--fs-22); line-height: 1.15; overflow-wrap: anywhere; }
.partner-preview__note { padding-top: 12px; border-top: 1px solid var(--line); font-size: var(--fs-14); color: var(--muted); }
.partner-join__who { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; column-gap: 4px; font-size: var(--fs-14); color: var(--muted); text-align: center; }
.partner-join__who strong { color: var(--text); overflow-wrap: anywhere; }
.partner-join__switch {
  min-height: 44px; padding: 0 6px; border: 0; background: none; cursor: pointer;
  color: var(--purchased); font-size: var(--fs-14); font-weight: 600; text-decoration: underline;
}
```

Notes: tokens only, no plum. `--primary`, `--purchased`, `--surface`, `--line`, `--muted` all have dark values in `tokens.css`; the hero/ribbon colours are hard-coded illustration colours, same as Join. The avatar second border uses `--surface` (`.avatar-pair`), which matches the card background.

### 3.2 JSX (`web/src/pages/owner/PartnerAccept.tsx`, main screen)

Imports: drop `EyeOff, Pencil, Users` (lucide), `type ReactNode`, `BottomBar` and `ScreenBody` stay only for `PartnerError`. Add `AvatarPair`, `plural`, `ListType`.

```tsx
import { AvatarPair, BottomBar, Button, ButtonLink, EmptyBox, GiftBox, Logo, Screen, ScreenBody, Spinner, toast } from '../../ui'
import { formatDate, plural } from '../../lib/format'
import type { ListType } from '../../types'

const LIST_OF: Record<ListType, (title: string) => string> = {
  christmas: () => 'sa liste de Noël',
  birthday: () => "sa liste d'anniversaire",
  other: (title) => `sa liste « ${title} »`,
}

// ...inside PartnerAccept, after the guards and `done` (unchanged):
const theme = themeFor(inv.type)
const myName = hasAccount ? profile!.displayName! : ''
const meta = [plural(inv.wishCount, 'idée'), inv.eventDate && formatDate(inv.eventDate)].filter(Boolean).join(' · ')
const from = { from: pathname }
const run = () => accept.mutate(token, { onSuccess: done })

return (
  <Screen>
    <div className="join-hero join-hero--short" style={theme.header} aria-hidden="true">
      <div className="join-hero__h" />
      <div className="join-hero__v" />
      <div className="join-hero__loop join-hero__loop--l" />
      <div className="join-hero__loop join-hero__loop--r" />
      <div className="join-hero__knot" />
      <div className="join-hero__fade" />
    </div>
    <div className="join-intro">
      <h1>{inv.ownerName} veut gérer {LIST_OF[inv.type](inv.title)} avec toi</h1>
      {meta && <p className="muted small">{meta}</p>}
    </div>

    <div className="partner-join">
      <section className="partner-preview" aria-label="Aperçu de la liste partagée">
        <div className="eyebrow">Ce que verront tes proches</div>
        <div className="partner-preview__row">
          <AvatarPair names={[inv.ownerName, myName]} size="md" />
          <div className="partner-preview__text">
            <div className="partner-preview__names">Liste de {inv.ownerName} et {myName || 'toi'}</div>
            <div className="partner-preview__title">{inv.title}</div>
          </div>
        </div>
        <p className="partner-preview__note">Vous ajoutez et modifiez les souhaits tous les deux.</p>
      </section>

      {hasAccount ? (
        <>
          {accept.isError && <p className="error" role="alert">Une erreur est survenue. Réessaie.</p>}
          <Button large full loading={accept.isPending} onClick={run}>Accepter l'invitation</Button>
          <p className="partner-join__who">
            <span>Tu rejoins en tant que <strong>{myName}</strong>.</span>
            <button
              type="button"
              className="partner-join__switch"
              onClick={() => signOut.mutateAsync().then(() => nav('/login', { state: from }))}
            >
              Changer de compte
            </button>
          </p>
        </>
      ) : (
        <>
          <p className="muted small">
            {user?.isAnonymous
              ? 'Crée ton compte pour gérer la liste. Tes réservations sont gardées.'
              : "Pour gérer une liste, il te faut un compte. Le lien t'attend ici."}
          </p>
          <ButtonLink to="/signup" state={from} large full>Créer mon compte</ButtonLink>
          <div className="divider">ou</div>
          <ButtonLink to="/login" state={from} large full variant="secondary">J'ai déjà un compte</ButtonLink>
        </>
      )}
    </div>

    <div className="partner-join__foot">
      <div className="hint-banner hint-banner--stack">
        <div className="hand">Tu ne verras jamais qui prend quoi.</div>
        <div className="hint-banner__text">Comme {inv.ownerName}, tu vois seulement qui a rejoint la liste.</div>
      </div>
    </div>
  </Screen>
)
```

Also in the has-claims branch, reuse `run` for `onRetry`. `PartnerError` JSX stays as is; update the `COPY` strings per the table in 2.E.

Accessibility: one h1 per state; the preview is a labelled `section`; avatars are decorative (names are in text); every control is 44px+; `Button loading` exposes `aria-busy`.

## 4. Remove from the current implementation

- In `PartnerAccept.tsx`: the `ul.partner-facts` block and the `Pencil`, `Users`, `EyeOff` imports; the "Liste à deux" kicker; the `me` variable ("toi" fallback moves into the card); the sticky `<BottomBar stacked plain>{actions}</BottomBar>` and the `actions: ReactNode` variable on the main screen (keep `BottomBar` in `PartnerError`); the `<ScreenBody gap={16}>` wrapper on the main screen; `Button variant="link"` for "Ce n'est pas toi ? Changer de compte" (plum).
- In `owner.css`: the dead rule `.partner-accept .partner-facts { padding: 0 20px; }` (no `.partner-accept` wrapper exists). Keep `.partner-facts` itself: `PartnerSheet.tsx` still uses it.
- In `guest.css`: the moved `.join-hero*` and `.join-intro*` rules (now in `components.css`).
- Spec drift to note in `2026-10-12-shared-lists-ux.md` 3.1/3.2: actions are no longer in a sticky `BottomBar`; facts replaced by the preview card and the foot note; button label "Accepter l'invitation".
