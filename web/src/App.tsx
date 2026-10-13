import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { RequireAccount, RequireGuest, Spinner } from './guards'
import { Account, Onboarding } from './pages/Account'
import { Landing, Layout, Login, NotFound, Signup } from './pages/Shell'
import { Privacy, Terms } from './pages/Legal'

// Owner and guest screens load on demand: a guest opening an invite never downloads the owner bundle.
const owner = () => import('./pages/Owner')
const guest = () => import('./pages/Guest')
const Dashboard = lazy(() => owner().then((m) => ({ default: m.Dashboard })))
const Guests = lazy(() => owner().then((m) => ({ default: m.Guests })))
const NewList = lazy(() => owner().then((m) => ({ default: m.NewList })))
const OwnerList = lazy(() => owner().then((m) => ({ default: m.OwnerList })))
const WishForm = lazy(() => owner().then((m) => ({ default: m.WishForm })))
const PartnerAccept = lazy(() => owner().then((m) => ({ default: m.PartnerAccept })))
const Join = lazy(() => guest().then((m) => ({ default: m.Join })))
const Resolver = lazy(() => guest().then((m) => ({ default: m.Resolver })))
const Upgrade = lazy(() => guest().then((m) => ({ default: m.Upgrade })))
const WishSheet = lazy(() => guest().then((m) => ({ default: m.WishSheet })))

const acct = (el: React.ReactNode) => <RequireAccount>{el}</RequireAccount>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<RequireAccount allowIncomplete><Onboarding /></RequireAccount>} />
            <Route path="/app" element={acct(<Dashboard />)} />
            <Route path="/lists/new" element={acct(<NewList />)} />
            <Route path="/lists/:listId" element={acct(<OwnerList />)} />
            <Route path="/lists/:listId/wishes/new" element={acct(<WishForm mode="new" />)} />
            <Route path="/lists/:listId/wishes/:wishId/edit" element={acct(<WishForm mode="edit" />)} />
            <Route path="/lists/:listId/guests" element={acct(<Guests />)} />
            <Route path="/l/:slug" element={<Resolver />}>
              <Route path="wish/:wishId" element={<WishSheet />} />
            </Route>
            <Route path="/l/:slug/join" element={<Join />} />
            <Route path="/partner/:token" element={<PartnerAccept />} />
            <Route path="/upgrade" element={<RequireGuest><Upgrade /></RequireGuest>} />
            <Route path="/account" element={acct(<Account />)} />
            <Route path="/conditions" element={<Terms />} />
            <Route path="/confidentialite" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
