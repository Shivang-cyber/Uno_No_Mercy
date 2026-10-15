// Imperative, throwaway visual effects (card flights, ripples, confetti...).
// Everything is positioned from real DOM rects and lives in a fixed layer,
// so it lines up at any window size and never touches React state.

import type { Color } from '../../shared/types'

const BACK_IMAGE = '/cards/Back/back.png'

export const COLOR_HEX: Record<Color, string> = {
  red: '#e74c3c',
  yellow: '#f1c40f',
  green: '#27ae60',
  blue: '#3498db',
}

let layer: HTMLDivElement | null = null
function getLayer(): HTMLDivElement {
  if (layer && document.body.contains(layer)) return layer
  layer = document.createElement('div')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden'
  document.body.appendChild(layer)
  return layer
}

// ── Anchors ──────────────────────────────────────────────────────

export interface Point { x: number; y: number }

function centerOf(el: Element | null): Point | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function anchor(name: 'deck' | 'discard' | 'hand'): Point | null {
  return centerOf(document.querySelector(`[data-anchor="${name}"]`))
}

export function seat(playerId: string): Point | null {
  return centerOf(document.querySelector(`[data-seat="${CSS.escape(playerId)}"]`))
}

// Card size on the table: the draw pile is the reference.
export function cardSize(): { w: number; h: number } {
  const r = document.querySelector('[data-anchor="deck"]')?.getBoundingClientRect()
  return r && r.width > 0 ? { w: r.width, h: r.height } : { w: 72, h: 112 }
}

// Hand card positions are snapshotted on click, because the card leaves the
// hand (YOUR_HAND) around the same time its card_played event arrives.
const handRects = new Map<string, Point>()

export function snapshotHand() {
  handRects.clear()
  document.querySelectorAll<HTMLElement>('[data-hand-card]').forEach(el => {
    const c = centerOf(el)
    if (c) handRects.set(el.dataset.handCard!, c)
  })
}

export function handCard(cardId: string): Point | null {
  return centerOf(document.querySelector(`[data-hand-card="${CSS.escape(cardId)}"]`)) ?? handRects.get(cardId) ?? null
}

// When a flight is heading into my hand, new hand cards wait for it to land.
export const handArrival = { at: 0 }

// ── Card flight ──────────────────────────────────────────────────

export interface FlightOpts {
  from: Point
  to: Point
  fromScale?: number
  toScale?: number
  face?: string             // card image path under /cards/; omitted = card back only
  flip?: 'none' | 'toFace'  // toFace: starts face-down, turns over mid-air
  delay?: number
  duration?: number
  lift?: number             // how high (px) the arc rises
  landSpin?: number         // degrees of Z rotation just before settling
  onLand?: () => void
}

export function flyCard(o: FlightOpts) {
  const { w, h } = cardSize()
  const delay = o.delay ?? 0
  const duration = o.duration ?? 650
  const s0 = o.fromScale ?? 1
  const s1 = o.toScale ?? 1
  const dx = o.from.x - o.to.x
  const dy = o.from.y - o.to.y
  const dist = Math.hypot(dx, dy)
  const lift = o.lift ?? Math.min(140, 50 + dist * 0.25)
  const spin = o.landSpin ?? 0

  const el = document.createElement('div')
  el.style.cssText = `position:absolute;left:${o.to.x - w / 2}px;top:${o.to.y - h / 2}px;width:${w}px;height:${h}px;transform-style:preserve-3d;will-change:transform;opacity:0`

  const inner = document.createElement('div')
  inner.style.cssText = 'position:absolute;inset:0;transform-style:preserve-3d'
  const faceStyle = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:8px;backface-visibility:hidden;-webkit-backface-visibility:hidden'

  const back = document.createElement('img')
  back.src = BACK_IMAGE
  back.style.cssText = `${faceStyle};transform:rotateY(180deg)`
  inner.appendChild(back)
  if (o.face) {
    const front = document.createElement('img')
    front.src = `/cards/${o.face}`
    front.style.cssText = faceStyle
    inner.appendChild(front)
  }
  // No face known: keep the back showing the whole way.
  inner.style.transform = o.face ? 'rotateY(0deg)' : 'rotateY(180deg)'
  el.appendChild(inner)
  getLayer().appendChild(el)

  const t = (x: number, y: number, rx: number, rz: number, s: number) =>
    `translate(${x}px, ${y}px) perspective(900px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s})`
  const peak = Math.max(s0, s1) * 1.3

  const flight = el.animate([
    { offset: 0, opacity: 1, transform: t(dx, dy, 0, 0, s0), filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))', easing: 'cubic-bezier(.3,.7,.4,1)' },
    { offset: 0.45, opacity: 1, transform: t(dx * 0.45, dy * 0.45 - lift, 28, spin * 0.5, peak), filter: 'drop-shadow(0 36px 26px rgba(0,0,0,.55))', easing: 'cubic-bezier(.5,0,.75,.3)' },
    { offset: 0.86, opacity: 1, transform: t(0, 0, 0, spin, s1 * 0.94), filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))', easing: 'ease-out' },
    { offset: 1, opacity: 1, transform: t(0, 0, 0, 0, s1), filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))' },
  ], { duration, delay, fill: 'both' })

  if (o.face && o.flip === 'toFace') {
    inner.animate(
      [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(180deg)', offset: 0.15 }, { transform: 'rotateY(0deg)', offset: 0.6 }, { transform: 'rotateY(0deg)' }],
      { duration, delay, fill: 'both', easing: 'ease-in-out' },
    )
  }

  flight.finished.then(() => {
    el.remove()
    o.onLand?.()
  }, () => el.remove())
}

// ── Coloured ripple from a point (wild colour chosen) ───────────

export function ripple(at: Point, color: string, delay = 0) {
  for (let i = 0; i < 2; i++) {
    const ring = document.createElement('div')
    const size = 120
    ring.style.cssText = `position:absolute;left:${at.x - size / 2}px;top:${at.y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;border:4px solid ${color};box-shadow:0 0 30px ${color}, inset 0 0 30px ${color};opacity:0`
    getLayer().appendChild(ring)
    ring.animate(
      [{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(3.4)', opacity: 0 }],
      { duration: 900, delay: delay + i * 180, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'both' },
    ).finished.then(() => ring.remove(), () => ring.remove())
  }
}

// ── Seat shatter (mercy elimination) ─────────────────────────────

export function shatter(at: Point) {
  const colors = Object.values(COLOR_HEX)
  for (let i = 0; i < 14; i++) {
    const shard = document.createElement('div')
    const size = 8 + Math.random() * 10
    shard.style.cssText = `position:absolute;left:${at.x - size / 2}px;top:${at.y - size / 2}px;width:${size}px;height:${size * 1.4}px;background:${colors[i % 4]};border-radius:2px;clip-path:polygon(50% 0,100% 40%,70% 100%,0 70%)`
    getLayer().appendChild(shard)
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4
    const d = 60 + Math.random() * 70
    shard.animate(
      [
        { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d + 40}px) rotate(${Math.random() * 720 - 360}deg) scale(.4)`, opacity: 0 },
      ],
      { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.15,.6,.4,1)', fill: 'both' },
    ).finished.then(() => shard.remove(), () => shard.remove())
  }
}

// ── Confetti (winner) ────────────────────────────────────────────

export function confetti() {
  const colors = [...Object.values(COLOR_HEX), '#fdc48a', '#c9a4ff']
  const vw = window.innerWidth
  for (let i = 0; i < 140; i++) {
    const piece = document.createElement('div')
    const w = 6 + Math.random() * 6
    piece.style.cssText = `position:absolute;left:${Math.random() * vw}px;top:-20px;width:${w}px;height:${w * 0.5}px;background:${colors[i % colors.length]};border-radius:1px;z-index:70`
    getLayer().appendChild(piece)
    const drift = (Math.random() - 0.5) * 240
    piece.animate(
      [
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 1080}deg)`, opacity: 0.9 },
      ],
      { duration: 2400 + Math.random() * 1800, delay: Math.random() * 900, easing: 'cubic-bezier(.25,.4,.5,1)', fill: 'both' },
    ).finished.then(() => piece.remove(), () => piece.remove())
  }
}
