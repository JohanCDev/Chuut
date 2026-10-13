import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

const itemsIn = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

/**
 * Dropdown menu for header actions (ARIA menu pattern). Items use roving focus by script:
 * arrows, Home/End move, Escape and Tab close, a click outside closes.
 */
export function Menu({ label, trigger, children }: { label: string; trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) itemsIn(popRef.current)[0]?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = itemsIn(popRef.current)
    const i = items.indexOf(document.activeElement as HTMLElement)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        items[(i + 1) % items.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        items[i <= 0 ? items.length - 1 : i - 1]?.focus()
        break
      case 'Home':
        e.preventDefault()
        items[0]?.focus()
        break
      case 'End':
        e.preventDefault()
        items[items.length - 1]?.focus()
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab':
        // Not prevented: focus moves on from the trigger, and menu items are not tabbable.
        setOpen(false)
        triggerRef.current?.focus()
        break
    }
  }

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        className="header-round"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        ref={triggerRef}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="menu__popover"
          onKeyDown={onKeyDown}
          onClick={() => setOpen(false)}
          ref={popRef}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** Item of a `Menu`: a link when `to` is set, otherwise a button. */
export function MenuItem({ to, onClick, danger, children }: { to?: string; onClick?: () => void; danger?: boolean; children: ReactNode }) {
  const className = cn('list-row', danger && 'list-row--danger')
  if (to) {
    return <Link to={to} role="menuitem" tabIndex={-1} className={className}>{children}</Link>
  }
  return (
    <button type="button" role="menuitem" tabIndex={-1} className={className} onClick={onClick}>
      {children}
    </button>
  )
}
