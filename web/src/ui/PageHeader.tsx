import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'

export interface Crumb { label: string; to?: string }

/**
 * Desktop page header: breadcrumb trail, optional global search (synced to `?q=`), right-aligned `actions`.
 */
export function PageHeader({ crumbs, actions, search }: { crumbs: Crumb[]; actions?: ReactNode; search?: boolean }) {
  return (
    <header className="page-header">
      <nav aria-label="Fil d'Ariane">
        <ol className="crumbs">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1
            return (
              <li key={i}>
                {last
                  ? <span aria-current="page">{c.label}</span>
                  : c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                {!last && <span className="crumbs__sep" aria-hidden="true">/</span>}
              </li>
            )
          })}
        </ol>
      </nav>
      {search && <SearchBox />}
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

const DEBOUNCE_MS = 150

/** Search input bound to `?q=`; typing is debounced, Escape clears at once. */
function SearchBox() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [value, setValue] = useState(q)
  const pushed = useRef(q)
  const timer = useRef<number | undefined>(undefined)

  // Follow external changes to `q` (back/forward, links) without reacting to our own pushes.
  useEffect(() => {
    if (q === pushed.current) return
    window.clearTimeout(timer.current)
    pushed.current = q
    setValue(q)
  }, [q])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = (next: string) => {
    window.clearTimeout(timer.current)
    pushed.current = next
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (next) p.set('q', next)
      else p.delete('q')
      return p
    }, { replace: true })
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setValue(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(next), DEBOUNCE_MS)
  }

  const clear = () => {
    setValue('')
    commit('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') return
    e.preventDefault() // stops the page-level Escape (close panel) from also firing
    clear()
    e.currentTarget.blur()
  }

  return (
    <div className="search">
      <Search size={16} className="search__icon" aria-hidden="true" />
      <input
        id="global-search"
        type="search"
        aria-label="Rechercher"
        placeholder="Rechercher"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      {value
        ? <button type="button" className="search__clear" aria-label="Effacer la recherche" onClick={clear}><X size={14} aria-hidden="true" /></button>
        : <kbd className="kbd">/</kbd>}
    </div>
  )
}
