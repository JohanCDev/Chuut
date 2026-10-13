import { Toaster as Sonner, toast } from 'sonner'
import { useBreakpoint } from '../lib/useBreakpoint'

/** Mount once (Layout does). Trigger with `toast('Lien copié')`, `toast.error(...)`. */
export function Toaster() {
  const bp = useBreakpoint()
  return (
    <Sonner
      position={bp === 'mobile' ? 'top-center' : 'top-right'}
      theme="system"
      toastOptions={{ style: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)' } }}
    />
  )
}

export { toast }
