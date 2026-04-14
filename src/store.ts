import { create } from 'zustand'
import type { PublicGameState, Card, Color, GameEvent } from '../shared/types'
import { connect, send, onMessage } from './lib/socket'

interface Store {
  connected: boolean
  playerId: string | null
  playerName: string | null
  roomCode: string | null

  gameState: PublicGameState | null
  hand: Card[]
  events: GameEvent[]

  showColorPicker: boolean
  showSwapPicker: boolean
  showRouletteColorPicker: boolean  // separate from wild color pick
  pendingWildCardId: string | null
  error: string | null

  createRoom: (name: string) => void
  joinRoom: (code: string, name: string) => void
  startGame: () => void
  playCard: (cardId: string, chosenColor?: Color) => void
  draw: () => void
  callUno: () => void
  challengeUno: (targetId: string) => void
  pickSwapTarget: (targetId: string) => void
  pickColor: (color: Color) => void
  pickRouletteColor: (color: Color) => void
  clearError: () => void
  init: () => void
}

export const useStore = create<Store>((set, get) => ({
  connected: false,
  playerId: null,
  playerName: null,
  roomCode: null,
  gameState: null,
  hand: [],
  events: [],
  showColorPicker: false,
  showSwapPicker: false,
  showRouletteColorPicker: false,
  pendingWildCardId: null,
  error: null,

  init: () => {
    connect()
    onMessage((msg) => {
      switch (msg.type) {
        case 'ROOM_CREATED':
          localStorage.setItem('rejoinToken', msg.playerId)
          localStorage.setItem('roomCode', get().roomCode ?? '')
          set({ playerId: msg.playerId, roomCode: msg.code ?? get().roomCode })
          break
        case 'JOINED':
          localStorage.setItem('rejoinToken', msg.playerId)
          set({ playerId: msg.playerId })
          break
        case 'STATE':
          set({ gameState: msg.state, connected: true })
          break
        case 'YOUR_HAND':
          set({ hand: msg.hand })
          break
        case 'EVENT':
          set(s => ({ events: [...s.events.slice(-50), msg.event] }))
          break
        case 'ERROR':
          set({ error: msg.message })
          setTimeout(() => set({ error: null }), 4000)
          break
        case 'PICK_COLOR':
          // Only used if somehow server asks (shouldn't happen with client-side pick)
          set({ showColorPicker: true })
          break
        case 'PICK_ROULETTE_COLOR':
          // Roulette target must pick a color to draw until
          set({ showRouletteColorPicker: true })
          break
        case 'PICK_SWAP_TARGET':
          set({ showSwapPicker: true })
          break
        case 'ELIMINATED':
          set({ error: `Player eliminated: ${msg.reason}` })
          break
      }
    })
  },

  createRoom: (name) => {
    set({ playerName: name })
    send({ type: 'CREATE', name })
  },

  joinRoom: (code, name) => {
    set({ playerName: name, roomCode: code.toUpperCase() })
    const rejoinToken = localStorage.getItem('rejoinToken') ?? undefined
    send({ type: 'JOIN', code: code.toUpperCase(), name, rejoinToken })
  },

  startGame: () => {
    send({ type: 'START_GAME' })
  },

  playCard: (cardId, chosenColor) => {
    const card = get().hand.find(c => c.id === cardId)
    if (card?.color === 'wild' && !chosenColor) {
      set({ pendingWildCardId: cardId, showColorPicker: true })
      return
    }
    send({ type: 'PLAY', cardId, chosenColor })
  },

  draw: () => {
    send({ type: 'DRAW' })
  },

  callUno: () => {
    send({ type: 'CALL_UNO' })
  },

  challengeUno: (targetId) => {
    send({ type: 'CHALLENGE_UNO', targetId })
  },

  pickSwapTarget: (targetId) => {
    set({ showSwapPicker: false })
    send({ type: 'SWAP_PICK', targetId })
  },

  pickColor: (color) => {
    const pendingId = get().pendingWildCardId
    set({ showColorPicker: false, pendingWildCardId: null })
    if (pendingId) {
      send({ type: 'PLAY', cardId: pendingId, chosenColor: color })
    }
  },

  pickRouletteColor: (color) => {
    set({ showRouletteColorPicker: false })
    send({ type: 'ROULETTE_COLOR', color })
  },

  clearError: () => set({ error: null }),
}))
