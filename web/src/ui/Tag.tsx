import type { ReactNode } from 'react'
import { Check, Lock, TriangleAlert } from 'lucide-react'
import { cn } from '../lib/cn'

export type TagVariant = 'claimed' | 'purchased' | 'warning' | 'neutral'

const ICONS: Record<TagVariant, ReactNode> = {
  claimed: <Lock size={16} aria-hidden="true" />,
  purchased: <Check size={18} strokeWidth={3} aria-hidden="true" />,
  warning: <TriangleAlert size={16} aria-hidden="true" />,
  neutral: null,
}

/**
 * Handwritten arrow-shaped tag. Always carries an icon and a label.
 * claimed (plum) is for GUEST views only. `still` disables the swing-in animation.
 */
export function Tag({ variant = 'neutral', icon, still, className, children }: {
  variant?: TagVariant
  icon?: ReactNode
  still?: boolean
  className?: string
  children: ReactNode
}) {
  return <span className={cn('tag', `tag--${variant}`, still && 'tag--still', className)}>{icon ?? ICONS[variant]}{children}</span>
}
