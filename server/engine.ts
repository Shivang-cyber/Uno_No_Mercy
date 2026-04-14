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
    rouletteActive: false, // kept for type compat but no longer used
    pendingSwapPlayerId: null,
    calledUno: new Set<string>(),
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
      // Eliminated — set aside hand (PDF: "Set aside their hand until deck needs reshuffle")
      state.deck.push(...p.hand)
      p.hand = []
      state.deck = shuffle(state.deck)
      events.push({ event: 'eliminated', playerId: p.id })

      // If it's the eliminated player's turn, advance past them
      const elimIdx = state.players.indexOf(p)
      if (state.turnIndex === elimIdx) {
        state.turnIndex = nextAliveIndex(state, state.turnIndex)
      }
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

  if (player.id !== playerId) return { ok: false, events: [] }
  if (state.phase !== 'playing') return { ok: false, events: [] }
  if (state.rouletteActive) return { ok: false, events: [] }

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
      // Victim must draw one-at-a-time until they hit the active color
      advanceTurn(state)
      state.rouletteActive = true
      state.rouletteTargetColor = state.activeColor
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

  // ── Roulette mode: draw 1 card, check if it matches the target color
  if (state.rouletteActive && state.rouletteTargetColor) {
    const drawn = drawCards(state, 1)
    if (drawn.length > 0) {
      player.hand.push(drawn[0])
      events.push({ event: 'cards_drawn', playerId, count: 1 })

      if (drawn[0].color === state.rouletteTargetColor) {
        // Hit the color — roulette over, victim loses turn
        events.push({ event: 'roulette', targetId: playerId, chosenColor: state.rouletteTargetColor, cardsDrawn: 1 })
        state.rouletteActive = false
        state.rouletteTargetColor = null
        events.push(...checkMercy(state))
        const winEvt = checkWinner(state)
        if (winEvt) events.push(winEvt)
        advanceTurn(state)
      } else {
        // Didn't hit — stay on same player, they must draw again
        events.push(...checkMercy(state))
      }
    }
    return { events, drawnCards: drawn }
  }

  let totalDraw: number

  if (state.pendingDraw > 0) {
    // Forced draw from stacking
    totalDraw = state.pendingDraw
    state.pendingDraw = 0
  } else {
    // Standard UNO: draw exactly 1 card, turn ends
    const drawn = drawCards(state, 1)
    if (drawn.length > 0) {
      player.hand.push(drawn[0])
    }
    events.push({ event: 'cards_drawn', playerId, count: drawn.length })
    events.push(...checkMercy(state))
    const winEvt = checkWinner(state)
    if (winEvt) events.push(winEvt)
    advanceTurn(state)
    return { events, drawnCards: drawn }
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

  // Clear roulette state and advance turn
  state.rouletteActive = false
  state.rouletteTargetColor = null

  const events: GameEvent[] = [{ event: 'roulette', targetId, chosenColor, cardsDrawn: count }]
  events.push(...checkMercy(state))
  const winEvt = checkWinner(state)
  if (winEvt) events.push(winEvt)

  advanceTurn(state)
  return { events }
}

// ── UNO call / challenge ─────────────────────────────────────────

export function callUno(state: GameState, playerId: string): { ok: boolean; events: GameEvent[] } {
  const player = state.players.find(p => p.id === playerId)
  if (!player || player.hand.length !== 1) return { ok: false, events: [] }
  state.calledUno.add(playerId)
  return { ok: true, events: [{ event: 'uno_called', playerId }] }
}

export function challengeUno(state: GameState, challengerId: string, targetId: string): { ok: boolean; events: GameEvent[] } {
  const target = state.players.find(p => p.id === targetId)
  if (!target || target.hand.length !== 1) return { ok: false, events: [] }
  // If target already called UNO, challenge fails
  if (state.calledUno.has(targetId)) return { ok: false, events: [] }

  // Target failed to call UNO — draw 2 penalty
  const drawn = drawCards(state, 2)
  target.hand.push(...drawn)
  state.calledUno.delete(targetId) // reset

  const events: GameEvent[] = [{ event: 'uno_penalty', playerId: targetId, cardsDrawn: drawn.length }]
  events.push(...checkMercy(state))
  return { ok: true, events }
}

// ── Utility: get public state ────────────────────────────────────

export function getPublicState(state: GameState): import('../shared/types.js').PublicGameState {
  // Players with 1 card who haven't called UNO — challengeable
  const unoCallable = state.players
    .filter(p => p.hand.length === 1 && !state.calledUno.has(p.id))
    .map(p => p.id)

  // Last 5 cards from discard
  const recentDiscard = state.discard.slice(-5)

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
    recentDiscard,
    activeColor: state.activeColor,
    turnIndex: state.turnIndex,
    direction: state.direction,
    pendingDraw: state.pendingDraw,
    deckCount: state.deck.length,
    winner: state.winner,
    pendingSwapPlayerId: state.pendingSwapPlayerId,
    unoCallable,
    rouletteActive: state.rouletteActive,
    kickVotes: {},
    kickNeeded: {},
  }
}
