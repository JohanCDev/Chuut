import { Toaster as Sonner, toast } from 'sonner'

/** Mount once (Layout does). Trigger with `toast('Lien copié')`, `toast.error(...)`. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="system"
      toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' } }}
    />
  )
}

export { toast }
