import { initialOf } from '../lib/format'
import { cn } from '../lib/cn'

export function Avatar({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={cn('avatar', size !== 'md' && `avatar--${size}`)} aria-hidden="true">{initialOf(name)}</span>
}

/** Two overlapped initials for a shared list. Decorative: names are always in text nearby. */
export function AvatarPair({ names, size = 'sm' }: { names: string[]; size?: 'sm' | 'md' }) {
  return (
    <span className="avatar-pair" aria-hidden="true">
      {names.slice(0, 2).map((n, i) => <Avatar key={i} name={n} size={size} />)}
    </span>
  )
}
