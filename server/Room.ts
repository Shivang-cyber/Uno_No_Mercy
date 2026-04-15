import type { WebSocket } from 'ws'
import type {
  GameState, Player, ClientMessage, ServerMessage, Color, Card,
} from '../shared/types.js'
import { initGame, playCard, handleDraw, handleSwapPick, handleRoulette, getPublicState, callUno, challengeUno } from './engine.js'

const RECONNECT_TIMEOUT = 120_000 // 2 minutes auto-kick

interface Connection {
  ws: WebSocket
  playerId: string
}

export class Room {
  code: string
  connections: Connection[] = []
  state: GameState | null = null
  lobby: { id: string; name: string }[] = []
  disconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  kickVotes: Map<string, Set<string>> = new Map() // targetId -> set of voter playerIds

  constructor(code: string) {
    this.code = code
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  private broadcast(msg: ServerMessage) {
    for (const conn of this.connections) {
      this.send(conn.ws, msg)
    }
  }

  private sendToPlayer(playerId: string, msg: ServerMessage) {
    const conn = this.connections.find(c => c.playerId === playerId)
    if (conn) this.send(conn.ws, msg)
  }

  private broadcastState() {
    if (!this.state) return
    const pub = getPublicState(this.state)

    // Inject kick vote data
    const kickVotes: Record<string, number> = {}
    const kickNeeded: Record<string, number> = {}
    const connectedAlive = this.state.players.filter(p => p.connected && p.hand.length > 0)
    for (const [targetId, voters] of this.kickVotes) {
      kickVotes[targetId] = voters.size
      kickNeeded[targetId] = connectedAlive.filter(p => p.id !== targetId).length
    }
    // Also include offline players who haven't been voted on yet
    for (const p of this.state.players) {
      if (!p.connected && p.hand.length > 0 && !kickVotes[p.id]) {
        kickVotes[p.id] = 0
        kickNeeded[p.id] = connectedAlive.length
      }
    }
    pub.kickVotes = kickVotes
    pub.kickNeeded = kickNeeded

    this.broadcast({ type: 'STATE', state: pub })
    // Send each player their private hand
    for (const player of this.state.players) {
      this.sendToPlayer(player.id, { type: 'YOUR_HAND', hand: player.hand })
    }
  }

  addPlayer(ws: WebSocket, name: string, rejoinToken?: string): string | null {
    // Check for rejoin during active game
    if (rejoinToken && this.state) {
      const player = this.state.players.find(p => p.id === rejoinToken)
      if (player) {
        player.connected = true
        player.lastSeen = Date.now()
        this.connections = this.connections.filter(c => c.playerId !== rejoinToken)
        this.connections.push({ ws, playerId: rejoinToken })
        const timer = this.disconnectTimers.get(rejoinToken)
        if (timer) { clearTimeout(timer); this.disconnectTimers.delete(rejoinToken) }
        this.kickVotes.delete(rejoinToken)
        this.broadcastState()
        return rejoinToken
      }
    }

    // Check for rejoin during lobby — replace existing entry instead of adding duplicate
    if (rejoinToken && !this.state) {
      const existingIdx = this.lobby.findIndex(p => p.id === rejoinToken)
      if (existingIdx !== -1) {
        // Update name, replace connection
        this.lobby[existingIdx].name = name
        this.connections = this.connections.filter(c => c.playerId !== rejoinToken)
        this.connections.push({ ws, playerId: rejoinToken })
        this.send(ws, { type: 'JOINED', playerId: rejoinToken })
        this.broadcastLobby()
        return rejoinToken
      }
    }

    // New player
    if (this.state && this.state.phase === 'playing') {
      this.send(ws, { type: 'ERROR', message: 'Game already in progress' })
      return null
    }
    if (this.lobby.length >= 10) {
      this.send(ws, { type: 'ERROR', message: 'Room is full (max 10)' })
      return null
    }

    const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    this.lobby.push({ id: playerId, name })
    this.connections.push({ ws, playerId })
    this.send(ws, { type: 'JOINED', playerId })

    // Broadcast lobby state
    this.broadcastLobby()
    return playerId
  }

  private broadcastLobby() {
    // Send a simple state for lobby phase
    const msg: ServerMessage = {
      type: 'STATE',
      state: {
        code: this.code,
        phase: 'lobby',
        players: this.lobby.map(p => ({
          id: p.id,
          name: p.name,
          cardCount: 0,
          connected: true,
          isEliminated: false,
          finishRank: null,
        })),
        topDiscard: null,
        recentDiscard: [],
        activeColor: null,
        turnIndex: 0,
        direction: 1,
        pendingDraw: 0,
        deckCount: 0,
        winner: null,
        pendingSwapPlayerId: null,
        unoCallable: [],
        rouletteActive: false,
        kickVotes: {},
        kickNeeded: {},
      },
    }
    this.broadcast(msg)
  }

  startGame(playerId: string): boolean {
    if (this.lobby.length < 2) return false
    if (this.lobby[0].id !== playerId) return false // only host can start

    this.state = initGame(this.code, this.lobby)
    this.broadcastState()
    return true
  }

  handleMessage(ws: WebSocket, msg: ClientMessage) {
    const conn = this.connections.find(c => c.ws === ws)
    if (!conn) return

    switch (msg.type) {
      case 'START_GAME': {
        if (!this.startGame(conn.playerId)) {
          this.send(ws, { type: 'ERROR', message: 'Cannot start game (need 2+ players, only host can start)' })
        }
        break
      }

      case 'PLAY': {
        if (!this.state) return
        const result = playCard(this.state, conn.playerId, msg.cardId, msg.chosenColor)
        if (!result.ok) {
          this.send(ws, { type: 'ERROR', message: 'Invalid play' })
          return
        }
        for (const evt of result.events) {
          this.broadcast({ type: 'EVENT', event: evt })
        }
        if (result.needsColorPick) {
          this.send(ws, { type: 'PICK_COLOR' })
        }
        if (result.needsSwapPick) {
          this.send(ws, { type: 'PICK_SWAP_TARGET' })
        }
        for (const evt of result.events) {
          if (evt.event === 'eliminated') {
            this.sendToPlayer(evt.playerId, { type: 'ELIMINATED', playerId: evt.playerId, reason: 'Mercy rule: 25+ cards' })
          }
        }
        this.broadcastState()
        break
      }

      case 'DRAW': {
        if (!this.state) return
        const { events, drawnCards } = handleDraw(this.state, conn.playerId)
        for (const evt of events) {
          this.broadcast({ type: 'EVENT', event: evt })
        }
        this.broadcastState()
        break
      }

      case 'SWAP_PICK': {
        if (!this.state) return
        const { ok, events } = handleSwapPick(this.state, conn.playerId, msg.targetId)
        if (!ok) {
          this.send(ws, { type: 'ERROR', message: 'Invalid swap target' })
          return
        }
        for (const evt of events) {
          this.broadcast({ type: 'EVENT', event: evt })
        }
        this.broadcastState()
        break
      }

      case 'CALL_UNO': {
        if (!this.state) return
        const { ok, events } = callUno(this.state, conn.playerId)
        if (ok) {
          for (const evt of events) this.broadcast({ type: 'EVENT', event: evt })
          this.broadcastState()
        }
        break
      }

      case 'CHALLENGE_UNO': {
        if (!this.state) return
        const { ok: cOk, events: cEvents } = challengeUno(this.state, conn.playerId, msg.targetId)
        if (cOk) {
          for (const evt of cEvents) this.broadcast({ type: 'EVENT', event: evt })
          this.broadcastState()
        }
        break
      }

      case 'EMOTE': {
        // Broadcast emote to everyone — works in lobby AND game
        this.broadcast({ type: 'EVENT', event: { event: 'emote', playerId: conn.playerId, emote: msg.emote } })
        break
      }

      case 'KICK_VOTE': {
        if (!this.state) return
        const target = this.state.players.find(p => p.id === msg.targetId)
        if (!target || target.connected) return // can only kick offline players

        if (!this.kickVotes.has(msg.targetId)) this.kickVotes.set(msg.targetId, new Set())
        this.kickVotes.get(msg.targetId)!.add(conn.playerId)

        // Check if all connected players (except target) have voted
        const connectedOthers = this.state.players.filter(p => p.connected && p.id !== msg.targetId && p.hand.length > 0)
        const votes = this.kickVotes.get(msg.targetId)!.size
        if (votes >= connectedOthers.length) {
          this.removePlayer(msg.targetId)
          this.kickVotes.delete(msg.targetId)
        } else {
          this.broadcastState()
        }
        break
      }
    }
  }

  private removePlayer(playerId: string) {
    if (!this.state) return
    const p = this.state.players.find(pp => pp.id === playerId)
    if (!p || p.hand.length === 0) return

    // Shuffle hand back into deck — treat as eliminated (kicked, mercy-style)
    this.state.deck.push(...p.hand)
    p.hand = []
    p.eliminated = true

    // If it was their turn, advance
    const pIdx = this.state.players.indexOf(p)
    if (this.state.turnIndex === pIdx) {
      const n = this.state.players.length
      let nextIdx = this.state.turnIndex
      for (let i = 0; i < n; i++) {
        nextIdx = ((nextIdx + this.state.direction) % n + n) % n
        if (this.state.players[nextIdx].hand.length > 0) break
      }
      this.state.turnIndex = nextIdx
    }

    this.broadcast({ type: 'EVENT', event: { event: 'eliminated', playerId } })
    this.broadcastState()

    // Check if only 1 player left
    const alive = this.state.players.filter(pp => pp.hand.length > 0)
    if (alive.length <= 1 && alive[0]) {
      this.state.winner = alive[0].id
      this.state.phase = 'ended'
      this.broadcast({ type: 'EVENT', event: { event: 'player_won', playerId: alive[0].id } })
      this.broadcastState()
    }

    // Clear disconnect timer if any
    const timer = this.disconnectTimers.get(playerId)
    if (timer) { clearTimeout(timer); this.disconnectTimers.delete(playerId) }
    this.kickVotes.delete(playerId)
  }

  handleDisconnect(ws: WebSocket) {
    const conn = this.connections.find(c => c.ws === ws)
    if (!conn) return

    this.connections = this.connections.filter(c => c.ws !== ws)

    if (this.state) {
      const player = this.state.players.find(p => p.id === conn.playerId)
      if (player) {
        player.connected = false
        player.lastSeen = Date.now()
        this.broadcastState()

        // Auto-kick after 2 minutes if still offline
        const timer = setTimeout(() => {
          if (!this.state) return
          const p = this.state.players.find(pp => pp.id === conn.playerId)
          if (p && !p.connected) {
            this.removePlayer(conn.playerId)
          }
        }, RECONNECT_TIMEOUT)
        this.disconnectTimers.set(conn.playerId, timer)
      }
    } else {
      // In lobby — just remove
      this.lobby = this.lobby.filter(p => p.id !== conn.playerId)
      this.broadcastLobby()
    }
  }

  get isEmpty(): boolean {
    return this.connections.length === 0
  }
}
