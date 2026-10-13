import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

/** Sticky footer. Put large Buttons inside (row; `stacked` for a column); in a row the primary grows. `note` goes under the actions. */
export function BottomBar({ children, note, plain, stacked }: { children: ReactNode; note?: ReactNode; plain?: boolean; stacked?: boolean }) {
  return (
    <div className={cn('bottom-bar', plain && 'bottom-bar--plain')}>
      <div className={cn('bottom-bar__actions', stacked && 'bottom-bar__actions--stacked')}>{children}</div>
      {note && <div className="legal">{note}</div>}
    </div>
  )
}
