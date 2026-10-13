import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { Spinner as UiSpinner } from './ui'

export function Spinner() {
  return <UiSpinner page />
}

/** Owner and account screens: non-anonymous user with a completed profile. */
export function RequireAccount({ children, allowIncomplete }: { children: ReactNode; allowIncomplete?: boolean }) {
  const { user, profile, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!user || user.isAnonymous) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (!allowIncomplete && (!profile?.ageConfirmedAt || !profile.displayName)) {
    return <Navigate to="/onboarding" state={{ from: loc.pathname }} replace />
  }
  return children
}

/** Only for anonymous guests (upgrade flow). */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/signup" replace />
  if (!user.isAnonymous) return <Navigate to="/app" replace />
  return children
}
