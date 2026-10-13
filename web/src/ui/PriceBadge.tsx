import { formatPrice } from '../lib/format'
import { cn } from '../lib/cn'

const tilt = (seed: string) => {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  const deg = 6 + (Math.abs(h) % 5)
  return h % 2 === 0 ? deg : -deg
}

/** Rotated gold coin. Absolutely positioned at the card's top-right unless `inline`. */
export function PriceBadge({ price, seed = '', inline }: { price: number; seed?: string; inline?: boolean }) {
  const label = formatPrice(price)
  return (
    <div
      className={cn('price-badge', inline && 'price-badge--inline', label.length > 5 && 'price-badge--sm')}
      style={{ transform: `rotate(${tilt(seed + price)}deg)` }}
    >
      {label}
    </div>
  )
}
