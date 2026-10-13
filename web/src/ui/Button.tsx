import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'social' | 'dark' | 'ghost' | 'danger' | 'link'

interface Look {
  variant?: ButtonVariant
  /** 52px tall, as in bottom bars */
  large?: boolean
  full?: boolean
}

const classes = ({ variant = 'primary', large, full }: Look, extra?: string) =>
  cn('btn', `btn--${variant}`, large && 'btn--lg', full && 'btn--full', extra)

export function Button({
  variant, large, full, loading, disabled, className, children, type = 'button', ...rest
}: Look & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      type={type}
      className={classes({ variant, large, full }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner__ring btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, large, full, className, ...rest }: Look & LinkProps & { children?: ReactNode }) {
  return <Link {...rest} className={classes({ variant, large, full }, className)} />
}

/** Round 44px icon button. Always pass `label` (aria-label). */
export function IconButton({
  label, bare, className, children, type = 'button', ...rest
}: { label: string; bare?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} type={type} aria-label={label} className={cn('icon-btn', bare && 'icon-btn--bare', className)}>
      {children}
    </button>
  )
}
