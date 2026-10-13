import type { ReactNode } from 'react'

/** Page wrapper inside the app column: `<Screen>` holds header/body/BottomBar stacked full height. */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="screen" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>{children}</div>
}

/** Padded content area between the header and the BottomBar. */
export function ScreenBody({ children, gap }: { children: ReactNode; gap?: number }) {
  return <div className="screen-body" style={gap != null ? { gap } : undefined}>{children}</div>
}
