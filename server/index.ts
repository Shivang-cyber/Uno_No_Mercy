import { WebSocketServer, WebSocket } from 'ws'
import { Room } from './Room.js'
import type { ClientMessage, ServerMessage } from '../shared/types.js'

const PORT = 3001
const MAX_ROOMS = 5

const rooms = new Map<string, Room>()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function findOrFail(code: string): Room | null {
  return rooms.get(code.toUpperCase()) ?? null
}

function cleanup() {
  for (const [code, room] of rooms) {
    if (room.isEmpty) {
      rooms.delete(code)
      console.log(`[room] cleaned up empty room ${code}`)
    }
  }
}

const wss = new WebSocketServer({ port: PORT })

console.log(`UNO No Mercy server running on ws://localhost:${PORT}`)

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: Room | null = null

  ws.on('message', (raw) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid JSON' } satisfies ServerMessage))
      return
    }

    switch (msg.type) {
      case 'CREATE': {
        if (rooms.size >= MAX_ROOMS) {
          ws.send(JSON.stringify({ type: 'ERROR', message: `Server full (max ${MAX_ROOMS} rooms)` } satisfies ServerMessage))
          return
        }
        let code = generateCode()
        while (rooms.has(code)) code = generateCode()

        const room = new Room(code)
        rooms.set(code, room)
        currentRoom = room

        const playerId = room.addPlayer(ws, msg.name)
        if (playerId) {
          ws.send(JSON.stringify({ type: 'ROOM_CREATED', code, playerId } satisfies ServerMessage))
          console.log(`[room] ${msg.name} created room ${code}`)
        }
        break
      }

      case 'JOIN': {
        const room = findOrFail(msg.code)
        if (!room) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' } satisfies ServerMessage))
          return
        }
        currentRoom = room
        const playerId = room.addPlayer(ws, msg.name, msg.rejoinToken)
        if (playerId) {
          console.log(`[room] ${msg.name} joined room ${msg.code}`)
        }
        break
      }

      default: {
        if (currentRoom) {
          currentRoom.handleMessage(ws, msg)
        } else {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Not in a room' } satisfies ServerMessage))
        }
      }
    }
  })

  ws.on('close', () => {
    if (currentRoom) {
      currentRoom.handleDisconnect(ws)
      // Cleanup empty rooms
      cleanup()
    }
  })
})

// Periodic cleanup
setInterval(cleanup, 60_000)
