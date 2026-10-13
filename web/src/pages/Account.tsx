import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../auth'
import { useDeleteAccount, useExportData, useSaveProfile } from '../data/mutations'
import { useMyLists } from '../data/queries'
import { useBreakpoint } from '../lib/useBreakpoint'
import {
  Avatar, BottomBar, Button, Checkbox, ConfirmDialog, Field, PageHeader, Screen, ScreenBody, Sheet, StickyNote, TextInput, toast, TopBar,
} from '../ui'
import { SignOutButton } from './Shell'

export function Onboarding() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/app'
  const save = useSaveProfile()
  const [name, setName] = useState(profile?.displayName ?? user?.displayName?.split(' ')[0] ?? '')
  const [age, setAge] = useState(false)
  const known = name.trim()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ displayName: name, confirmAge: true }, {
      onSuccess: () => nav(from, { replace: true }),
      onError: () => toast.error("Impossible d'enregistrer. Réessaie."),
    })
  }
  return (
    <Screen>
      <form onSubmit={submit} className="stack" style={{ flex: 1, gap: 0 }}>
        <TopBar hideBack center={<div className="progress" aria-hidden="true"><span /><span /></div>} />
        <ScreenBody gap={20}>
          <div className="onboard-note">
            <StickyNote>{known ? `Chère ${known},` : 'Coucou,'}<br />dis-nous qui tu es…</StickyNote>
            <svg className="onboard-note__arrow" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 56c2-26 20-40 46-42" /><path d="M42 6l12 8-10 12" />
            </svg>
          </div>
          <h1 style={{ fontSize: '2rem' }}>Comment doit-on t'appeler ?</h1>
          <Field label="Ton prénom ou surnom" hint="C'est ce que verront les personnes invitées sur tes listes.">
            <TextInput required maxLength={40} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Checkbox required checked={age} onCheckedChange={setAge} label="J'ai 15 ans ou plus" description="Chuut est réservé aux 15 ans et plus." />
        </ScreenBody>
        <BottomBar
          stacked plain
          note={<>En continuant, tu acceptes les <Link to="/conditions">conditions</Link> et la <Link to="/confidentialite">politique de confidentialité</Link>.</>}
        >
          <Button type="submit" large full loading={save.isPending}>C'est parti</Button>
        </BottomBar>
      </form>
    </Screen>
  )
}

const PROVIDERS: Record<string, string> = { password: 'E-mail', 'google.com': 'Google' }

const downloadJson = (data: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  Object.assign(document.createElement('a'), { href: url, download: 'chuut-mes-donnees.json' }).click()
  URL.revokeObjectURL(url)
}

export function Account() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const bp = useBreakpoint()
  const save = useSaveProfile()
  const lists = useMyLists()
  const onShared = lists.data?.some((l) => l.data.shared) ?? false
  const exportData = useExportData()
  const remove = useDeleteAccount()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayName = profile?.displayName ?? ''
  const provider = PROVIDERS[user?.providerData[0]?.providerId ?? ''] ?? 'E-mail'

  const openEdit = () => {
    setName(displayName)
    setEditing(true)
  }
  const rename = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({ displayName: name }, {
      onSuccess: () => {
        setEditing(false)
        toast('Enregistré')
      },
      onError: () => toast.error("Impossible d'enregistrer. Réessaie."),
    })
  }
  const download = () => exportData.mutate(undefined, {
    onSuccess: downloadJson,
    onError: () => toast.error("Impossible d'exporter tes données. Réessaie."),
  })

  return (
    <Screen>
      {bp !== 'mobile' && <PageHeader crumbs={[{ label: 'Mon compte' }]} />}
      {bp === 'mobile' && <TopBar onBack={() => nav('/app')} />}
      <ScreenBody gap={20}>
        <div className="account-head">
          <Avatar name={displayName} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h1>Mon compte</h1>
            <div className="muted small" style={{ overflowWrap: 'anywhere' }}>{user?.email}</div>
          </div>
        </div>

        <div className="eyebrow section-title">Profil</div>
        <div className="list-group">
          <button type="button" className="list-row" onClick={openEdit}>
            Prénom affiché
            <span className="list-row__value">{displayName}<ChevronRight size={20} aria-hidden="true" /></span>
          </button>
          <div className="list-row" style={{ cursor: 'default' }}>
            Connexion
            <span className="list-row__value">{provider}</span>
          </div>
        </div>

        <div className="eyebrow section-title">Confidentialité</div>
        <div className="list-group">
          <button type="button" className="list-row" onClick={download} disabled={exportData.isPending}>
            Télécharger mes données
            <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
          </button>
          <Link to="/conditions" className="list-row">
            Conditions et confidentialité
            <span className="list-row__value"><ChevronRight size={20} aria-hidden="true" /></span>
          </Link>
          <button type="button" className="list-row list-row--danger" onClick={() => setConfirmDelete(true)}>Supprimer mon compte</button>
        </div>

        <div className="hint-banner"><p className="hand">Tes réservations sur les listes des autres ne sont visibles nulle part dans ton profil.</p></div>
      </ScreenBody>
      <BottomBar plain><SignOutButton /></BottomBar>

      <Sheet open={editing} onOpenChange={setEditing} title="Prénom affiché" description="C'est ce que verront les personnes invitées sur tes listes.">
        <form className="stack" onSubmit={rename}>
          <Field label="Ton prénom ou surnom">
            <TextInput required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit" large full loading={save.isPending}>Enregistrer</Button>
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ton compte ?"
        description={'Ton compte, tes listes et tes souhaits seront supprimés définitivement. Cette action est irréversible.' + (onShared
          ? " Les listes que tu as créées disparaissent aussi pour ton/ta partenaire. Celles qu'on t'a partagées restent à la personne qui les a créées."
          : '')}
        confirmLabel="Supprimer mon compte"
        cancelLabel="Garder mon compte"
        loading={remove.isPending}
        onConfirm={() => remove.mutateAsync().then(() => nav('/'), () => toast.error('Suppression impossible. Réessaie.'))}
      />
    </Screen>
  )
}
