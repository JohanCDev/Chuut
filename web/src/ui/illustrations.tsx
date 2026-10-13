const BACKGROUNDS = ['#EAD9BE', '#F5C9B8', '#D3E1D9', '#E6DDF0', '#F7E3A8']
const RIBBONS = ['#B3202F', '#1F4D3F', '#E5624D', '#6A3F7A', '#2F4A6B']

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)

/** Fallback for wishes without an image: a small gift, colours picked from the title. */
export function WishFallback({ title }: { title: string }) {
  const h = Math.abs(hash(title))
  const bg = BACKGROUNDS[h % BACKGROUNDS.length]
  const ribbon = RIBBONS[(h >> 3) % RIBBONS.length]
  return (
    <svg viewBox="0 0 104 112" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration d'un cadeau">
      <rect width="104" height="112" fill={bg} />
      <rect x="26" y="50" width="52" height="38" rx="5" fill="#C9A675" />
      <rect x="23" y="42" width="58" height="14" rx="4" fill="#D8B887" />
      <rect x="48" y="42" width="8" height="46" fill={ribbon} />
      <path d="M52 42c-12-14-24-4-14 2zM52 42c12-14 24-4 14 2z" fill={ribbon} />
      <circle cx="86" cy="22" r="3" fill="#B3202F" />
      <circle cx="18" cy="96" r="3" fill="#E8B04A" />
    </svg>
  )
}

/** Kraft gift box with a "chut..." label (landing hero). */
export function GiftBox({ width = 220 }: { width?: number }) {
  return (
    <svg width={width} viewBox="0 0 220 150" role="img" aria-label="Un cadeau avec une étiquette « chut... »" style={{ filter: 'drop-shadow(0 12px 16px rgba(0,0,0,.35))' }}>
      <rect x="10" y="10" width="200" height="130" rx="8" fill="#C9A675" />
      <rect x="98" y="10" width="24" height="130" fill="#B3202F" />
      <rect x="10" y="62" width="200" height="24" fill="#B3202F" />
      <path d="M110 62C80 16 52 28 70 56zM110 62c30-46 58-34 40-6z" fill="#B3202F" />
      <circle cx="110" cy="62" r="11" fill="#8E1823" />
      <g transform="translate(150 98) rotate(-8)">
        <path d="M0 18l14-18h54v36H14z" fill="#FBF6EE" />
        <text x="22" y="26" fontFamily="Caveat, cursive" fontWeight="600" fontSize="20" fill="#6A3F7A">chut...</text>
      </g>
    </svg>
  )
}

/** Open empty box with a question mark (not found). */
export function EmptyBox({ width = 260 }: { width?: number }) {
  return (
    <svg width={width} viewBox="0 0 260 190" role="img" aria-label="Une boîte vide">
      <text x="34" y="46" fontFamily="Fraunces, serif" fontWeight="700" fontSize="44" fill="#6B5A52">?</text>
      <rect x="52" y="86" width="150" height="86" rx="8" fill="#C9A675" />
      <polygon points="40,98 118,62 138,98 60,132" fill="#D8B887" transform="rotate(-6 90 100)" />
      <polygon points="214,98 136,62 116,98 194,132" fill="#D8B887" transform="rotate(8 170 100)" />
      <g transform="translate(100 38) rotate(6)">
        <rect width="104" height="40" fill="#F5DA7E" />
        <text x="22" y="28" fontFamily="Caveat, cursive" fontWeight="600" fontSize="26" fill="#2A1E1A">vide...</text>
      </g>
    </svg>
  )
}
