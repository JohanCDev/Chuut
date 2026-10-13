import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

/**
 * Label + control + hint/error. Wraps the control in a <label>, so any input works as child.
 * Compatible with the old `<Field label>` from Shell.
 */
export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="field">
      <label className="field" aria-describedby={hint || error ? id : undefined}>
        <span className="field__label">{label}</span>
        {children}
      </label>
      {(error || hint) && (
        <span id={id} className={error ? 'error' : 'field__hint'} role={error ? 'alert' : undefined}>{error ?? hint}</span>
      )}
    </div>
  )
}

export const TextInput = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) =>
  <input {...rest} className={cn('input', className)} />

export const TextArea = ({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) =>
  <textarea {...rest} className={cn('input', className)} />

export const Select = ({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...rest} className={cn('input', className)} />
