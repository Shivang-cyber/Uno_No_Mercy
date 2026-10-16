import { create } from 'zustand'
import type { PublicGameState, Card, Color, GameEvent, RevengeReason, Weapon } from '../shared/types'
import { connect, send, onMessage } from './lib/socket'
import type { AvatarConfig } from '../shared/avatar'

function loadMyAvatar(): AvatarConfig | null {
  try {
    const raw = localStorage.getItem('avatar')
    return raw ? JSON.parse(raw) as AvatarConfig : null
  } catch { return null }
}

interface Store {
  connected: boolean
  playerId: string | null
  playerName: string | null
  roomCode: string | null

  gameState: PublicGameState | null
  hand: Card[]
  events: GameEvent[]
  eventLog: { seq: number; event: GameEvent }[]
  avatars: Record<string, AvatarConfig>
  myAvatar: AvatarConfig | null
  setMyAvatar: (avatar: AvatarConfig) => void
  revengeOffer: { targetId: string; reason: RevengeReason; count?: number; expiresAt: number; ttlMs: number } | null
  takeRevenge: (weapon: Weapon) => void
  dismissRevenge: () => void
  slapstick: boolean
  toggleSlapstick: () => void

  showColorPicker: boolean
  showSwapPicker: boolean
  pendingWildCardId: string | null
  error: string | null

  createRoom: (name: string) => void
  joinRoom: (code: string, name: string) => void
  startGame: () => void
  playCard: (cardId: string, chosenColor?: Color) => void
  draw: () => void
  endTurn: () => void
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

let eventSeq = 0

export const useStore = create<Store>((set, get) => ({
  connected: false,
  playerId: null,
  playerName: null,
  roomCode: null,
  gameState: null,
  hand: [],
  events: [],
  eventLog: [],
  avatars: {},
  myAvatar: loadMyAvatar(),
  revengeOffer: null,
  slapstick: (() => { try { return localStorage.getItem('slapstick') !== 'off' } catch { return true } })(),
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
              send({ type: 'JOIN', code, name, rejoinToken: token, avatar: get().myAvatar ?? undefined })
            }
          }
          break

        case 'AVATARS':
          set({ avatars: msg.avatars })
          break

        case 'REVENGE_OFFER': {
          const offer = { targetId: msg.targetId, reason: msg.reason, count: msg.count, ttlMs: msg.ttlMs, expiresAt: Date.now() + msg.ttlMs }
          set({ revengeOffer: offer })
          setTimeout(() => { if (get().revengeOffer === offer) set({ revengeOffer: null }) }, msg.ttlMs)
          break
        }

        case 'YOUR_HAND':
          set({ hand: msg.hand })
          break

        case 'EVENT':
          set(s => ({
            events: [...s.events.slice(-50), msg.event],
            eventLog: [...s.eventLog.slice(-50), { seq: ++eventSeq, event: msg.event }],
          }))
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

        case 'ROOM_CLOSED':
          // Host left (or server closed the room) — clear session, back to lobby screen
          localStorage.removeItem('rejoinToken')
          localStorage.removeItem('roomCode')
          localStorage.removeItem('playerName')
          set({
            playerId: null, playerName: null, roomCode: null,
            gameState: null, hand: [], events: [], eventLog: [], revengeOffer: null,
            showColorPicker: false, showSwapPicker: false,
            pendingWildCardId: null,
            error: `Room closed: ${msg.reason}`,
          })
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
          send({ type: 'JOIN', code, name, rejoinToken: token, avatar: get().myAvatar ?? undefined })
          didAutoRejoin = true
        }
      }, 500)
    }
  },

  createRoom: (name) => {
    set({ playerName: name })
    localStorage.setItem('playerName', name)
    send({ type: 'CREATE', name, avatar: get().myAvatar ?? undefined })
  },

  joinRoom: (code, name) => {
    const upper = code.toUpperCase()
    set({ playerName: name, roomCode: upper })
    localStorage.setItem('playerName', name)
    localStorage.setItem('roomCode', upper)
    const rejoinToken = localStorage.getItem('rejoinToken') ?? undefined
    send({ type: 'JOIN', code: upper, name, rejoinToken, avatar: get().myAvatar ?? undefined })
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

  endTurn: () => {
    send({ type: 'END_TURN' })
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

  takeRevenge: (weapon) => {
    if (!get().revengeOffer) return
    set({ revengeOffer: null })
    send({ type: 'REVENGE', weapon })
  },

  dismissRevenge: () => set({ revengeOffer: null }),

  toggleSlapstick: () => {
    const next = !get().slapstick
    try { localStorage.setItem('slapstick', next ? 'on' : 'off') } catch { /* blocked storage */ }
    set({ slapstick: next })
  },

  setMyAvatar: (avatar) => {
    try { localStorage.setItem('avatar', JSON.stringify(avatar)) } catch { /* storage full or blocked */ }
    set({ myAvatar: avatar })
    if (get().playerId) send({ type: 'SET_AVATAR', avatar })
  },

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
      gameState: null, hand: [], events: [], eventLog: [], revengeOffer: null,
      showColorPicker: false, showSwapPicker: false,
      pendingWildCardId: null, error: null,
    })
    window.location.reload()
  },
}))
