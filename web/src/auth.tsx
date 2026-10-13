import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { keys } from './data/keys'
import { useLiveDoc } from './data/live'
import type { Profile } from './types'

interface AuthState {
  user: User | null
  /** undefined while loading, null when the user has no profile doc */
  profile: Profile | null | undefined
  loading: boolean
}

const Ctx = createContext<AuthState>({ user: null, profile: undefined, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  // Wrapped so linking an anonymous account (same uid, same User object) still re-renders.
  const [state, setState] = useState<{ user: User | null }>({ user: null })
  const user = state.user
  const [ready, setReady] = useState(false)
  const lastUid = useRef<string | null | undefined>(undefined)

  // onIdTokenChanged also fires on linkWithCredential, unlike onAuthStateChanged.
  useEffect(() => onIdTokenChanged(auth, (u) => {
    const uid = u?.uid ?? null
    if (lastUid.current !== uid) {
      qc.clear() // no data may leak from one identity to the next
      lastUid.current = uid
    }
    setState({ user: u })
    setReady(true)
  }), [qc])

  const uid = user?.uid
  const profileQuery = useLiveDoc<Profile>(keys.profile(uid ?? ''), uid ? `users/${uid}` : null)
  const profile = profileQuery.isError ? null : profileQuery.data

  const loading = !ready || (!!user && profile === undefined)
  return <Ctx.Provider value={{ user, profile, loading }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx)
