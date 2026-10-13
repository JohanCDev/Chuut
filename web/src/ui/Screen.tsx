import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

/** Page wrapper inside the app column: `<Screen>` holds header/body/BottomBar stacked full height. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('screen', className)}>{children}</div>
}

/** Padded content area between the header and the BottomBar. */
export function ScreenBody({ children, gap }: { children: ReactNode; gap?: number }) {
  return <div className="screen-body" style={gap != null ? { gap } : undefined}>{children}</div>
}
