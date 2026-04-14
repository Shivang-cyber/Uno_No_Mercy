import type {
  GameState, Card, Color, Direction, Player, GameEvent, CardValue,
} from '../shared/types.js'
import { buildDeck, shuffle, deal } from './deck.js'

// ── Constants ────────────────────────────────────────────────────

const MERCY_LIMIT = 25
const HAND_SIZE = 7

// ── Helpers ──────────────────────────────────────────────────────

function isDrawCard(value: CardValue): boolean {
  return ['+2', '+4', 'wild_+6', 'wild_+10', 'wild_reverse_+4'].includes(value)
}

function drawValue(value: CardValue): number {
  switch (value) {
    case '+2': return 2
    case '+4': return 4
    case 'wild_reverse_+4': return 4
    case 'wild_+6': return 6
    case 'wild_+10': return 10
    default: return 0
  }
}

function drawRank(value: CardValue): number {
  // For stacking: must play equal or higher
  return drawValue(value)
}

function nextAliveIndex(state: GameState, from: number, dir?: Direction): number {
  const d = dir ?? state.direction
  const n = state.players.length
  let idx = from
  for (let i = 0; i < n; i++) {
    idx = ((idx + d) % n + n) % n
    if (state.players[idx].hand.length > 0) return idx // alive = has cards
  }
  return idx // fallback
}

function currentPlayer(state: GameState): Player {
  return state.players[state.turnIndex]
}

// ── Initialize a new game ────────────────────────────────────────

export function initGame(code: string, players: Pick<Player, 'id' | 'name'>[]): GameState {
  const deck = shuffle(buildDeck())
  const { hands, remaining } = deal(deck, players.length, HAND_SIZE)

  const gamePlayers: Player[] = players.map((p, i) => ({
    ...p,
    hand: hands[i],
    connected: true,
    lastSeen: Date.now(),
  }))

  // Find first card for discard pile that is a simple number card
  let discard: Card[] = []
  let drawPile = remaining
  for (let i = 0; i < drawPile.length; i++) {
    const c = drawPile[i]
    if (c.color !== 'wild' && !isNaN(Number(c.value))) {
      discard = [drawPile.splice(i, 1)[0]]
      break
    }
  }

  return {
    code,
    hostId: players[0].id,
    players: gamePlayers,
    deck: drawPile,
    discard,
    turnIndex: 0,
    direction: 1,
    pendingDraw: 0,
    activeColor: discard[0]?.color as Color ?? null,
    phase: 'playing',
    winner: null,
    lastAction: null,
    rouletteTargetColor: null,
    pendingSwapPlayerId: null,
  }
}

// ── Draw cards from deck (reshuffles discard if needed) ──────────

function drawCards(state: GameState, count: number): Card[] {
  const drawn: Card[] = []
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      // Reshuffle discard into deck, keep top card
      if (state.discard.length <= 1) break // no cards left at all
      const top = state.discard.pop()!
      state.deck = shuffle(state.discard)
      state.discard = [top]
    }
    drawn.push(state.deck.pop()!)
  }
  return drawn
}

// ── Check if a card can be played ────────────────────────────────

export function canPlay(card: Card, state: GameState): boolean {
  // If there's a pending draw stack, only draw cards of equal or higher rank can be played
  if (state.pendingDraw > 0) {
    if (!isDrawCard(card.value)) return false
    // Find what rank started the stack (from top discard)
    const topDraw = drawRank(state.discard[state.discard.length - 1].value)
    return drawRank(card.value) >= topDraw
  }

  // Wild cards can always be played
  if (card.color === 'wild') return true

  const top = state.discard[state.discard.length - 1]
  if (!top) return true

  // Match active color or match value
  if (card.color === state.activeColor) return true
  if (card.value === top.value) return true

  return false
}

// ── Check mercy rule ─────────────────────────────────────────────

function checkMercy(state: GameState): GameEvent[] {
  const events: GameEvent[] = []
  for (const p of state.players) {
    if (p.hand.length >= MERCY_LIMIT) {
      // Eliminated — shuffle hand back into deck
      state.deck.push(...p.hand)
      p.hand = []
      state.deck = shuffle(state.deck)
      events.push({ event: 'eliminated', playerId: p.id })
    }
  }
  return events
}

// ── Check for winner ─────────────────────────────────────────────

function checkWinner(state: GameState): GameEvent | null {
  const alive = state.players.filter(p => p.hand.length > 0)
  if (alive.length <= 1) {
    const winner = alive[0] ?? state.players.find(p => p.hand.length === 0)
    if (winner) {
      state.winner = winner.id
      state.phase = 'ended'
      return { event: 'player_won', playerId: winner.id }
    }
  }
  // Also: if current player empties hand
  const cp = currentPlayer(state)
  if (cp.hand.length === 0) {
    state.winner = cp.id
    state.phase = 'ended'
    return { event: 'player_won', playerId: cp.id }
  }
  return null
}

// ── Advance turn ─────────────────────────────────────────────────

function advanceTurn(state: GameState, skip = 0) {
  let idx = state.turnIndex
  for (let i = 0; i <= skip; i++) {
    idx = nextAliveIndex(state, idx)
  }
  state.turnIndex = idx
}

// ── Play a card ──────────────────────────────────────────────────

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: Color,
): { ok: boolean; events: GameEvent[]; needsColorPick?: boolean; needsSwapPick?: boolean } {
  const events: GameEvent[] = []
  const player = currentPlayer(state)

  if (player.id !== playerId) return { ok: false, events: [{ event: 'card_played', playerId, card: null! }] }
  if (state.phase !== 'playing') return { ok: false, events: [] }

  const cardIdx = player.hand.findIndex(c => c.id === cardId)
  if (cardIdx === -1) return { ok: false, events: [] }

  const card = player.hand[cardIdx]
  if (!canPlay(card, state)) return { ok: false, events: [] }

  // Remove card from hand
  player.hand.splice(cardIdx, 1)
  state.discard.push(card)
  events.push({ event: 'card_played', playerId, card })

  // Set active color
  if (card.color === 'wild') {
    if (chosenColor) {
      state.activeColor = chosenColor
      events.push({ event: 'color_chosen', color: chosenColor })
    } else {
      // Need to pick color
      state.activeColor = null
      return { ok: true, events, needsColorPick: true }
    }
  } else {
    state.activeColor = card.color as Color
  }

  // ── Apply card effects ──

  switch (card.value) {
    case '0': {
      // 0's Pass: all pass hands in current direction
      const n = state.players.length
      const alive = state.players.filter(p => p.hand.length > 0 || p.id === playerId)
      if (alive.length > 1) {
        const hands = alive.map(p => p.hand)
        if (state.direction === 1) {
          const last = hands.pop()!
          hands.unshift(last)
        } else {
          const first = hands.shift()!
          hands.push(first)
        }
        alive.forEach((p, i) => { p.hand = hands[i] })
        events.push({ event: 'hands_passed', direction: state.direction })
      }
      advanceTurn(state)
      break
    }

    case '7': {
      // 7's Swap: player picks someone to swap with
      state.pendingSwapPlayerId = playerId
      // Don't advance turn yet — wait for SWAP_PICK
      return { ok: true, events, needsSwapPick: true }
    }

    case 'skip': {
      events.push({ event: 'turn_skipped', playerId: state.players[nextAliveIndex(state, state.turnIndex)].id })
      advanceTurn(state, 1) // skip one player
      break
    }

    case 'reverse': {
      state.direction = (state.direction * -1) as Direction
      events.push({ event: 'direction_reversed' })
      if (state.players.filter(p => p.hand.length > 0).length === 2) {
        // In 2-player, reverse acts as skip
        advanceTurn(state, 1)
      } else {
        advanceTurn(state)
      }
      break
    }

    case '+2':
    case '+4': {
      state.pendingDraw += drawValue(card.value)
      advanceTurn(state)
      break
    }

    case 'discard': {
      // Discard All: discard all cards matching this card's color from hand
      const color = card.color as Color
      const toDiscard = player.hand.filter(c => c.color === color)
      player.hand = player.hand.filter(c => c.color !== color)
      state.discard.push(...toDiscard)
      events.push({ event: 'discard_all', playerId, color, count: toDiscard.length })
      advanceTurn(state)
      break
    }

    case 'skip_all': {
      // Skip Everyone: skip all others, current player goes again
      events.push({ event: 'skip_everyone', playerId })
      // Don't advance — same player goes again
      break
    }

    // Wild cards
    case 'wild_reverse_+4': {
      state.direction = (state.direction * -1) as Direction
      events.push({ event: 'direction_reversed' })
      state.pendingDraw += 4
      advanceTurn(state)
      break
    }

    case 'wild_+6': {
      state.pendingDraw += 6
      advanceTurn(state)
      break
    }

    case 'wild_+10': {
      state.pendingDraw += 10
      advanceTurn(state)
      break
    }

    case 'wild_roulette': {
      // Next player must pick a color and draw until they hit it
      // We need the next player to pick a color — server handles this
      advanceTurn(state)
      state.rouletteTargetColor = null // will be set when target picks
      break
    }

    default: {
      // Regular number card (1-6, 8-9)
      advanceTurn(state)
    }
  }

  // Check mercy & winner
  events.push(...checkMercy(state))
  const winEvt = checkWinner(state)
  if (winEvt) events.push(winEvt)

  return { ok: true, events }
}

// ── Handle DRAW action ───────────────────────────────────────────

export function handleDraw(state: GameState, playerId: string): { events: GameEvent[]; drawnCards: Card[] } {
  const events: GameEvent[] = []
  const player = currentPlayer(state)
  if (player.id !== playerId || state.phase !== 'playing') return { events: [], drawnCards: [] }

  let totalDraw: number

  if (state.pendingDraw > 0) {
    // Forced draw from stacking
    totalDraw = state.pendingDraw
    state.pendingDraw = 0
  } else {
    // Draw until you get a playable card (No Mercy rule)
    totalDraw = 0
    let found = false
    while (!found && (state.deck.length > 0 || state.discard.length > 1)) {
      const drawn = drawCards(state, 1)
      if (drawn.length === 0) break
      player.hand.push(drawn[0])
      totalDraw++
      // Check if this card is playable on the current discard
      if (canPlay(drawn[0], { ...state, pendingDraw: 0 })) {
        found = true
      }
      // Safety: cap at 50 to prevent infinite loops
      if (totalDraw >= 50) break
    }
    events.push({ event: 'cards_drawn', playerId, count: totalDraw })
    // Check mercy
    events.push(...checkMercy(state))
    const winEvt = checkWinner(state)
    if (winEvt) events.push(winEvt)
    advanceTurn(state)
    return { events, drawnCards: player.hand.slice(-totalDraw) }
  }

  // Forced draw (from stacking)
  const drawn = drawCards(state, totalDraw)
  player.hand.push(...drawn)
  events.push({ event: 'cards_drawn', playerId, count: drawn.length })

  // Check mercy
  events.push(...checkMercy(state))
  const winEvt = checkWinner(state)
  if (winEvt) events.push(winEvt)

  advanceTurn(state)
  return { events, drawnCards: drawn }
}

// ── Handle 7's Swap pick ─────────────────────────────────────────

export function handleSwapPick(state: GameState, playerId: string, targetId: string): { ok: boolean; events: GameEvent[] } {
  if (state.pendingSwapPlayerId !== playerId) return { ok: false, events: [] }
  const player = state.players.find(p => p.id === playerId)
  const target = state.players.find(p => p.id === targetId)
  if (!player || !target || target.hand.length === 0) return { ok: false, events: [] }

  // Swap hands
  const temp = player.hand
  player.hand = target.hand
  target.hand = temp
  state.pendingSwapPlayerId = null

  const events: GameEvent[] = [{ event: 'hands_swapped', playerId, targetId }]
  events.push(...checkMercy(state))
  const winEvt = checkWinner(state)
  if (winEvt) events.push(winEvt)

  advanceTurn(state)
  return { ok: true, events }
}

// ── Handle Wild Color Roulette ───────────────────────────────────

export function handleRoulette(state: GameState, targetId: string, chosenColor: Color): { events: GameEvent[] } {
  const target = state.players.find(p => p.id === targetId)
  if (!target) return { events: [] }

  let count = 0
  let found = false
  while (!found && (state.deck.length > 0 || state.discard.length > 1)) {
    const drawn = drawCards(state, 1)
    if (drawn.length === 0) break
    target.hand.push(drawn[0])
    count++
    if (drawn[0].color === chosenColor) found = true
    if (count >= 50) break // safety cap
  }

  const events: GameEvent[] = [{ event: 'roulette', targetId, chosenColor, cardsDrawn: count }]
  events.push(...checkMercy(state))
  const winEvt = checkWinner(state)
  if (winEvt) events.push(winEvt)

  return { events }
}

// ── Utility: get public state ────────────────────────────────────

export function getPublicState(state: GameState): import('../shared/types.js').PublicGameState {
  return {
    code: state.code,
    phase: state.phase,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.hand.length,
      connected: p.connected,
      isEliminated: p.hand.length === 0 && state.phase === 'playing' && state.winner !== p.id,
    })),
    topDiscard: state.discard[state.discard.length - 1] ?? null,
    activeColor: state.activeColor,
    turnIndex: state.turnIndex,
    direction: state.direction,
    pendingDraw: state.pendingDraw,
    deckCount: state.deck.length,
    winner: state.winner,
    pendingSwapPlayerId: state.pendingSwapPlayerId,
  }
}
