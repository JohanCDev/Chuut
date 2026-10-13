import confetti from 'canvas-confetti'

const COLORS = ['#B3202F', '#1F4D3F', '#E8B04A', '#F5C9B8', '#6A3F7A']

/** Purchased burst: 16 paper pieces for about 900 ms. No-op with prefers-reduced-motion. Call from an event handler. */
export function fireConfetti(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }) {
  void confetti({
    particleCount: 16,
    spread: 70,
    startVelocity: 32,
    gravity: 1.1,
    ticks: 54,
    scalar: 1.1,
    shapes: ['square'],
    colors: COLORS,
    origin,
    zIndex: 100,
    disableForReducedMotion: true,
  })
}
