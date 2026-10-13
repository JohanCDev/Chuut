import { useEffect, useRef } from 'react'
import { useBreakpoint } from './useBreakpoint'

export interface Hotkey {
  /** KeyboardEvent.key, case-insensitive for letters: 'n', 'a', '/', '?', 'Escape', 'Enter' */
  key: string
  handler: (e: KeyboardEvent) => void
  /** Cmd (mac) or Ctrl (others) chord. Default: no modifier allowed */
  mod?: boolean
  /** fire even while a text field is focused (Escape, Mod+Enter). Default false */
  inInput?: boolean
  /** extra enabling condition. Default true */
  enabled?: boolean
  /** shown in ShortcutsDialog; omit to hide */
  label?: string
}

const TEXT_FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const MODAL_OPEN = '[role="dialog"][data-state="open"][aria-modal="true"], [data-vaul-drawer][data-state="open"]'

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.matches(TEXT_FIELD) || el.closest('[role="combobox"]') !== null)

const matches = (b: Hotkey, e: KeyboardEvent, typing: boolean, modal: boolean) => {
  if (b.enabled === false) return false
  if (modal && b.key !== 'Escape') return false
  if (typing && !b.inInput) return false
  if (e.altKey) return false
  const mod = e.metaKey || e.ctrlKey
  if (b.mod ? !mod : mod) return false
  return e.key.toLowerCase() === b.key.toLowerCase()
}

/** Global keyboard shortcuts. Inactive on mobile. The first matching binding wins. */
export function useHotkeys(bindings: Hotkey[]): void {
  const breakpoint = useBreakpoint()
  const latest = useRef(bindings)

  useEffect(() => {
    latest.current = bindings
  })

  useEffect(() => {
    if (breakpoint === 'mobile') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.isComposing || e.defaultPrevented) return
      const typing = isTyping(e.target) || isTyping(document.activeElement)
      const modal = document.querySelector(MODAL_OPEN) !== null
      const binding = latest.current.find((b) => matches(b, e, typing, modal))
      if (!binding) return
      e.preventDefault()
      binding.handler(e)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [breakpoint])
}
