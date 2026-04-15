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
  clearError: () => void
  kickVote: (targetId: string) => void
  sendEmote: (emote: string) => void
  logout: () => void
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
  pendingWildCardId: null,
  error: null,

  init: () => {
    connect()

    let didAutoRejoin = false

    onMessage((msg) => {
      switch (msg.type) {
        case 'ROOM_CREATED':
          localStorage.setItem('rejoinToken', msg.playerId)
          localStorage.setItem('roomCode', msg.code)
          localStorage.setItem('playerName', get().playerName ?? '')
          set({ playerId: msg.playerId, roomCode: msg.code })
          break

        case 'JOINED':
          localStorage.setItem('rejoinToken', msg.playerId)
          set({ playerId: msg.playerId })
          break

        case 'STATE':
          set({ gameState: msg.state, connected: true })
          // Auto-rejoin: once connected and we have stored session, try to rejoin
          if (!didAutoRejoin) {
            didAutoRejoin = true
            const token = localStorage.getItem('rejoinToken')
            const code = localStorage.getItem('roomCode')
            const name = localStorage.getItem('playerName')
            if (token && code && name && !get().playerId) {
              set({ playerName: name, roomCode: code })
              send({ type: 'JOIN', code, name, rejoinToken: token })
            }
          }
          break

        case 'YOUR_HAND':
          set({ hand: msg.hand })
          break

        case 'EVENT':
          set(s => ({ events: [...s.events.slice(-50), msg.event] }))
          break

        case 'ERROR':
          set({ error: msg.message })
          // If room not found, clear stale session
          if (msg.message.includes('not found')) {
            localStorage.removeItem('rejoinToken')
            localStorage.removeItem('roomCode')
            localStorage.removeItem('playerName')
            set({ playerId: null, roomCode: null, gameState: null })
          }
          setTimeout(() => set({ error: null }), 4000)
          break

        case 'PICK_COLOR':
          set({ showColorPicker: true })
          break

        case 'PICK_ROULETTE_COLOR':
          set({ showColorPicker: true }) // reuse same picker
          break

        case 'PICK_SWAP_TARGET':
          set({ showSwapPicker: true })
          break

        case 'ELIMINATED':
          set({ error: `Player eliminated: ${msg.reason}` })
          break
      }
    })

    // Try auto-rejoin immediately after socket opens
    // The socket's onopen fires before messages, so we send JOIN proactively
    const token = localStorage.getItem('rejoinToken')
    const code = localStorage.getItem('roomCode')
    const name = localStorage.getItem('playerName')
    if (token && code && name) {
      set({ playerName: name, roomCode: code })
      // Small delay to ensure socket is connected
      setTimeout(() => {
        if (!get().playerId) {
          send({ type: 'JOIN', code, name, rejoinToken: token })
          didAutoRejoin = true
        }
      }, 500)
    }
  },

  createRoom: (name) => {
    set({ playerName: name })
    localStorage.setItem('playerName', name)
    send({ type: 'CREATE', name })
  },

  joinRoom: (code, name) => {
    const upper = code.toUpperCase()
    set({ playerName: name, roomCode: upper })
    localStorage.setItem('playerName', name)
    localStorage.setItem('roomCode', upper)
    const rejoinToken = localStorage.getItem('rejoinToken') ?? undefined
    send({ type: 'JOIN', code: upper, name, rejoinToken })
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

  clearError: () => set({ error: null }),

  kickVote: (targetId) => {
    send({ type: 'KICK_VOTE', targetId })
  },

  sendEmote: (emote) => {
    send({ type: 'EMOTE', emote })
  },

  logout: () => {
    localStorage.removeItem('rejoinToken')
    localStorage.removeItem('roomCode')
    localStorage.removeItem('playerName')
    set({
      playerId: null, playerName: null, roomCode: null,
      gameState: null, hand: [], events: [],
      showColorPicker: false, showSwapPicker: false,
      pendingWildCardId: null, error: null,
    })
    window.location.reload()
  },
}))
