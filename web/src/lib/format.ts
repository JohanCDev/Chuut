const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const eurRound = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/** 39.9 -> "39,90 €", 79 -> "79 €" */
export const formatPrice = (n: number) => (Number.isInteger(n) ? eurRound : eur).format(n)

/** Parse a "YYYY-MM-DD" event date as a local date. */
export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "2026-12-25" -> "25 décembre" */
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(parseDate(iso))

/** "2026-10-14" or Date -> "14 oct." */
export const formatShortDate = (d: Date | string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(typeof d === 'string' ? parseDate(d) : d)

/** Whole days from today (local) to the date. Negative when past. */
export const daysUntil = (iso: string, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseDate(iso).getTime() - today.getTime()) / 86_400_000)
}

/** "plus que 74 jours", "demain", "aujourd'hui". Empty string when the date is past. */
export const countdownLabel = (iso: string) => {
  const n = daysUntil(iso)
  if (n < 0) return ''
  if (n === 0) return "aujourd'hui"
  if (n === 1) return 'demain'
  return `plus que ${n} jours`
}

/** Verb or possessive agreement with the owners: one owner or a couple. */
export const agree = (shared: boolean | undefined, one: string, many: string) => (shared ? many : one)

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`

export const wishCountLabel = (n: number) => plural(n, 'souhait')
export const guestCountLabel = (n: number) => plural(n, 'invité')

export const initialOf = (name?: string | null) => (name?.trim()[0] ?? '?').toUpperCase()
