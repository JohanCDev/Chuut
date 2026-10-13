import type { ReactNode } from 'react'
import { Drawer } from 'vaul'
import { Button } from './Button'

/**
 * Bottom sheet (vaul on Radix Dialog): focus trap, Esc, backdrop click, swipe down, aria-modal.
 * `title` is required for accessibility; use `hideTitle` to keep it screen-reader only.
 * Controlled: <Sheet open onOpenChange title>...</Sheet>. For route-driven sheets, open={true} and navigate in onOpenChange(false).
 */
export function Sheet({ open, onOpenChange, title, hideTitle, description, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hideTitle?: boolean
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className="sheet">
          <div className="sheet__handle" aria-hidden="true" />
          <div className="sheet__scroll">
            <Drawer.Title className={hideTitle ? 'sr-only' : 'sheet__title'}>{title}</Drawer.Title>
            {description
              ? <Drawer.Description className="sheet__desc">{description}</Drawer.Description>
              : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/**
 * Bottom-sheet confirmation (primary confirm, secondary cancel, as pages 12 and 18).
 * Closes itself after onConfirm resolves.
 */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, loading, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel: string
  cancelLabel: string
  loading?: boolean
  onConfirm: () => void | Promise<unknown>
}) {
  const confirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="sheet__actions">
        <Button large full loading={loading} onClick={() => void confirm()}>{confirmLabel}</Button>
        <Button large full variant="secondary" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
      </div>
    </Sheet>
  )
}
