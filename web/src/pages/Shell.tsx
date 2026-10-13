import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { authErrorMessage, emailAuth, socialAuth, type Mode, type Social } from '../authActions'
import { useSignOut } from '../data/mutations'
import {
  BottomBar, Button, ButtonLink, EmptyBox, GiftBox, Logo, Screen, ScreenBody, Spinner, TextInput, Toaster, TopBar,
} from '../ui'
import { Field } from '../ui'

export { Field }

/** App column + toaster. Screens render their own headers. */
export function Layout() {
  return (
    <>
      <div className="app-column"><Outlet /></div>
      <Toaster />
    </>
  )
}

export function NotFound() {
  return (
    <Screen>
      <div className="top-bar top-bar--left"><Logo size={36} to="/" /></div>
      <ScreenBody gap={24}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}><EmptyBox /></div>
        <div className="stack-sm">
          <h1 style={{ fontSize: '2rem' }}>Cette liste est introuvable</h1>
          <p className="muted" style={{ fontSize: 'var(--fs-18)' }}>
            Le lien est peut-être incomplet, ou la liste a été supprimée. Demande un nouveau lien à la personne qui te l'a envoyé.
          </p>
        </div>
      </ScreenBody>
      <BottomBar stacked plain>
        <ButtonLink to="/" large full>Découvrir Chuut</ButtonLink>
        <ButtonLink to="/app" large full variant="secondary">Mes listes</ButtonLink>
      </BottomBar>
    </Screen>
  )
}

/** Shown when the backend could not be reached; unlike NotFound, the link may well be valid. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen>
      <div className="top-bar top-bar--left"><Logo size={36} to="/" /></div>
      <ScreenBody gap={24}>
        <div className="stack-sm">
          <h1 style={{ fontSize: '2rem' }}>Oups, ça ne répond pas</h1>
          <p className="muted" style={{ fontSize: 'var(--fs-18)' }}>
            Impossible d'ouvrir cette liste pour le moment. Vérifie ta connexion et réessaie dans un instant.
          </p>
        </div>
      </ScreenBody>
      <BottomBar stacked plain>
        <Button type="button" large full onClick={onRetry}>Réessayer</Button>
      </BottomBar>
    </Screen>
  )
}

/**
 * Screen for the signed-out flows (landing, sign up/in, onboarding). From 1024px it splits in two:
 * a brand panel on the left, the unchanged mobile content centered on the right.
 */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <Screen className="screen--auth">
      <aside className="auth-brand" aria-hidden="true">
        <Logo size={44} color="#fff" />
        <GiftBox width={320} />
        <p className="auth-brand__tagline">Tes proches s'organisent.<br />Toi, tu ne vois rien.</p>
      </aside>
      <div className="auth-main">{children}</div>
    </Screen>
  )
}

export function Landing() {
  const { user, loading } = useAuth()
  const loc = useLocation()
  // Set by SignOutButton: we arrive here before sign-out completes, so don't bounce back to /app.
  const signedOut = (loc.state as { signedOut?: boolean } | null)?.signedOut
  if (loading) return <Spinner page />
  if (user && !user.isAnonymous && !signedOut) return <Navigate to="/app" replace />
  return (
    <AuthScreen>
      <div className="hero">
        <div className="hero__logo"><Logo size={38} color="#fff" /></div>
        <div className="hero__box"><GiftBox /></div>
      </div>
      <ScreenBody gap={20}>
        <h1 style={{ marginTop: -24, position: 'relative', zIndex: 1 }}>Chuut, c'est une surprise.</h1>
        <p className="muted" style={{ fontSize: 'var(--fs-18)' }}>
          Fais ta liste de souhaits. Tes proches se répartissent les cadeaux en secret, et toi tu ne vois rien.
        </p>
        <ol className="steps">
          {['Tu notes tes envies', 'Tu partages un lien', 'Ils s\'organisent, sans spoiler'].map((s, i) => (
            <li key={s}><span className="steps__n">{i + 1}</span>{s}</li>
          ))}
        </ol>
      </ScreenBody>
      <BottomBar stacked plain note="Tu as reçu un lien ? Ouvre-le directement, pas besoin de compte.">
        <ButtonLink to="/signup" large full>Créer ma liste</ButtonLink>
        <ButtonLink to="/login" large full variant="secondary">Se connecter</ButtonLink>
      </BottomBar>
    </AuthScreen>
  )
}

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.500-.2-2.200H12v4.200h6.200c-.3 1.400-1.100 2.600-2.300 3.400v2.800h3.700c2.200-2 3.400-5 3.400-8.200z" />
    <path fill="#34A853" d="M12 23.500c3.100 0 5.700-1 7.600-2.800l-3.700-2.800c-1 .7-2.300 1.100-3.900 1.100-3 0-5.500-2-6.400-4.700H1.800v2.900C3.700 20.900 7.600 23.500 12 23.500z" />
    <path fill="#FBBC05" d="M5.600 14.300c-.2-.7-.4-1.500-.4-2.300s.1-1.600.4-2.300V6.800H1.800C1 8.400.5 10.100.5 12s.5 3.600 1.300 5.200l3.800-2.900z" />
    <path fill="#EA4335" d="M12 5c1.700 0 3.200.6 4.400 1.700l3.300-3.300C17.700 1.600 15.100.5 12 .5 7.600.5 3.700 3.100 1.800 6.800l3.800 2.900C6.500 7 9 5 12 5z" />
  </svg>
)

/**
 * Account creation / sign in: page header + social buttons + e-mail form + sticky submit.
 * Renders a full-height form (put it right under a TopBar inside a Screen). `children` are extra fields
 * placed before the submit button. On success goes to the page we came from (guards set it) or /app.
 */
export function AuthForm({ mode, header, submitLabel, footer, children }: {
  mode: Mode
  header?: ReactNode
  submitLabel?: string
  footer?: ReactNode
  children?: ReactNode
}) {
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      nav(from, { replace: true })
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (mode === 'signup' && password.length < 8) return setError('Mot de passe trop court (8 caractères minimum).')
    void run(() => emailAuth(mode, email, password))
  }
  const social = (kind: Social) => () => void run(() => socialAuth(kind, mode))

  return (
    <form onSubmit={submit} className="stack" style={{ flex: 1, gap: 0 }}>
      <ScreenBody>
        {header}
        <div className="stack-sm">
          <Button type="button" large full variant="social" disabled={busy} onClick={social('google')}><GoogleIcon />Continuer avec Google</Button>
        </div>
        <div className="divider">ou avec ton e-mail</div>
        <Field label="E-mail">
          <TextInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe" hint={mode === 'signup' ? '8 caractères minimum.' : undefined}>
          <TextInput
            type="password" required minLength={mode === 'signup' ? 8 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {children}
        {error && <p className="error" role="alert">{error}</p>}
      </ScreenBody>
      <BottomBar stacked plain note={footer}>
        <Button type="submit" large full loading={busy}>{submitLabel ?? (mode === 'signup' ? 'Continuer' : 'Me connecter')}</Button>
      </BottomBar>
    </form>
  )
}

const AuthHeader = ({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) => (
  <div className="stack-sm">
    <div className="kicker">{kicker}</div>
    <h1>{title}</h1>
    <p className="muted" style={{ fontSize: 'var(--fs-18)' }}>{children}</p>
  </div>
)

export function Signup() {
  return (
    <AuthScreen>
      <TopBar center={<Logo to="/" />} />
      <AuthForm
        mode="signup"
        header={<AuthHeader kicker="Bienvenue" title="Crée ton compte">Pour créer tes listes et les retrouver sur tous tes appareils.</AuthHeader>}
        footer={<>Déjà un compte ? <Link to="/login" state={useLocation().state}>Se connecter</Link></>}
      />
    </AuthScreen>
  )
}

export function Login() {
  return (
    <AuthScreen>
      <TopBar center={<Logo to="/" />} />
      <AuthForm
        mode="login"
        header={<AuthHeader kicker="Content de te revoir" title="Connecte-toi">Retrouve tes listes et celles de tes proches.</AuthHeader>}
        footer={<>Pas encore de compte ? <Link to="/signup" state={useLocation().state}>Créer un compte</Link></>}
      />
    </AuthScreen>
  )
}

export function SignOutButton() {
  const nav = useNavigate()
  const signOut = useSignOut()
  return <Button variant="outline" large full loading={signOut.isPending} onClick={() => {
    // Leave the guarded screen first: once auth flips, the guard would unmount this button and send us to /login.
    nav('/', { replace: true, state: { signedOut: true } })
    signOut.mutate()
  }}>Se déconnecter</Button>
}
