import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  type AuthCredential,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from './firebase'
import { mergeGuest } from './api'

export type Social = 'google'
export type Mode = 'signup' | 'login'

const provider = (_kind: Social) => new GoogleAuthProvider()

const guestToken = async () => {
  const cur = auth.currentUser
  return cur?.isAnonymous ? cur.getIdToken() : null
}

/** After signing in to an existing account from a guest session, move the guest's data over. */
const merge = async (oldToken: string | null) => {
  if (oldToken) await mergeGuest({ oldIdToken: oldToken })
}

const signInAndMerge = async (cred: AuthCredential, oldToken: string | null) => {
  await signInWithCredential(auth, cred)
  await merge(oldToken)
}

export const socialAuth = async (kind: Social, mode: Mode) => {
  const cur = auth.currentUser
  const oldToken = await guestToken()
  const p = provider(kind)
  if (cur?.isAnonymous && mode === 'signup') {
    try {
      await linkWithPopup(cur, p) // same uid, nothing to migrate
    } catch (e) {
      if (e instanceof FirebaseError && e.code === 'auth/credential-already-in-use') {
        const cred = GoogleAuthProvider.credentialFromError(e)
        if (cred) return signInAndMerge(cred, oldToken)
      }
      throw e
    }
    return
  }
  await signInWithPopup(auth, p)
  await merge(oldToken)
}

export const emailAuth = async (mode: Mode, email: string, password: string) => {
  const cur = auth.currentUser
  if (mode === 'signup') {
    if (cur?.isAnonymous) {
      await linkWithCredential(cur, EmailAuthProvider.credential(email, password))
    } else {
      await createUserWithEmailAndPassword(auth, email, password)
    }
    return
  }
  const oldToken = await guestToken()
  await signInWithEmailAndPassword(auth, email, password)
  await merge(oldToken)
}

export const authErrorMessage = (e: unknown): string => {
  const code = e instanceof FirebaseError ? e.code : ''
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Cet email a déjà un compte. Connecte-toi.',
    'auth/weak-password': 'Mot de passe trop court (8 caractères minimum).',
    'auth/invalid-email': 'Email invalide.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
  }
  return map[code] ?? 'Une erreur est survenue. Réessaie.'
}
