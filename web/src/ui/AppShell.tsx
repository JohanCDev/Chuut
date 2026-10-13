import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useBreakpoint } from '../lib/useBreakpoint'
import { useHotkeys } from '../lib/useHotkeys'
import { cn } from '../lib/cn'
import { ShortcutsDialog } from './ShortcutsDialog'
import { Sidebar } from './Sidebar'

/** Owner frame: sidebar (desktop) or icon rail (tablet) beside the page. Mobile renders the bare outlet. */
export function AppShell() {
  const bp = useBreakpoint()
  const nav = useNavigate()
  const [help, setHelp] = useState(false)

  useHotkeys([
    { key: 'n', label: 'Créer une liste', handler: () => nav('/lists/new') },
    {
      key: '/',
      label: 'Rechercher',
      handler: () => {
        const el = document.getElementById('global-search') as HTMLInputElement | null
        if (el) { el.focus(); el.select() }
      },
    },
    { key: '?', label: 'Cette aide', handler: () => setHelp(true) },
  ])

  if (bp === 'mobile') return <Outlet />

  return (
    <div className={cn('app-shell', `app-shell--${bp}`)}>
      <a className="skip-link" href="#main">Aller au contenu</a>
      <Sidebar collapsed={bp === 'tablet'} onShortcuts={() => setHelp(true)} />
      <main id="main" className="app-shell__main" tabIndex={-1}>
        <Outlet />
      </main>
      <ShortcutsDialog open={help} onOpenChange={setHelp} context="owner" />
    </div>
  )
}
