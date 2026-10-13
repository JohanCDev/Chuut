/** Lowercases and strips accents so "Noël" matches "noel". */
export const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** True when the trimmed query is empty or is contained (case and accent insensitive) in any field. */
export const matches = (q: string, ...fields: (string | null | undefined)[]) => {
  const needle = norm(q.trim())
  return !needle || fields.some((f) => !!f && norm(f).includes(needle))
}
