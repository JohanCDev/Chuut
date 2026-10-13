import { CircleHelp, Gift, LayoutGrid, Plus, UserRound, UsersRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth'
import { useJoined, useMyClaims, useMyLists } from '../data/queries'
import { themeFor } from '../lib/theme'
import { Avatar } from './Avatar'
import { ButtonLink, IconButton } from './Button'
import { Logo } from './Logo'

/** Owner navigation: full sidebar on desktop, icon rail on tablet. `guest` shows the guest variant. */
export function Sidebar({ collapsed, guest, onShortcuts }: {
  collapsed: boolean
  guest?: boolean
  onShortcuts?: () => void
}) {
  const { user, profile } = useAuth()
  const lists = useMyLists()
  const joined = useJoined()
  const claims = useMyClaims()
  const account = !!user && !user.isAnonymous

  // Anonymous guests only get a way to sign up; account holders see the same navigation everywhere.
  if (guest && !account && collapsed) {
    return (
      <nav className="rail" aria-label="Navigation principale">
        <Link to="/" aria-label="Chuut, accueil" title="Chuut" className="rail__item">
          <Gift size={22} aria-hidden="true" />
        </Link>
        <Link to="/signup" aria-label="Créer ma liste" title="Créer ma liste" className="rail__item">
          <Plus size={22} aria-hidden="true" />
        </Link>
      </nav>
    )
  }

  if (guest && !account) {
    return (
      <nav className="sidebar" aria-label="Navigation principale">
        <Logo size={32} to="/" />
        <ButtonLink to="/signup">Créer ma liste</ButtonLink>
        <p className="muted small">Garde tes réservations en créant un compte.</p>
        {onShortcuts && (
          <div className="sidebar__footer">
            <IconButton label="Raccourcis clavier" bare onClick={onShortcuts}>
              <CircleHelp size={20} aria-hidden="true" />
            </IconButton>
          </div>
        )}
      </nav>
    )
  }

  if (collapsed) {
    return (
      <nav className="rail" aria-label="Navigation principale">
        <Link to="/app" aria-label="Chuut, accueil" title="Chuut" className="rail__item">
          <Gift size={22} aria-hidden="true" />
        </Link>
        <NavLink to="/app" end aria-label="Mes listes" title="Mes listes" className="rail__item">
          <LayoutGrid size={22} aria-hidden="true" />
        </NavLink>
        <Link to="/app?tab=joined" aria-label="Listes rejointes" title="Listes rejointes" className="rail__item">
          <UsersRound size={22} aria-hidden="true" />
        </Link>
        <Link to="/lists/new" aria-label="Créer une liste" title="Créer une liste" className="rail__item">
          <Plus size={22} aria-hidden="true" />
        </Link>
        <div className="rail__bottom">
          <Link to="/account" aria-label="Mon compte" title="Mon compte" className="rail__item">
            <UserRound size={22} aria-hidden="true" />
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <Logo size={32} to="/app" />
      <ButtonLink to="/lists/new">
        Créer une liste
        <kbd className="kbd">N</kbd>
      </ButtonLink>

      <div className="nav-section">Mes listes</div>
      <div className="sidebar__group">
        {(lists.data ?? []).map((l) => (
          <NavLink key={l.id} to={`/lists/${l.id}`} className="nav-item">
            <span className="sidebar__swatch" style={themeFor(l.data.type).header} aria-hidden="true" />
            <span className="sidebar__label">{l.data.title}</span>
            <span className="sidebar__count">{l.data.wishCount}</span>
          </NavLink>
        ))}
        {lists.data?.length === 0 && <p className="sidebar__empty muted small">Aucune liste</p>}
      </div>

      <div className="nav-section">Listes rejointes</div>
      <div className="sidebar__group">
        {(joined.data ?? []).map((j) => {
          const taken = claims.data?.filter((c) => c.parentId === j.id).length ?? 0
          return (
            <NavLink key={j.id} to={`/l/${j.data.slug}`} className="nav-item">
              <span className="sidebar__swatch" style={themeFor(j.data.type).header} aria-hidden="true" />
              <span className="sidebar__label">{j.data.title}</span>
              {taken > 0 && <span className="sidebar__badge">{taken} pris par toi</span>}
            </NavLink>
          )
        })}
      </div>

      <div className="sidebar__footer">
        <Link to="/account" className="nav-item sidebar__account" aria-label="Mon compte">
          <Avatar name={profile?.displayName} size="sm" />
          <span className="sidebar__label">{profile?.displayName ?? 'Mon compte'}</span>
        </Link>
        {onShortcuts && (
          <IconButton label="Raccourcis clavier" bare onClick={onShortcuts}>
            <CircleHelp size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </nav>
  )
}
