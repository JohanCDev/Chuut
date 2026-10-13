import { Link } from 'react-router-dom'

/** "chuut" wordmark. `to` makes it a link; `color` overrides the ribbon red (e.g. white on dark hero). */
export function Logo({ size = 32, to, color }: { size?: number; to?: string; color?: string }) {
  const style = { fontSize: size, color }
  return to
    ? <Link to={to} className="logo" style={style} aria-label="Chuut, accueil">chuut</Link>
    : <span className="logo" style={style}>chuut</span>
}
