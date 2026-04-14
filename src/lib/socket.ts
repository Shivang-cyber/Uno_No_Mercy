import type { ClientMessage, ServerMessage } from '../../shared/types'

type MessageHandler = (msg: ServerMessage) => void

let ws: WebSocket | null = null
let handlers: MessageHandler[] = []
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.hostname}:3001`
}

export function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) return

  ws = new WebSocket(getWsUrl())

  ws.onopen = () => {
    console.log('[ws] connected')
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  ws.onmessage = (e) => {
    try {
      const msg: ServerMessage = JSON.parse(e.data)
      for (const h of handlers) h(msg)
    } catch (err) {
      console.error('[ws] parse error', err)
    }
  }

  ws.onclose = () => {
    console.log('[ws] disconnected, retrying in 2s...')
    reconnectTimer = setTimeout(connect, 2000)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

export function send(msg: ClientMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

export function onMessage(handler: MessageHandler) {
  handlers.push(handler)
  return () => {
    handlers = handlers.filter(h => h !== handler)
  }
}

export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  ws?.close()
  ws = null
}
