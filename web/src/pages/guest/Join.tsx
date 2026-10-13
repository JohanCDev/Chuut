import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useJoinList } from '../../data/mutations'
import { useInvite, useJoinedBySlug, useOwnedListBySlug } from '../../data/queries'
import type { Invite } from '../../api'
import { agree, formatDate, plural } from '../../lib/format'
import { themeFor } from '../../lib/theme'
import type { ListType } from '../../types'
import { Button, ButtonLink, Field, Screen, Spinner, TextInput } from '../../ui'
import { LoadError, NotFound } from '../Shell'
import { Lips } from './Lips'

const OCCASION_COPY: Record<ListType, (title: string, their: string) => string> = {
  christmas: (_, their) => `${their} liste de Noël`,
  birthday: (_, their) => `${their} liste d'anniversaire`,
  other: (title, their) => `${their} liste « ${title} »`,
}

/** /l/:slug/join */
export function Join() {
  const { slug = '' } = useParams()
  const { loading } = useAuth()
  const owned = useOwnedListBySlug(slug)
  const joined = useJoinedBySlug(slug)
  const invite = useInvite(slug)

  if (loading || owned.isLoading || joined.isLoading || invite.isLoading) return <Spinner page />
  if (owned.owned) return <Navigate to={`/lists/${owned.owned.id}`} replace />
  if (joined.joined) return <Navigate to={`/l/${slug}`} replace />
  if (invite.isError) return <LoadError onRetry={() => void invite.refetch()} />
  if (!invite.data) return <NotFound />
  return <JoinScreen slug={slug} invite={invite.data} />
}

/** Invite preview + display name. `next` is where to go once inside (defaults to the list). */
export function JoinScreen({ slug, invite, next }: { slug: string; invite: Invite; next?: string }) {
  const nav = useNavigate()
  const { user, profile } = useAuth()
  const join = useJoinList()
  const [name, setName] = useState<string>()
  const value = name ?? profile?.displayName ?? ''
  const theme = themeFor(invite.type)
  const target = next ?? `/l/${slug}`
  const meta = [plural(invite.wishCount, 'idée'), invite.eventDate && formatDate(invite.eventDate)].filter(Boolean).join(' · ')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    join.mutate({ slug, displayName: value }, { onSuccess: () => nav(target, { replace: true }) })
  }

  return (
    <Screen>
      <div className="join-hero" style={theme.header} aria-hidden="true">
        <div className="join-hero__h" />
        <div className="join-hero__v" />
        <div className="join-hero__loop join-hero__loop--l" />
        <div className="join-hero__loop join-hero__loop--r" />
        <div className="join-hero__knot" />
        <div className="join-hero__fade" />
      </div>
      <div className="join-intro">
        <div className="kicker">Une invitation de {invite.ownerName}</div>
        <h1>{invite.ownerName} {agree(invite.shared, "t'invite", "t'invitent")} à {OCCASION_COPY[invite.type](invite.title, agree(invite.shared, 'sa', 'leur'))}</h1>
        {meta && <p className="muted small">{meta}</p>}
      </div>
      <form className="join-form" onSubmit={submit}>
        <Field
          label="Comment doit-on t'appeler ?"
          hint="Les autres invités verront ce prénom à côté de ce que tu réserves."
          error={join.isError ? "Impossible de rejoindre cette liste. Réessaie." : undefined}
        >
          <TextInput required maxLength={40} autoComplete="given-name" value={value} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button type="submit" large full loading={join.isPending} disabled={!value.trim()}>Entrer avec ce prénom</Button>
        {(!user || user.isAnonymous) && (
          <>
            <div className="divider">ou</div>
            <ButtonLink to="/signup" state={{ from: target }} large full variant="secondary">Créer un compte ou se connecter</ButtonLink>
          </>
        )}
      </form>
      <div className="join-foot">
        <div className="plum-note plum-note--hand"><Lips />{invite.ownerName} {agree(invite.shared, 'ne verra', 'ne verront')} pas ce que tu réserves.</div>
        <p className="legal">Réservé aux 15 ans et plus. En continuant, tu acceptes les <Link to="/conditions">conditions</Link> et la <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      </div>
    </Screen>
  )
}
