import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import type { Color, Card as CardType } from '../../shared/types'
import Card from './Card'
import Hand from './Hand'
import ColorPicker from './ColorPicker'
import RulesModal, { RulesButton } from './RulesModal'
import EmotePicker, { FloatingEmote } from './EmotePicker'

// ── Direction arrow ──────────────────────────────────────────────

function DirectionArrow({ direction, size = 200 }: { direction: 1 | -1; size?: number }) {
  const r = size * 0.42
  const cx = size / 2
  const cy = size / 2
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const startDeg = 100
  const endDeg = 170
  const sx = cx + r * Math.cos(toRad(startDeg))
  const sy = cy + r * Math.sin(toRad(startDeg))
  const ex = cx + r * Math.cos(toRad(endDeg))
  const ey = cy + r * Math.sin(toRad(endDeg))

  const tangent = toRad(endDeg) + Math.PI / 2
  const aLen = 9
  const ax1 = ex + aLen * Math.cos(tangent - 0.5)
  const ay1 = ey + aLen * Math.sin(tangent - 0.5)
  const ax2 = ex + aLen * Math.cos(tangent + 0.5)
  const ay2 = ey + aLen * Math.sin(tangent + 0.5)

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`w-full h-full transition-transform duration-700 ease-in-out ${
        direction === -1 ? 'scale-x-[-1]' : ''
      }`}
    >
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 3"
      />
      <polygon
        points={`${ex},${ey} ${ax1},${ay1} ${ax2},${ay2}`}
        fill="rgba(255,255,255,0.22)"
      />
    </svg>
  )
}

// ── Stacked discard pile (fans out on hover) ─────────────────────

function DiscardPile({ cards, activeColor }: { cards: CardType[]; activeColor: Color | null }) {
  const [hovered, setHovered] = useState(false)
  const show = cards.slice(-5)
  if (show.length === 0) return <div className="w-18 h-28 sm:w-22 sm:h-34 rounded-lg border-2 border-dashed border-gray-600" />

  return (
    <div
      className="relative w-32 h-32 sm:w-36 sm:h-40 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {show.map((card, i) => {
        const baseX = (i - (show.length - 1)) * 8
        const baseRot = (i - (show.length - 1)) * 5
        // On hover: fan out wider
        const hoverX = (i - (show.length - 1)) * 28
        const hoverRot = (i - (show.length - 1)) * 12
        const xOff = hovered ? hoverX : baseX
        const rotate = hovered ? hoverRot : baseRot
        return (
          <div
            key={card.id}
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: `calc(50% + ${xOff}px)`,
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${rotate}deg) ${hovered ? 'scale(1.05)' : ''}`,
              zIndex: i,
            }}
          >
            <Card card={card} disabled />
          </div>
        )
      })}
      {activeColor && show.length > 0 && show[show.length - 1].color === 'wild' && (
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${
            activeColor === 'red' ? 'bg-uno-red' :
            activeColor === 'yellow' ? 'bg-uno-yellow text-black' :
            activeColor === 'green' ? 'bg-uno-green' : 'bg-uno-blue'
          }`}
        >
          {activeColor.toUpperCase()}
        </div>
      )}
    </div>
  )
}

// ── Single flying card from draw pile to target position ─────────

function FlyingCard({
  startLeft = 50, startTop = 50, targetLeft, targetTop, delay, duration = 700, onDone,
}: {
  startLeft?: number
  startTop?: number
  targetLeft: number
  targetTop: number
  delay: number
  duration?: number
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'start' | 'flying' | 'done'>('start')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('flying'), delay)
    const t2 = setTimeout(() => { setPhase('done'); onDone() }, delay + duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [delay, duration, onDone])

  if (phase === 'done') return null

  const left = phase === 'start' ? startLeft : targetLeft
  const top = phase === 'start' ? startTop : targetTop
  const opacity = phase === 'start' ? 0 : 1

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        opacity,
        transition: `left ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), top ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s`,
      }}
    >
      <img src="/cards/Back/back.png" alt="" className="w-12 h-18 sm:w-14 sm:h-20 rounded-lg shadow-2xl" />
    </div>
  )
}

// ── Big "+N drawn" toast (only for forced draws of 2+) ───────────

function DrawToast({ count, name, onDone }: { count: number; name: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="glass rounded-2xl px-6 py-3 animate-fade-in">
        <div className="font-display text-3xl font-black text-center bg-gradient-to-r from-sunset-300 to-sunset-500 bg-clip-text text-transparent">+{count}</div>
        <div className="text-xs text-lotus-200/70 text-center mt-1 tracking-wider">{name} draws</div>
      </div>
    </div>
  )
}

// ── Pass / Swap animations ───────────────────────────────────────

function PassAnimation({ direction, onDone }: { direction: 1 | -1; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="glass rounded-2xl px-8 py-5 flex flex-col items-center animate-fade-in">
        <div className={`text-5xl mb-2 text-lotus-300 ${direction === 1 ? '' : 'scale-x-[-1]'}`}>&#x21BB;</div>
        <div className="font-display text-lg font-bold text-sunset-300">Hands passed {direction === 1 ? 'clockwise' : 'counter-clockwise'}</div>
      </div>
    </div>
  )
}

function SwapAnimation({ p1, p2, onDone }: { p1: string; p2: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="glass rounded-2xl px-8 py-5 flex flex-col items-center animate-fade-in">
        <div className="text-5xl mb-2 text-lotus-300">&#x21C4;</div>
        <div className="font-display text-lg font-bold text-lotus-200">{p1} swapped hands with {p2}</div>
      </div>
    </div>
  )
}

// ── Skipped overlay (semi-transparent skip card on the skipped player) ──

function SkippedOverlay({ left, top, cardImage, onDone }: {
  left: number; top: number; cardImage: string; onDone: () => void
}) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 1500)
    const t3 = setTimeout(onDone, 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-500 ease-out
        ${phase === 'enter' ? 'scale-75 opacity-0' : ''}
        ${phase === 'show' ? 'scale-100 opacity-70' : ''}
        ${phase === 'exit' ? 'scale-110 opacity-0' : ''}
      `}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <img
        src={`/cards/${cardImage}`}
        alt="skipped"
        className="w-16 h-24 sm:w-20 sm:h-28 rounded-lg shadow-2xl border-2 border-white/80"
      />
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────

function toOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Player bubble ────────────────────────────────────────────────

function PlayerBubble({
  name, cardCount, isCurrentTurn, isSelf, connected, isEliminated, finishRank,
  isCallable, onChallenge, showSwapButton, onSwapPick,
  onKick, kickInfo,
}: {
  name: string; cardCount: number; isCurrentTurn: boolean; isSelf: boolean
  connected: boolean; isEliminated: boolean; finishRank: number | null; isCallable: boolean
  onChallenge?: () => void; showSwapButton?: boolean; onSwapPick?: () => void
  onKick?: () => void; kickInfo?: { votes: number; needed: number }
}) {
  const finished = finishRank !== null
  const rankLabel = finishRank ? toOrdinal(finishRank) : null
  const rankBg = finishRank === 1 ? 'bg-gradient-to-br from-sunset-300 to-sunset-500'
    : finishRank === 2 ? 'bg-gradient-to-br from-lotus-300 to-lotus-500'
    : finishRank === 3 ? 'bg-gradient-to-br from-sunset-400 to-sunset-500'
    : 'bg-gradient-to-br from-mint-400 to-mint-500'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
          font-display text-lg sm:text-xl font-black transition-all duration-300
          ${isCurrentTurn && !finished && !isEliminated ? 'bg-warm-gradient scale-110 glow-warm' : ''}
          ${finished ? `${rankBg} ring-2 ring-white/40 shadow-lg` : ''}
          ${!finished && !isCurrentTurn && !isEliminated ? 'bg-ink-600/80 border border-white/10' : ''}
          ${!connected && !finished ? 'opacity-40' : ''}
          ${isEliminated ? 'opacity-30 bg-sunset-500/30 border border-sunset-400/30' : ''}
          ${isSelf ? 'ring-2 ring-mint-400' : ''}
          ${cardCount === 1 && !isEliminated && !finished ? 'text-sunset-300 animate-soft-pulse' : 'text-white'}
        `}
      >
        {isEliminated ? 'X' : finished ? rankLabel : cardCount}
      </div>
      <span className={`text-[10px] sm:text-xs font-semibold truncate max-w-[60px] ${isSelf ? 'text-mint-400' : 'text-lotus-200/80'}`}>
        {name}
      </span>
      {cardCount === 1 && !isEliminated && <span className="text-[9px] font-display font-black text-sunset-400 tracking-widest">UNO!</span>}
      {!connected && <span className="text-[9px] text-sunset-300/80">offline</span>}
      {isCallable && onChallenge && (
        <button type="button" onClick={onChallenge}
          className="px-2 py-0.5 bg-red-600 hover:bg-red-500 rounded text-[9px] font-black animate-pulse">
          CATCH!
        </button>
      )}
      {showSwapButton && onSwapPick && (
        <button type="button" onClick={onSwapPick}
          className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded text-[9px] font-bold">
          Swap
        </button>
      )}
      {!connected && !isEliminated && onKick && kickInfo && (
        <button type="button" onClick={onKick}
          className="mt-0.5 px-2 py-0.5 bg-orange-700 hover:bg-orange-600 rounded text-[9px] font-bold">
          Kick ({kickInfo.votes}/{kickInfo.needed})
        </button>
      )}
    </div>
  )
}

// ── Scoreboard sidebar ───────────────────────────────────────────

function Scoreboard({ players, scores, onLogout }: {
  players: { id: string; name: string; cardCount: number; isEliminated: boolean }[]
  scores: Record<string, number>
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`fixed left-0 top-12 z-20 transition-all duration-300 ${open ? 'w-64' : 'w-8'}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="glass rounded-r-2xl cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {!open && (
          <div className="py-3 px-1 text-[10px] font-display font-black text-lotus-300/70 tracking-[0.3em]"
            style={{ writingMode: 'vertical-rl' }}>
            SCORE
          </div>
        )}
        {open && (
          <div className="p-4">
            <h3 className="font-display font-black text-sm mb-3 text-lotus-200 tracking-wide">Scoreboard</h3>
            <div className="space-y-1.5 mb-3">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between text-xs ${p.isEliminated ? 'text-sunset-400/70 line-through' : 'text-lotus-100'}`}>
                  <span className="truncate max-w-[120px]">{p.name}</span>
                  <span className="font-display font-black text-lotus-300">{scores[p.id] ?? 0}</span>
                </div>
              ))}
            </div>
            <hr className="border-white/10 mb-2" />
            <h4 className="font-display font-bold text-[10px] text-lotus-300/70 tracking-widest mb-1">SCORING</h4>
            <div className="text-[10px] text-lotus-300/60 space-y-0.5">
              <div>0–9: Face value</div>
              <div>Skip, Reverse, +2, +4, Discard, Skip All: <b className="text-lotus-200">20</b></div>
              <div>Wild +4/+6/+10, Roulette: <b className="text-lotus-200">50</b></div>
              <div>Knockout bonus: <b className="text-lotus-200">250</b></div>
              <div className="mt-1 text-sunset-300/80">First to <b>1000</b> wins!</div>
            </div>
            <hr className="border-white/10 my-3" />
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 bg-sunset-500/15 hover:bg-sunset-500/30 border border-sunset-500/30 rounded-lg text-xs font-display font-bold text-sunset-200 transition-all"
            >
              Leave Game
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Table ───────────────────────────────────────────────────

export default function Table() {
  const {
    gameState, hand, playerId, playCard, draw, callUno, challengeUno,
    pickSwapTarget, pickColor, kickVote, sendEmote, logout,
    showColorPicker, showSwapPicker, startGame, error,
  } = useStore()

  const [drawToast, setDrawToast] = useState<{ count: number; name: string } | null>(null)
  const [skippedBubbles, setSkippedBubbles] = useState<{ id: number; left: number; top: number; cardImage: string }[]>([])
  const [flyingCards, setFlyingCards] = useState<{
    id: number
    startLeft?: number
    startTop?: number
    targetLeft: number
    targetTop: number
    delay: number
    duration?: number
  }[]>([])
  const [passAnim, setPassAnim] = useState<{ direction: 1 | -1 } | null>(null)
  const [swapAnim, setSwapAnim] = useState<{ p1: string; p2: string } | null>(null)
  const [scores] = useState<Record<string, number>>({})
  const [showEmotePicker, setShowEmotePicker] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [activeEmotes, setActiveEmotes] = useState<{ id: number; emote: string; fromAngle: number; toAngle: number }[]>([])
  const events = useStore(s => s.events)

  useEffect(() => {
    if (events.length === 0 || !gameState) return
    const last = events[events.length - 1]
    if (last.event === 'cards_drawn') {
      // Flying card animation from draw pile to recipient
      const recipientIdx = gameState.players.findIndex(p => p.id === last.playerId)
      if (recipientIdx === -1) return
      const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
      const totalPlayers = gameState.players.length

      // Compute target position (relative to circle container)
      // - Me: cards fly DOWN past the circle into my hand area (~130%)
      // - Others: cards fly to their bubble on the circle line (r=46)
      let targetLeft = 50, targetTop = 130
      if (recipientIdx !== myIdxLocal) {
        const offset = (recipientIdx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        const angle = 270 + slotDeg * offset
        const rad = (angle * Math.PI) / 180
        const r = 46
        targetLeft = 50 + r * Math.cos(rad)
        targetTop = 50 - r * Math.sin(rad)
      }

      // Spawn N flying cards. Stagger the START but keep DURATION constant
      // so each card travels at the same speed.
      const total = Math.min(last.count, 12)
      const stagger = total > 1 ? 80 : 0  // ms between launches
      const newCards = Array.from({ length: total }, (_, i) => ({
        id: Date.now() + i + Math.random(),
        targetLeft,
        targetTop,
        delay: i * stagger,
        duration: 700, // consistent flight time per card
      }))
      setFlyingCards(prev => [...prev, ...newCards])

      // Show "+N" toast for forced draws (2+)
      if (last.count > 1) {
        const name = gameState.players[recipientIdx]?.name ?? '?'
        setDrawToast({ count: last.count, name })
      }
    } else if (last.event === 'hands_passed') {
      setPassAnim({ direction: last.direction })

      // Card-fly animation: each player's "card" travels to the next player in direction
      const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
      const totalPlayers = gameState.players.length
      const dir = last.direction
      const positionFor = (idx: number): { left: number; top: number } => {
        if (idx === myIdxLocal) return { left: 50, top: 130 } // me = below circle (hand)
        const offset = (idx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        const angle = 270 + slotDeg * offset
        const rad = (angle * Math.PI) / 180
        const r = 46
        return { left: 50 + r * Math.cos(rad), top: 50 - r * Math.sin(rad) }
      }
      const newCards = gameState.players
        .filter(p => p.cardCount > 0)
        .map((p, i) => {
          const fromIdx = gameState.players.findIndex(pp => pp.id === p.id)
          const toIdx = ((fromIdx + dir) % totalPlayers + totalPlayers) % totalPlayers
          const from = positionFor(fromIdx)
          const to = positionFor(toIdx)
          return {
            id: Date.now() + i + Math.random(),
            startLeft: from.left,
            startTop: from.top,
            targetLeft: to.left,
            targetTop: to.top,
            delay: 0,
            duration: 1200,
          }
        })
      setFlyingCards(prev => [...prev, ...newCards])
    } else if (last.event === 'hands_swapped') {
      const players = gameState?.players ?? []
      const p1Name = players.find(p => p.id === last.playerId)?.name ?? '?'
      const p2Name = players.find(p => p.id === last.targetId)?.name ?? '?'
      setSwapAnim({ p1: p1Name, p2: p2Name })

      // Card-fly: cards swap between the two players (cross paths)
      const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
      const totalPlayers = gameState.players.length
      const positionFor = (idx: number): { left: number; top: number } => {
        if (idx === myIdxLocal) return { left: 50, top: 130 }
        const offset = (idx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        const angle = 270 + slotDeg * offset
        const rad = (angle * Math.PI) / 180
        const r = 46
        return { left: 50 + r * Math.cos(rad), top: 50 - r * Math.sin(rad) }
      }
      const aIdx = gameState.players.findIndex(p => p.id === last.playerId)
      const bIdx = gameState.players.findIndex(p => p.id === last.targetId)
      if (aIdx !== -1 && bIdx !== -1) {
        const a = positionFor(aIdx)
        const b = positionFor(bIdx)
        const baseId = Date.now() + Math.random()
        setFlyingCards(prev => [
          ...prev,
          { id: baseId, startLeft: a.left, startTop: a.top, targetLeft: b.left, targetTop: b.top, delay: 0, duration: 1200 },
          { id: baseId + 1, startLeft: b.left, startTop: b.top, targetLeft: a.left, targetTop: a.top, delay: 0, duration: 1200 },
        ])
      }
    } else if (last.event === 'turn_skipped' && gameState && last.card) {
      const skippedIdx = gameState.players.findIndex(p => p.id === last.playerId)
      if (skippedIdx !== -1) {
        const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
        const totalPlayers = gameState.players.length
        // Every player (including self) is positioned on the circle line
        const offset = (skippedIdx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        const angle = 270 + slotDeg * offset
        const rad = (angle * Math.PI) / 180
        const r = 46
        const left = 50 + r * Math.cos(rad)
        const top = 50 - r * Math.sin(rad)
        setSkippedBubbles(prev => [...prev, { id: Date.now() + Math.random(), left, top, cardImage: last.card!.image }])
      }
    } else if (last.event === 'skip_everyone' && gameState && last.card) {
      const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
      const totalPlayers = gameState.players.length
      const cardImage = last.card.image
      const newBubbles: { id: number; left: number; top: number; cardImage: string }[] = []
      gameState.players.forEach((p, idx) => {
        if (p.id === last.playerId) return
        if (p.cardCount === 0 || p.isEliminated) return
        const offset = (idx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        const angle = 270 + slotDeg * offset
        const rad = (angle * Math.PI) / 180
        const r = 46
        const left = 50 + r * Math.cos(rad)
        const top = 50 - r * Math.sin(rad)
        newBubbles.push({ id: Date.now() + idx + Math.random(), left, top, cardImage })
      })
      setSkippedBubbles(prev => [...prev, ...newBubbles])
    } else if (last.event === 'emote' && gameState) {
      // Compute angles for sender and next-player target on the circle
      const senderIdx = gameState.players.findIndex(p => p.id === last.playerId)
      if (senderIdx === -1) return
      const myIdxLocal = gameState.players.findIndex(p => p.id === playerId)
      const totalPlayers = gameState.players.length

      // Same angle math as player layout — relative to viewer
      function angleFor(idx: number): number {
        if (idx === myIdxLocal) return 270
        // offset from me, in turn direction
        const offset = (idx - myIdxLocal + totalPlayers) % totalPlayers
        const slotDeg = 360 / totalPlayers
        return 270 + slotDeg * offset
      }
      // Next-in-turn from the sender (in current play direction)
      const nextIdx = ((senderIdx + (gameState.direction ?? 1)) % totalPlayers + totalPlayers) % totalPlayers

      const fromAngle = angleFor(senderIdx)
      const toAngle = angleFor(nextIdx)
      const id = Date.now() + Math.random()
      setActiveEmotes(prev => [...prev, { id, emote: last.emote, fromAngle, toAngle }])
    }
  }, [events, gameState, playerId])

  const removeEmote = useCallback((id: number) => {
    setActiveEmotes(prev => prev.filter(e => e.id !== id))
  }, [])

  const clearDrawToast = useCallback(() => setDrawToast(null), [])
  const removeFlyingCard = useCallback((id: number) => {
    setFlyingCards(prev => prev.filter(c => c.id !== id))
  }, [])
  const removeSkippedBubble = useCallback((id: number) => {
    setSkippedBubbles(prev => prev.filter(b => b.id !== id))
  }, [])
  const clearPassAnim = useCallback(() => setPassAnim(null), [])
  const clearSwapAnim = useCallback(() => setSwapAnim(null), [])

  if (!gameState) return null

  const isLobby = gameState.phase === 'lobby'
  const isEnded = gameState.phase === 'ended'
  const isPlaying = gameState.phase === 'playing' || isEnded // keep showing the table when ended
  const isHost = gameState.players[0]?.id === playerId
  // Use playerId from store, fall back to localStorage rejoinToken for mid-rejoin renders
  const effectivePlayerId = playerId ?? localStorage.getItem('rejoinToken')
  const myIndex = gameState.players.findIndex(p => p.id === effectivePlayerId)
  const isMyTurn = isPlaying && gameState.turnIndex === myIndex
  const rouletteActive = gameState.rouletteActive ?? false
  const isMyRoulette = isMyTurn && rouletteActive
  const unoCallable = gameState.unoCallable ?? []
  const iAmCallable = unoCallable.includes(effectivePlayerId ?? '')
  const recentDiscard = gameState.recentDiscard ?? (gameState.topDiscard ? [gameState.topDiscard] : [])

  // Arrange other players in turn order starting from next after me
  const playerCount = gameState.players.length
  const orderedOthers: { id: string; name: string; cardCount: number; connected: boolean; isEliminated: boolean; finishRank: number | null; originalIndex: number }[] = []
  for (let offset = 1; offset < playerCount; offset++) {
    const idx = (myIndex + offset) % playerCount
    const p = gameState.players[idx]
    orderedOthers.push({ ...p, originalIndex: idx })
  }
  const otherPlayers = orderedOthers
  const myPlayer = gameState.players[myIndex]

  // During roulette, can't play any cards
  const canPlayCards = new Set<string>()
  if (isMyTurn && !rouletteActive && hand.length > 0 && gameState.topDiscard) {
    for (const card of hand) {
      if (canPlayCheck(card, gameState)) canPlayCards.add(card.id)
    }
  }

  // Equal spacing: 360° / totalPlayers, "you" at 270° (bottom)
  function getPlayerAngle(index: number, totalOthers: number): number {
    const totalPlayers = totalOthers + 1
    const slotDeg = 360 / totalPlayers
    return 270 + slotDeg * (index + 1)
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col">
      {/* Overlays */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 glass border border-sunset-500/40 text-sunset-200 px-4 py-2 rounded-xl text-sm z-40 animate-fade-in">
          {error}
        </div>
      )}
      {drawToast && <DrawToast count={drawToast.count} name={drawToast.name} onDone={clearDrawToast} />}
      {passAnim && <PassAnimation direction={passAnim.direction} onDone={clearPassAnim} />}
      {swapAnim && <SwapAnimation p1={swapAnim.p1} p2={swapAnim.p2} onDone={clearSwapAnim} />}
      {showColorPicker && <ColorPicker onPick={pickColor} />}
      {showEmotePicker && <EmotePicker onPick={sendEmote} onClose={() => setShowEmotePicker(false)} />}

      {/* Emote button — fixed bottom-right, above hand */}
      {isPlaying && (
        <button
          type="button"
          onClick={() => setShowEmotePicker(true)}
          className="fixed bottom-4 right-4 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-lotus-400 to-lotus-500 hover:scale-110 active:scale-95 shadow-glow-lotus flex items-center justify-center text-2xl border border-white/20 transition-all"
          title="Send emote"
        >
          😂
        </button>
      )}

      {/* Rules button + modal — visible on lobby and during game */}
      <RulesButton onClick={() => setShowRules(true)} position="bottom-left" />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {showSwapPicker && (
        <div className="fixed inset-0 bg-ink-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-display text-lg font-black text-center mb-4 text-lotus-200">Pick a hand to swap</h3>
            <div className="space-y-2">
              {gameState.players
                .filter(p => p.id !== effectivePlayerId && !p.isEliminated && p.cardCount > 0)
                .map(p => (
                  <button type="button" key={p.id} onClick={() => pickSwapTarget(p.id)}
                    className="w-full py-3 bg-gradient-to-r from-lotus-500 to-lotus-400 hover:scale-[1.02] rounded-xl font-display font-bold transition-all shadow-glow-lotus">
                    {p.name} <span className="text-white/70 font-normal">· {p.cardCount} cards</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-3 sm:px-6 py-2 glass-soft border-b border-white/5 shrink-0">
        <div className="text-sm">
          <span className="text-lotus-300/60">Room</span> <span className="font-display font-black text-lotus-300 text-lg tracking-wider">{gameState.code}</span>
        </div>
        <div className="flex items-center gap-2">
          {gameState.activeColor && (
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              gameState.activeColor === 'red' ? 'bg-uno-red' :
              gameState.activeColor === 'yellow' ? 'bg-uno-yellow text-black' :
              gameState.activeColor === 'green' ? 'bg-uno-green' : 'bg-uno-blue'
            }`}>{gameState.activeColor.toUpperCase()}</span>
          )}
          {gameState.pendingDraw > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 animate-pulse">+{gameState.pendingDraw}</span>
          )}
          <span className="text-xs text-gray-400">Deck: {gameState.deckCount}</span>
        </div>
      </div>

      {/* Scoreboard */}
      {isPlaying && <Scoreboard players={gameState.players} scores={scores} onLogout={logout} />}

      {/* Lobby */}
      {isLobby && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <h2 className="text-2xl font-bold">Waiting for players...</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {gameState.players.map((p, i) => (
              <div key={p.id} className="glass-soft px-4 py-2 rounded-xl">
                <span className="font-bold">{p.name}</span>
                {i === 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-sunset-500/20 text-sunset-300 font-black tracking-wider">HOST</span>}
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">{gameState.players.length}/10 players</p>
          {isHost && gameState.players.length >= 2 && (
            <button type="button" onClick={startGame}
              className="px-8 py-3 bg-warm-gradient rounded-xl font-display font-bold text-lg shadow-glow-sunset hover:scale-[1.03] active:scale-[0.98] transition-all">
              Start Game
            </button>
          )}
          <button type="button" onClick={logout}
            className="mt-3 px-5 py-2 bg-ink-600/50 hover:bg-sunset-500/30 border border-white/10 hover:border-sunset-400/40 rounded-xl text-sm font-semibold text-lotus-200 hover:text-white transition-all">
            {isHost ? '✕ Close Room & Leave' : '← Leave Room'}
          </button>
          {isHost && <p className="text-[11px] text-lotus-300/40 -mt-1">If you leave, everyone will be kicked.</p>}
        </div>
      )}

      {/* Game Over Overlay (over the live game state) */}
      {isEnded && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink-900/75 backdrop-blur-md pointer-events-none">
          <div className="glass rounded-3xl px-10 py-8 pointer-events-auto animate-fade-in shadow-glow-sunset">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-float">🏆</div>
              <h2 className="font-display text-2xl sm:text-3xl font-black mb-3 text-lotus-100 tracking-wide">Game Over</h2>
              <p className="text-lg sm:text-xl mb-5 text-lotus-200/80">
                Winner:{' '}
                <span className="font-display bg-gradient-to-r from-sunset-300 to-sunset-500 bg-clip-text text-transparent font-black text-2xl">
                  {gameState.players.find(p => p.id === gameState.winner)?.name ?? '?'}
                </span>
              </p>
              <button
                type="button"
                onClick={logout}
                className="px-7 py-2.5 bg-warm-gradient rounded-xl font-display font-bold shadow-glow-sunset hover:scale-105 transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playing */}
      {isPlaying && (
        <>
          {/* Circular table */}
          <div className="flex-1 flex items-center justify-center px-2 py-1 sm:py-3">
            <div className="relative w-[min(90vw,540px)] aspect-square">
              {/* Visible circle */}
              <div className="absolute inset-[4%] rounded-full border-2 border-gray-600/40" />

              {/* Direction arrow */}
              <div className="absolute inset-[2%] pointer-events-none">
                <DirectionArrow direction={gameState.direction} />
              </div>

              {/* Floating emotes */}
              {activeEmotes.map(e => (
                <FloatingEmote
                  key={e.id}
                  emote={e.emote}
                  fromAngle={e.fromAngle}
                  toAngle={e.toAngle}
                  direction={gameState.direction}
                  onDone={() => removeEmote(e.id)}
                />
              ))}

              {/* Flying cards (draw pile, hand pass, hand swap) */}
              {flyingCards.map(c => (
                <FlyingCard
                  key={c.id}
                  startLeft={c.startLeft}
                  startTop={c.startTop}
                  targetLeft={c.targetLeft}
                  targetTop={c.targetTop}
                  delay={c.delay}
                  duration={c.duration}
                  onDone={() => removeFlyingCard(c.id)}
                />
              ))}

              {/* Semi-transparent skip-card overlay on skipped players */}
              {skippedBubbles.map(b => (
                <SkippedOverlay
                  key={b.id}
                  left={b.left}
                  top={b.top}
                  cardImage={b.cardImage}
                  onDone={() => removeSkippedBubble(b.id)}
                />
              ))}

              {/* Other players equally spaced */}
              {otherPlayers.map((p, i) => {
                const angleDeg = getPlayerAngle(i, otherPlayers.length)
                const rad = (angleDeg * Math.PI) / 180
                const r = 46
                const left = 50 + r * Math.cos(rad)
                const top = 50 - r * Math.sin(rad)

                return (
                  <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}>
                    <PlayerBubble
                      name={p.name} cardCount={p.cardCount}
                      isCurrentTurn={gameState.turnIndex === p.originalIndex}
                      isSelf={false} connected={p.connected} isEliminated={p.isEliminated}
                      finishRank={p.finishRank ?? null}
                      isCallable={unoCallable.includes(p.id)}
                      onChallenge={unoCallable.includes(p.id) ? () => challengeUno(p.id) : undefined}
                      showSwapButton={showSwapPicker}
                      onSwapPick={() => pickSwapTarget(p.id)}
                      onKick={!p.connected && !p.isEliminated ? () => kickVote(p.id) : undefined}
                      kickInfo={!p.connected && gameState.kickVotes?.[p.id] !== undefined ? {
                        votes: gameState.kickVotes[p.id],
                        needed: gameState.kickNeeded?.[p.id] ?? 1,
                      } : undefined}
                    />
                  </div>
                )
              })}

              {/* Center: Draw + Discard */}
              <div className="absolute inset-0 flex items-center justify-center gap-8 sm:gap-12">
                <button type="button" onClick={draw} disabled={!isMyTurn}
                  className={`
                    relative w-18 h-28 sm:w-22 sm:h-34 rounded-xl shrink-0 [&>img]:rounded-xl
                    ${isMyRoulette ? 'ring-2 ring-red-400 animate-pulse cursor-pointer' :
                      isMyTurn ? 'hover:scale-105 cursor-pointer hover:ring-2 hover:ring-cyan-400' :
                      'opacity-50 cursor-not-allowed'}
                    transition-all duration-200
                  `}>
                  <img src="/cards/Back/back.png" alt="Draw pile" className="w-full h-full object-cover" draggable={false} />
                  {isMyRoulette && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black text-red-400 bg-black/60 px-1 rounded">
                      DRAW!
                    </span>
                  )}
                  <span className="absolute -top-2 -right-2 bg-gray-700 text-[10px] px-1.5 py-0.5 rounded-full border border-gray-600 font-bold">
                    {gameState.deckCount}
                  </span>
                </button>

                <DiscardPile cards={recentDiscard} activeColor={gameState.activeColor} />
              </div>

              {/* "You" at bottom of circle — on the circle line at 270° */}
              {myPlayer && (() => {
                const rad = (270 * Math.PI) / 180
                const r = 46
                const left = 50 + r * Math.cos(rad)
                const top = 50 - r * Math.sin(rad)
                return (
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}>
                    <PlayerBubble
                      name={myPlayer.name}
                      cardCount={hand.length}
                      isCurrentTurn={isMyTurn}
                      isSelf={true}
                      connected={myPlayer.connected}
                      isEliminated={myPlayer.isEliminated}
                      finishRank={myPlayer.finishRank ?? null}
                      isCallable={false}
                    />
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Turn indicator */}
          <div className="text-center py-1 text-sm shrink-0 relative z-10 -mb-4">
            {isMyTurn ? (
              <span className="font-display font-black tracking-wide animate-soft-pulse bg-gradient-to-r from-sunset-300 to-lotus-300 bg-clip-text text-transparent">
                {isMyRoulette
                  ? `Roulette! Draw until you get ${gameState.activeColor?.toUpperCase()}`
                  : 'Your turn'}
              </span>
            ) : (
              <span className="text-lotus-200/60">{gameState.players[gameState.turnIndex]?.name}'s turn</span>
            )}
          </div>

          {/* Hand + UNO */}
          <div className="shrink-0 relative z-30 overflow-visible">
            {(hand.length <= 2 && hand.length > 0 || iAmCallable) && (
              <div className="flex justify-center pt-2">
                <button type="button" onClick={callUno}
                  className={`px-8 py-2 rounded-full font-display font-black text-lg tracking-widest shadow-soft transition-all
                    ${iAmCallable ? 'bg-warm-gradient animate-bounce glow-warm' : 'bg-gradient-to-r from-sunset-500 to-sunset-400 hover:scale-105'}
                  `}>
                  UNO!
                </button>
              </div>
            )}
            <Hand cards={hand} onPlay={playCard} isMyTurn={isMyTurn} canPlayCards={canPlayCards} />
          </div>
        </>
      )}
    </div>
  )
}

// ── Client-side play check ───────────────────────────────────────

function canPlayCheck(
  card: CardType,
  state: { topDiscard: CardType | null; activeColor: string | null; pendingDraw: number },
): boolean {
  if (state.pendingDraw > 0) {
    const drawCards = ['+2', '+4', 'wild_reverse_+4', 'wild_+6', 'wild_+10']
    if (!drawCards.includes(card.value)) return false
    const topVal = state.topDiscard?.value
    if (!topVal) return true
    const rank = (v: string) => {
      switch (v) { case '+2': return 2; case '+4': case 'wild_reverse_+4': return 4; case 'wild_+6': return 6; case 'wild_+10': return 10; default: return 0 }
    }
    return rank(card.value) >= rank(topVal)
  }
  if (card.color === 'wild') return true
  if (!state.topDiscard) return true
  if (card.color === state.activeColor) return true
  if (card.value === state.topDiscard.value) return true
  return false
}
