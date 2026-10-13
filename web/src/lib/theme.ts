import type { CSSProperties } from 'react'
import type { ListType } from '../types'

export interface OccasionTheme {
  label: string
  /** accent for the "Liste de X" kicker */
  accent: string
  /** text colour of the back pill on the header */
  ink: string
  /** header background (colour + pattern) */
  header: CSSProperties
}

const dots = (bg: string, dot: string, size: number, r: number): CSSProperties => ({
  backgroundColor: bg,
  backgroundImage: `radial-gradient(circle at 50% 50%, ${dot} 0 ${r}px, transparent ${r + 0.5}px)`,
  backgroundSize: `${size}px ${size}px`,
})

export const OCCASION_THEMES: Record<ListType, OccasionTheme> = {
  christmas: {
    label: 'Noël',
    accent: '#B3202F',
    ink: 'var(--purchased)',
    header: {
      backgroundColor: '#1F4D3F',
      backgroundImage:
        'radial-gradient(circle at 50% 50%, #B3202F 0 5px, transparent 5.5px), radial-gradient(circle at 50% 50%, #F2EAD8 0 2px, transparent 2.5px)',
      backgroundSize: '30px 30px, 15px 15px',
      backgroundPosition: '0 0, 7px 7px',
    },
  },
  birthday: {
    label: 'Anniversaire',
    accent: '#B8432F',
    ink: 'var(--text)',
    header: dots('#F5C9B8', '#E5624D', 26, 7),
  },
  other: {
    label: 'Autre',
    accent: '#4F7455',
    ink: 'var(--text)',
    header: {
      backgroundColor: '#E8D4B3',
      backgroundImage: 'repeating-linear-gradient(135deg, #8DAA91 0 3px, transparent 3px 14px)',
    },
  },
}

export const themeFor = (type: ListType | undefined) => OCCASION_THEMES[type ?? 'other']
