import type { ReactNode } from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

/** Card-style checkbox (age confirmation). Works with `required` inside a <form>. */
export function Checkbox({ checked, onCheckedChange, label, description, required, name }: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  required?: boolean
  name?: string
}) {
  return (
    <label className="checkbox-card">
      <RadixCheckbox.Root
        className="checkbox"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        required={required}
        name={name}
      >
        <RadixCheckbox.Indicator><Check size={18} strokeWidth={3} /></RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <span>
        <span className="checkbox-card__title">{label}</span>
        {description && <span className="checkbox-card__desc" style={{ display: 'block' }}>{description}</span>}
      </span>
    </label>
  )
}
