import { useState, type ReactNode } from 'react'
import { useBreakpoint } from '../lib/useBreakpoint'
import { useHotkeys } from '../lib/useHotkeys'
import { cn } from '../lib/cn'
import { ShortcutsDialog } from './ShortcutsDialog'
import { Sidebar } from './Sidebar'

/** Guest frame: sidebar (desktop) or icon rail (tablet) beside the list. Mobile renders the bare children. */
export function GuestShell({ children }: { children: ReactNode }) {
  const bp = useBreakpoint()
  const [help, setHelp] = useState(false)

  useHotkeys([
    { key: '?', label: 'Cette aide', handler: () => setHelp(true) },
    {
      key: '/',
      label: 'Rechercher',
      handler: () => {
        const el = document.getElementById('global-search') as HTMLInputElement | null
        if (el) { el.focus(); el.select() }
      },
    },
  ])

  if (bp === 'mobile') return <>{children}</>

  return (
    <div className={cn('app-shell', `app-shell--${bp}`)}>
      <a className="skip-link" href="#main">Aller au contenu</a>
      <Sidebar guest collapsed={bp === 'tablet'} onShortcuts={() => setHelp(true)} />
      <main id="main" className="app-shell__main" tabIndex={-1}>{children}</main>
      <ShortcutsDialog open={help} onOpenChange={setHelp} context="guest" />
    </div>
  )
}
