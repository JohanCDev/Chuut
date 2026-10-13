import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'
import { Sheet } from './Sheet'
import { useBreakpoint } from '../lib/useBreakpoint'

/**
 * Detail panel beside a list. Desktop: a non-modal `aside` (no focus trap) that takes focus on open.
 * Tablet: a right-hand drawer. Mobile: not rendered (use a bottom sheet there).
 * `footerRef` lets a child portal its actions into the footer; `returnFocusTo` is focused on close.
 */
export function SidePanel({ title, onClose, children, footer, headerActions, returnFocusTo, footerRef }: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  headerActions?: ReactNode
  returnFocusTo?: () => HTMLElement | null
  footerRef?: (el: HTMLElement | null) => void
}) {
  const bp = useBreakpoint()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const returnRef = useRef(returnFocusTo)

  useEffect(() => {
    returnRef.current = returnFocusTo
  })

  // Desktop only: the heading is null on tablet, where the drawer provides its own focus handling.
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null
    if (!active?.closest('.tile-grid')) headingRef.current?.focus()
  }, [])

  useEffect(() => () => {
    returnRef.current?.()?.focus()
  }, [])

  if (bp === 'mobile') return null

  if (bp === 'desktop') {
    return (
      <aside className="side-panel" aria-label={title}>
        <div className="side-panel__head">
          <h2 ref={headingRef} tabIndex={-1}>{title}</h2>
          <div className="side-panel__head-actions">{headerActions}</div>
          <IconButton label="Fermer le panneau" bare onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="side-panel__body">{children}</div>
        <div className="side-panel__foot" ref={footerRef}>{footer}</div>
      </aside>
    )
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      variant="drawer"
      title={title}
      footer={<div ref={footerRef}>{footer}</div>}
    >
      {headerActions && <div className="side-panel__head-actions side-panel__head-actions--drawer">{headerActions}</div>}
      {children}
    </Sheet>
  )
}
