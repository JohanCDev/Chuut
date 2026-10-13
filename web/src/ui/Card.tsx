import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/** White paper card. `dashed` = empty placeholder slot. */
export function Card({ pad, flat, dashed, className, ...rest }: { pad?: boolean; flat?: boolean; dashed?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn('card', pad && 'card--pad', flat && 'card--flat', dashed && 'card--dashed', className)} />
}
