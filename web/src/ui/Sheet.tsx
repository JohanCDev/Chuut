import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { Button, IconButton } from './Button'
import { cn } from '../lib/cn'
import { useBreakpoint } from '../lib/useBreakpoint'

/**
 * Bottom sheet (vaul on Radix Dialog): focus trap, Esc, backdrop click, swipe down, aria-modal.
 * `title` is required for accessibility; use `hideTitle` to keep it screen-reader only.
 * Controlled: <Sheet open onOpenChange title>...</Sheet>. For route-driven sheets, open={true} and navigate in onOpenChange(false).
 *
 * `variant` picks the presentation per breakpoint:
 * - 'auto' (default): bottom sheet below 768px, drawer 768-1199px, centered dialog from 1200px.
 * - 'dialog': bottom sheet below 768px, centered dialog from 768px.
 * - 'drawer': bottom sheet below 768px, right-hand drawer from 768px.
 * - 'sheet': always a bottom sheet.
 * `size` sets the dialog width (sm 440px, md 560px, lg 860px). `footer` is pinned below the body on tablet and desktop.
 */
export function Sheet({
  open, onOpenChange, title, hideTitle, description, children, variant = 'auto', size = 'md', footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  hideTitle?: boolean
  description?: ReactNode
  children?: ReactNode
  variant?: 'auto' | 'dialog' | 'drawer' | 'sheet'
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}) {
  const bp = useBreakpoint()
  if (variant === 'sheet' || bp === 'mobile') {
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
              {footer}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  const presentation = variant === 'drawer' ? 'drawer' : variant === 'dialog' ? 'dialog' : (bp === 'tablet' ? 'drawer' : 'dialog')
  const p = presentation

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={p === 'drawer' ? 'drawer' : cn('dialog', `dialog--${size}`)}>
          <div className={`${p}__head`}>
            <Dialog.Title className={hideTitle ? 'sr-only' : `${p}__title`}>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton label="Fermer" bare>
                <X size={20} />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? `${p}__desc` : 'sr-only'}>{description ?? title}</Dialog.Description>
          <div className={`${p}__body`}>{children}</div>
          {footer && <div className={`${p}__foot`}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Bottom-sheet confirmation (primary confirm, secondary cancel, as pages 12 and 18).
 * Closes itself after onConfirm resolves. Renders as a small centered dialog from 768px.
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
  const mobile = useBreakpoint() === 'mobile'
  const confirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description} variant="dialog" size="sm">
      <div className={cn('sheet__actions', !mobile && 'sheet__actions--row')}>
        <Button large={mobile} full={mobile} loading={loading} onClick={() => void confirm()}>{confirmLabel}</Button>
        <Button large={mobile} full={mobile} variant="secondary" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>
      </div>
    </Sheet>
  )
}
