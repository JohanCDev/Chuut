import type { ReactNode } from 'react'

const Arrow = () => (
  <svg className="sticky-note-wrap__arrow" width="48" height="96" viewBox="0 0 48 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 4c34 12 38 52 22 84" />
    <path d="M18 76l12 14 10-16" />
  </svg>
)

/** Yellow post-it with Caveat text. `arrow="down"` adds a hand-drawn arrow under it (points at the bottom bar). */
export function StickyNote({ children, arrow, rotate = -3 }: { children: ReactNode; arrow?: 'down'; rotate?: number }) {
  return (
    <div className="sticky-note-wrap">
      <div className="sticky-note" style={{ transform: `rotate(${rotate}deg)` }}>{children}</div>
      {arrow === 'down' && <Arrow />}
    </div>
  )
}

/** Grey strip: Caveat title + small explanation, e.g. "Pas de spoiler ici". */
export function HintBanner({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="hint-banner">
      <div className="hand">{title}</div>
      <div className="hint-banner__text">{children}</div>
    </div>
  )
}
