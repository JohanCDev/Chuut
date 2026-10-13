import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useAcceptPartnerInvite, useSignOut } from '../../data/mutations'
import { usePartnerInvite } from '../../data/queries'
import type { PartnerInvite } from '../../api'
import { formatDate, plural } from '../../lib/format'
import { themeFor } from '../../lib/theme'
import { AvatarPair, BottomBar, Button, ButtonLink, EmptyBox, GiftBox, Logo, Screen, ScreenBody, Spinner, toast } from '../../ui'
import { LoadError } from '../Shell'
import type { ListType } from '../../types'
import './owner.css'

const LIST_OF: Record<ListType, (title: string) => string> = {
  christmas: () => 'sa liste de Noël',
  birthday: () => "sa liste d'anniversaire",
  other: (title) => `sa liste « ${title} »`,
}

type ErrorKind = 'not-found' | 'list-full' | 'already-owner' | 'has-claims'

/** Maps a callable error to the screen to show; null for an unexpected error. */
const errorKind = (err: unknown): ErrorKind | null => {
  const e = err as { code?: string; message?: string } | null
  if (e?.code === 'functions/not-found') return 'not-found'
  if (e?.code === 'functions/resource-exhausted') return 'list-full'
  if (e?.code === 'functions/already-exists') return 'already-owner'
  if (e?.code === 'functions/failed-precondition' && e.message === 'has-claims') return 'has-claims'
  return null
}

/** /partner/:token: a partner accepts to co-own a list. */
export function PartnerAccept() {
  const { token = '' } = useParams()
  const { user, profile, loading } = useAuth()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const invite = usePartnerInvite(token)
  const accept = useAcceptPartnerInvite()
  const signOut = useSignOut()

  if (loading || invite.isLoading) return <Spinner page />
  if (invite.isError) return <LoadError onRetry={() => void invite.refetch()} />
  if (!invite.data) return <PartnerError kind="not-found" />
  const inv = invite.data

  const hasAccount = !!user && !user.isAnonymous
  if (hasAccount && (!profile?.ageConfirmedAt || !profile.displayName)) {
    return <Navigate to="/onboarding" state={{ from: pathname }} replace />
  }

  if (inv.isOwner) return <PartnerError kind="already-owner" invite={inv} />
  const run = () => accept.mutate(token, { onSuccess: done })
  const kind = accept.isError ? errorKind(accept.error) : null
  if (kind && kind !== 'has-claims') return <PartnerError kind={kind} invite={inv} />
  if (kind === 'has-claims') {
    return <PartnerError kind={kind} invite={inv} onRetry={run} retrying={accept.isPending} />
  }

  function done(listId: string) {
    nav(`/lists/${listId}`, { replace: true })
    toast(`C'est fait, vous gérez « ${inv.title} » à deux`)
  }

  const theme = themeFor(inv.type)
  const myName = hasAccount ? profile!.displayName! : ''
  const meta = [plural(inv.wishCount, 'idée'), inv.eventDate && formatDate(inv.eventDate)].filter(Boolean).join(' · ')
  const from = { from: pathname }

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
}

const COPY: Record<ErrorKind, (i?: PartnerInvite) => { title: string; body: string }> = {
  'not-found': () => ({
    title: 'Ce lien ne marche plus',
    body: "Il a peut-être expiré ou déjà servi. Demande un nouveau lien à la personne qui te l'a envoyé.",
  }),
  'list-full': (i) => ({
    title: 'Cette liste est déjà à deux',
    body: `${i?.ownerName} gère déjà « ${i?.title} » avec quelqu'un. Une liste se gère à deux maximum.`,
  }),
  'already-owner': () => ({
    title: "C'est déjà ta liste",
    body: "Ce lien sert à inviter ton ou ta partenaire. Envoie-le-lui, il ne marche qu'une fois.",
  }),
  'has-claims': (i) => ({
    title: 'Tu as déjà réservé sur cette liste',
    body: `Libère d'abord tes réservations sur « ${i?.title} », puis reviens sur ce lien. Chut, ${i?.ownerName} n'en saura rien.`,
  }),
}

function PartnerError({ kind, invite, onRetry, retrying }: {
  kind: ErrorKind
  invite?: PartnerInvite
  onRetry?: () => void
  retrying?: boolean
}) {
  const { user } = useAuth()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [kind])
  const { title, body } = COPY[kind](invite)
  const hasAccount = !!user && !user.isAnonymous
  const home = hasAccount
    ? <ButtonLink to="/app" large full>Mes listes</ButtonLink>
    : <ButtonLink to="/" large full>Découvrir Chuut</ButtonLink>

  return (
    <Screen>
      <div className="top-bar top-bar--left"><Logo size={36} to="/" /></div>
      <ScreenBody gap={24}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
          {kind === 'has-claims' || kind === 'already-owner' ? <GiftBox /> : <EmptyBox />}
        </div>
        <div className="stack-sm">
          <h1 ref={heading} tabIndex={-1} style={{ fontSize: '2rem' }}>{title}</h1>
          <p className="muted" style={{ fontSize: 'var(--fs-18)' }}>{body}</p>
          {kind === 'has-claims' && <p className="muted small">Marqué comme acheté ? Annule « acheté », puis libère-le.</p>}
        </div>
      </ScreenBody>
      <BottomBar stacked plain>
        {kind === 'has-claims' ? (
          <>
            <ButtonLink to="/app?tab=joined" large full>Voir mes listes rejointes</ButtonLink>
            <Button large full variant="secondary" loading={retrying} onClick={onRetry}>J'ai tout libéré, réessayer</Button>
          </>
        ) : kind === 'already-owner' ? <ButtonLink to="/app" large full>Mes listes</ButtonLink> : home}
      </BottomBar>
    </Screen>
  )
}
