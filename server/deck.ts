import type { Card, Color, CardValue, AnyColor } from '../shared/types.js'

// ── Image path mapping ───────────────────────────────────────────

const COLOR_FOLDER: Record<Color, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
}

function cardImage(color: AnyColor, value: CardValue): string {
  if (color === 'wild') {
    // Wild cards: wild_reverse_+4, wild_+6, wild_+10, wild_roulette
    const nameMap: Record<string, string> = {
      'wild_reverse_+4': 'wild_reverse_+4',
      'wild_+6': 'wild_+6',
      'wild_+10': 'wild_+10',
      'wild_roulette': 'wild_roulette',
    }
    return `Wild/${nameMap[value]}.jpg`
  }
  const folder = COLOR_FOLDER[color as Color]
  return `${folder}/${color}_${value}.jpg`
}

// ── Card factory ─────────────────────────────────────────────────

let _idCounter = 0

function makeCard(color: AnyColor, value: CardValue): Card {
  const id = `${color === 'wild' ? value : color + '_' + value}_${_idCounter++}`
  return { id, color, value, image: cardImage(color, value) }
}

function makeN(color: AnyColor, value: CardValue, count: number): Card[] {
  return Array.from({ length: count }, () => makeCard(color, value))
}

// ── Build the full 168-card No Mercy deck ────────────────────────

export function buildDeck(): Card[] {
  _idCounter = 0
  const cards: Card[] = []
  const colors: Color[] = ['red', 'yellow', 'green', 'blue']

  for (const c of colors) {
    // Number cards: 2 of each (0-9)
    for (let n = 0; n <= 9; n++) {
      cards.push(...makeN(c, String(n) as CardValue, 2))
    }

    // Colored action cards: 2 each
    cards.push(...makeN(c, 'skip', 2))
    cards.push(...makeN(c, 'reverse', 2))
    cards.push(...makeN(c, '+2', 2))
    cards.push(...makeN(c, '+4', 2))
    cards.push(...makeN(c, 'discard', 2))
    cards.push(...makeN(c, 'skip_all', 2))
  }

  // Wild cards: 2 each
  cards.push(...makeN('wild', 'wild_reverse_+4', 2))
  cards.push(...makeN('wild', 'wild_+6', 2))
  cards.push(...makeN('wild', 'wild_+10', 2))
  cards.push(...makeN('wild', 'wild_roulette', 2))

  return cards
}

// ── Shuffle (Fisher-Yates) ───────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Deal hands ───────────────────────────────────────────────────

export function deal(deck: Card[], playerCount: number, handSize = 7): { hands: Card[][]; remaining: Card[] } {
  const d = [...deck]
  const hands: Card[][] = []
  for (let p = 0; p < playerCount; p++) {
    hands.push(d.splice(0, handSize))
  }
  return { hands, remaining: d }
}
