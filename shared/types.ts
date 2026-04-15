// ── Colors & Values ──────────────────────────────────────────────

export type Color = 'red' | 'yellow' | 'green' | 'blue'
export type WildColor = 'wild'
export type AnyColor = Color | WildColor

export type NumberValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type ColoredActionValue = 'skip' | 'reverse' | '+2' | '+4' | 'discard' | 'skip_all'
export type WildActionValue = 'wild_reverse_+4' | 'wild_+6' | 'wild_+10' | 'wild_roulette'

export type CardValue = NumberValue | ColoredActionValue | WildActionValue

// ── Card ─────────────────────────────────────────────────────────

export interface Card {
  id: string            // unique instance ID (e.g. "red_3_0", "wild_+10_2")
  color: AnyColor
  value: CardValue
  image: string         // path relative to /cards/ (e.g. "Red/red_3.jpg")
}

// ── Player ───────────────────────────────────────────────────────

export interface Player {
  id: string
  name: string
  hand: Card[]
  connected: boolean
  lastSeen: number
  finishRank: number | null  // set when player empties hand: 1 (first to finish), 2, etc.
  eliminated: boolean        // true if removed via mercy rule (25+ cards)
}

// ── Game State ───────────────────────────────────────────────────

export type Phase = 'lobby' | 'playing' | 'ended'
export type Direction = 1 | -1

export interface GameState {
  code: string
  hostId: string
  players: Player[]
  deck: Card[]
  discard: Card[]
  turnIndex: number
  direction: Direction
  pendingDraw: number       // accumulated +N from stacking
  activeColor: Color | null // current active color (set by wilds or normal play)
  phase: Phase
  winner: string | null     // player id of winner
  lastAction: GameEvent | null

  // for wild color roulette — when set, current player must pick color then draw
  rouletteTargetColor: Color | null
  rouletteActive: boolean            // true = current player is in roulette, can't play cards

  // for 7's swap — waiting for player to pick target
  pendingSwapPlayerId: string | null

  // UNO tracking
  calledUno: Set<string>      // players who have called UNO this turn cycle
}

// ── Messages: Client → Server ────────────────────────────────────

export type ClientMessage =
  | { type: 'JOIN'; code: string; name: string; rejoinToken?: string }
  | { type: 'CREATE'; name: string }
  | { type: 'START_GAME' }
  | { type: 'PLAY'; cardId: string; chosenColor?: Color }
  | { type: 'PLAY_DISCARD_ALL' }  // plays discard-all card (discards matching color cards)
  | { type: 'DRAW' }
  | { type: 'CALL_UNO' }
  | { type: 'CHALLENGE_UNO'; targetId: string }
  | { type: 'SWAP_PICK'; targetId: string }  // after playing a 7
  | { type: 'ROULETTE_COLOR'; color: Color } // roulette target picks a color to draw until
  | { type: 'KICK_VOTE'; targetId: string }  // vote to kick an offline player
  | { type: 'EMOTE'; emote: string }  // send an emote (broadcast to all)

// ── Messages: Server → Client ────────────────────────────────────

export type ServerMessage =
  | { type: 'ROOM_CREATED'; code: string; playerId: string }
  | { type: 'JOINED'; playerId: string }
  | { type: 'STATE'; state: PublicGameState }
  | { type: 'YOUR_HAND'; hand: Card[] }
  | { type: 'EVENT'; event: GameEvent }
  | { type: 'ERROR'; message: string }
  | { type: 'PICK_SWAP_TARGET' }    // server asks player to pick a swap target (after 7)
  | { type: 'PICK_COLOR' }          // server asks player to pick color (after wild, client-side only now)
  | { type: 'PICK_ROULETTE_COLOR' } // server asks roulette target to pick a color
  | { type: 'ELIMINATED'; playerId: string; reason: string }

// ── Public Game State (sent to all, no hidden hands) ─────────────

export interface PublicPlayerInfo {
  id: string
  name: string
  cardCount: number
  connected: boolean
  isEliminated: boolean   // mercy rule (25+ cards) — show X
  finishRank: number | null  // 1, 2, 3... if they finished their hand. null if still playing or eliminated
}

export interface PublicGameState {
  code: string
  phase: Phase
  players: PublicPlayerInfo[]
  topDiscard: Card | null
  recentDiscard: Card[]       // last 5 discarded cards (top = last element)
  activeColor: Color | null
  turnIndex: number
  direction: Direction
  pendingDraw: number
  deckCount: number
  winner: string | null
  pendingSwapPlayerId: string | null
  unoCallable: string[]       // player IDs who have 1 card and haven't called UNO yet (challengeable)
  rouletteActive: boolean     // true = current player is in roulette phase
  kickVotes: Record<string, number>  // targetId -> number of votes received
  kickNeeded: Record<string, number> // targetId -> votes needed to kick
}

// ── Game Events (for animation / log) ────────────────────────────

export type GameEvent =
  | { event: 'card_played'; playerId: string; card: Card }
  | { event: 'cards_drawn'; playerId: string; count: number }
  | { event: 'turn_skipped'; playerId: string; card?: Card }
  | { event: 'direction_reversed' }
  | { event: 'color_chosen'; color: Color }
  | { event: 'uno_called'; playerId: string }
  | { event: 'uno_penalty'; playerId: string; cardsDrawn: number }
  | { event: 'hands_passed'; direction: Direction }
  | { event: 'hands_swapped'; playerId: string; targetId: string }
  | { event: 'discard_all'; playerId: string; color: Color; count: number }
  | { event: 'skip_everyone'; playerId: string; card?: Card }
  | { event: 'roulette'; targetId: string; chosenColor: Color; cardsDrawn: number }
  | { event: 'eliminated'; playerId: string }
  | { event: 'player_won'; playerId: string }
  | { event: 'emote'; playerId: string; emote: string }
