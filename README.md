# Chuut

Wishlists that keep the surprise. You write your wishes and share a link; friends and family claim gifts in secret, and you never see who took what.

Live app: [chuut.web.app](https://chuut.web.app) · Landing page: [`site/index.html`](site/index.html)

## Features

- Lists for Christmas, birthdays or any occasion, with a themed header and countdown.
- Wishes with link, price, note, image and a "coup de coeur" priority. Pasting a link fetches its title and image.
- Guests open the share link and claim gifts without creating an account (anonymous auth). They can upgrade to a real account later.
- The owner sees wishes and guest count, never claims. Guests see each other's claims so nobody buys twice.
- Shared lists: invite a partner as co-owner with a single-use link valid 7 days.
- Account deletion and data export (GDPR). Inactive anonymous guests are purged daily.
- Mobile first, light and dark themes, UI in French.

## Stack

| Part | Tech |
| --- | --- |
| `web/` | React 19, Vite, TypeScript, React Router, TanStack Query, Radix, vaul, sonner |
| `functions/` | Firebase Cloud Functions (Node 24, `europe-west1`) |
| Data | Firestore (`eur3`), Storage, Firebase Auth, rules in `firestore.rules` and `storage.rules` |
| `tests/` | Firestore rules tests and partner callable tests (`node:test` + emulators) |

## Getting started

Prerequisites: Node 24, the [Firebase CLI](https://firebase.google.com/docs/cli), and a Firebase project (or just the emulators).

```bash
cp .firebaserc.example .firebaserc        # fill in your project ids and hosting sites
cp web/.env.example web/.env.development  # set VITE_USE_EMULATORS=true for local work
npm --prefix web install
npm --prefix functions install
npm --prefix tests install
```

Run locally against the emulators:

```bash
npm --prefix functions run build
firebase emulators:start
npm --prefix web run dev
```

The app runs on http://localhost:5173 and the Emulator UI on http://localhost:4000.

## Tests

Rules and functions tests use a separate emulator config (`firebase.test.json`) so they don't clash with your dev emulators:

```bash
firebase emulators:exec --config firebase.test.json --only firestore "npm --prefix tests test"
firebase emulators:exec --config firebase.test.json "npm --prefix tests run test:functions"
```

## Deploy

Env files `web/.env.dev` and `web/.env.production` hold each project's web config (see `web/.env.example`).

```bash
npm --prefix web run build
firebase deploy -P prod
```

`npm --prefix web run build:dev` builds against the dev project.

## Project layout

```
web/src/pages/      screens (owner, guest, account, legal)
web/src/ui/         UI kit, see web/src/ui/README.md
web/src/data/       queries and mutations, see web/src/data/README.md
functions/src/      callables, partner invites, triggers, scheduled purge
site/               landing page, published to GitHub Pages by .github/workflows/pages.yml
docs/               design specs
```
