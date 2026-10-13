import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { RequireAccount, RequireGuest, Spinner } from './guards'
import { Account, Onboarding } from './pages/Account'
import { Landing, Layout, Login, NotFound, Signup } from './pages/Shell'
import { Privacy, Terms } from './pages/Legal'
import { AppShell } from './ui/AppShell'

// Owner and guest screens load on demand: a guest opening an invite never downloads the owner bundle.
const owner = () => import('./pages/Owner')
const guest = () => import('./pages/Guest')
const Dashboard = lazy(() => owner().then((m) => ({ default: m.Dashboard })))
const Guests = lazy(() => owner().then((m) => ({ default: m.Guests })))
const NewList = lazy(() => owner().then((m) => ({ default: m.NewList })))
const OwnerList = lazy(() => owner().then((m) => ({ default: m.OwnerList })))
const WishForm = lazy(() => owner().then((m) => ({ default: m.WishForm })))
const WishDetail = lazy(() => owner().then((m) => ({ default: m.WishDetail })))
const PartnerAccept = lazy(() => owner().then((m) => ({ default: m.PartnerAccept })))
const Join = lazy(() => guest().then((m) => ({ default: m.Join })))
const Resolver = lazy(() => guest().then((m) => ({ default: m.Resolver })))
const Upgrade = lazy(() => guest().then((m) => ({ default: m.Upgrade })))
const WishSheet = lazy(() => guest().then((m) => ({ default: m.WishSheet })))

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
            <Route element={<RequireAccount><AppShell /></RequireAccount>}>
              <Route path="/app" element={<Dashboard />} />
              <Route path="/lists/new" element={<NewList />} />
              <Route path="/lists/:listId" element={<OwnerList />}>
                <Route path="wishes/new" element={<WishForm mode="new" />} />
                <Route path="wishes/:wishId" element={<WishDetail />} />
                <Route path="wishes/:wishId/edit" element={<WishForm mode="edit" />} />
              </Route>
              <Route path="/lists/:listId/guests" element={<Guests />} />
              <Route path="/account" element={<Account />} />
            </Route>
            <Route path="/l/:slug" element={<Resolver />}>
              <Route path="wish/:wishId" element={<WishSheet />} />
            </Route>
            <Route path="/l/:slug/join" element={<Join />} />
            <Route path="/partner/:token" element={<PartnerAccept />} />
            <Route path="/upgrade" element={<RequireGuest><Upgrade /></RequireGuest>} />
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
