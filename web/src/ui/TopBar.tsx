import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from './Button'

/** Header for plain screens (signup, onboarding, account): round back button, optional centre and right slot. */
export function TopBar({ onBack, hideBack, center, right }: {
  onBack?: () => void
  hideBack?: boolean
  center?: ReactNode
  right?: ReactNode
}) {
  const nav = useNavigate()
  return (
    <div className="top-bar">
      {hideBack ? <span className="top-bar__side" /> : (
        <IconButton label="Retour" onClick={onBack ?? (() => (window.history.length > 1 ? nav(-1) : nav('/')))}><ChevronLeft size={22} /></IconButton>
      )}
      <div className="top-bar__center">{center}</div>
      <div className="top-bar__side">{right}</div>
    </div>
  )
}
