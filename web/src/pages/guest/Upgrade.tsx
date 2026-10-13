import { useState } from 'react'
import { useAuth } from '../../auth'
import { useJoined, useMyClaims } from '../../data/queries'
import { themeFor } from '../../lib/theme'
import { plural } from '../../lib/format'
import { Button, Checkbox, Logo, Screen, TopBar } from '../../ui'
import { AuthForm } from '../Shell'

/** /upgrade: anonymous guest becomes an account. Keeps claims (link) or merges them into an existing account. */
export function Upgrade() {
  const { profile } = useAuth()
  const joined = useJoined()
  const myClaims = useMyClaims()
  const [age, setAge] = useState(false)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const signup = mode === 'signup'

  const claimsOf = (listId: string) => (myClaims.data ?? []).filter((c) => c.parentId === listId && c.data.flag !== 'removed')

  return (
    <Screen>
      <TopBar center={<Logo to="/" />} />
      <AuthForm
        key={mode}
        mode={mode}
        submitLabel={signup ? "Continuer avec l'e-mail" : 'Me connecter'}
        header={
          <div className="stack-sm">
            <div className="kicker" style={{ color: 'var(--plum)' }}>{profile?.displayName ? `${profile.displayName}, on garde tout` : 'On garde tout'}</div>
            <h1>{signup ? 'Crée ton compte' : 'Connecte-toi'}</h1>
            {(joined.data?.length ?? 0) > 0 && (
              <div className="keep-panel">
                <div className="keep-panel__title">Ce qu'on garde</div>
                {joined.data!.map((j) => {
                  const mine = claimsOf(j.id)
                  return (
                    <div key={j.id} className="keep-panel__row">
                      <div className="keep-panel__icon" style={themeFor(j.data.type).header} aria-hidden="true" />
                      <div>
                        <div className="keep-panel__name">{j.data.title} · liste de {j.data.ownerName}</div>
                        <div className="keep-panel__sub">
                          {mine.length > 0 ? `${plural(mine.length, 'réservation')} : ${mine.map((c) => c.data.wishSnapshot.title).join(', ')}` : 'Aucune réservation'}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <p>Tes réservations restent invisibles pour {joined.data!.length === 1 ? joined.data![0].data.ownerName : 'les propriétaires des listes'}, et n'apparaissent jamais sur tes propres listes.</p>
              </div>
            )}
          </div>
        }
        footer={
          <Button variant="link" onClick={() => setMode(signup ? 'login' : 'signup')}>
            {signup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte'}
          </Button>
        }
      >
        {signup && <Checkbox required checked={age} onCheckedChange={setAge} label="J'ai 15 ans ou plus" />}
      </AuthForm>
    </Screen>
  )
}
