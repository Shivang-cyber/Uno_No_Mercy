import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from '../store'
import type { Color, Card as CardType } from '../../shared/types'
import Card from './Card'
import Hand from './Hand'
import ColorPicker from './ColorPicker'
import RulesModal, { RulesButton } from './RulesModal'
import EmotePicker, { FloatingEmote } from './EmotePicker'
import Avatar, { type Mood } from '../avatar/Avatar'
import AvatarEditor from '../avatar/AvatarEditor'
import { avatarFromSeed, type AvatarConfig } from '../../shared/avatar'
import { anchor, seat, handCard, flyCard, ripple, shatter, confetti, burst, feathers, handArrival, COLOR_HEX, type Point } from '../lib/fx'
import { RevengePrompt, RevengeScene, WEAPON_SOUND } from './Revenge'
import type { Weapon } from '../../shared/types'

// ── Direction arrow ──────────────────────────────────────────────
// A bold arc outside the table circle, sweeping under your seat towards the
// next player. Players sit counter-clockwise on screen in turn order (the next
// player is on your right), so direction 1 points right; -1 mirrors it.

function DirectionArrow({ direction }: { direction: 1 | -1 }) {
  const c = 100
  const r = 90
  const startDeg = 150 // SVG degrees (y down): lower-left
  const endDeg = 30    // lower-right, where the head sits
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const pt = (deg: number, rad = r) => ({ x: c + rad * Math.cos(toRad(deg)), y: c + rad * Math.sin(toRad(deg)) })
  const s = pt(startDeg)
  const e = pt(endDeg + 6) // leave room for the head
  const arc = `M ${s.x} ${s.y} A ${r} ${r} 0 0 0 ${e.x} ${e.y}`

  // Head: tip ahead along the arc, base straddling the line.
  const tip = pt(endDeg - 6)
  const baseL = pt(endDeg + 4, r + 7)
  const baseR = pt(endDeg + 4, r - 7)

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-full h-full overflow-visible transition-transform duration-700 ease-in-out ${
        direction === -1 ? 'scale-x-[-1]' : ''
      }`}
    >
      <defs>
        <linearGradient id="dir-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b286ff" stopOpacity="0.15" />
          <stop offset="60%" stopColor="#c9a4ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fc9d7c" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke="url(#dir-grad)" strokeWidth="4.5" strokeLinecap="round" />
      <path d={arc} fill="none" stroke="#fdc48a" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round"
        strokeDasharray="10 290" className="animate-dir-flow" />
      <path
        d={`M ${tip.x} ${tip.y} L ${baseL.x} ${baseL.y} L ${baseR.x} ${baseR.y} Z`}
        fill="#fc9d7c" stroke="#fc9d7c" strokeWidth="2.5" strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 4px rgba(252,157,124,.6))' }}
      />
    </svg>
  )
}

// ── Stacked discard pile (fans out on hover) ─────────────────────

function DiscardPile({ cards, activeColor, hiddenIds, pendingDraw }: {
  cards: CardType[]; activeColor: Color | null; hiddenIds: Set<string>; pendingDraw: number
}) {
  const [hovered, setHovered] = useState(false)
  const show = cards.slice(-5)
  if (show.length === 0) return <div data-anchor="discard" className="w-18 h-28 sm:w-22 sm:h-34 rounded-lg border-2 border-dashed border-gray-600" />

  return (
    <div
      data-anchor="discard"
      className="relative w-32 h-32 sm:w-36 sm:h-40 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Soft glow in the active colour */}
      <div
        className="absolute inset-[-12%] rounded-full blur-2xl transition-colors duration-700 pointer-events-none"
        style={{ backgroundColor: activeColor ? `${COLOR_HEX[activeColor]}40` : 'transparent' }}
      />
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
              opacity: hiddenIds.has(card.id) ? 0 : 1,
              transition: 'left 300ms ease-out, transform 300ms ease-out',
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
      {pendingDraw > 0 && (
        <div key={pendingDraw}
          className="absolute -top-3 -right-3 z-30 px-2.5 py-1 rounded-full bg-red-600 text-white font-display font-black text-sm shadow-lg ring-2 ring-white/30 animate-pop">
          +{pendingDraw}
        </div>
      )}
    </div>
  )
}

// ── Big "+N drawn" toast (only for forced draws of 2+) ───────────

function CentreToast({ big, small, onDone }: { big: string; small: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="glass rounded-2xl px-6 py-3 animate-fade-in">
        <div className="font-display text-3xl font-black text-center bg-gradient-to-r from-sunset-300 to-sunset-500 bg-clip-text text-transparent">{big}</div>
        <div className="text-xs text-lotus-200/70 text-center mt-1 tracking-wider">{small}</div>
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

function SkippedOverlay({ left, top, onDone }: {
  left: number; top: number; onDone: () => void
}) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  // onDone is a fresh function on every table render; keep the latest without restarting the timers
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('exit'), 1500)
    const t3 = setTimeout(() => onDoneRef.current(), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-500 ease-out
        ${phase === 'enter' ? 'scale-75 opacity-0' : ''}
        ${phase === 'show' ? 'scale-100 opacity-100' : ''}
        ${phase === 'exit' ? 'scale-110 opacity-0' : ''}
      `}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {/* Tag above the head so the character's reaction stays visible */}
      <div className="-translate-y-[78px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white shadow-lg border-2 border-ink-900 whitespace-nowrap">
        <svg viewBox="0 0 16 16" className="w-3 h-3"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M3.8 12.2 L12.2 3.8" stroke="currentColor" strokeWidth="2.2" /></svg>
        <span className="font-display text-[10px] font-black tracking-wider">SKIPPED</span>
      </div>
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
  name, avatar, mood, moodKey, away, cardCount, isCurrentTurn, isSelf, connected, isEliminated, finishRank,
  isCallable, onChallenge, showSwapButton, onSwapPick,
  onKick, kickInfo,
}: {
  name: string; avatar: AvatarConfig; mood: Mood; moodKey?: number; away?: boolean
  cardCount: number; isCurrentTurn: boolean; isSelf: boolean
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
  const active = isCurrentTurn && !finished && !isEliminated

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`relative transition-transform duration-300 ${active ? 'scale-110' : ''}`}>
        <div
          className={`
            w-24 h-24 sm:w-[114px] sm:h-[114px] rounded-full overflow-hidden
            bg-gradient-to-b from-ink-500 to-ink-700 transition-all duration-300
            ${active ? 'ring-[3px] ring-sunset-300 glow-warm' : 'ring-1 ring-white/10'}
            ${isSelf && !active ? 'ring-2 ring-mint-400' : ''}
            ${!connected && !finished ? 'opacity-40 grayscale' : ''}
            ${isEliminated ? 'opacity-50' : ''}
          `}
        >
          <div className={`w-full h-full transition-opacity duration-200 ${away ? 'opacity-0' : ''}`}>
            <Avatar key={moodKey} config={avatar} mood={mood} cards={isEliminated || finished ? 0 : cardCount} className="w-full h-full" />
          </div>
        </div>
        {/* Card count */}
        {!finished && !isEliminated && (
          <span
            key={cardCount}
            className={`absolute bottom-0 right-0 min-w-[30px] h-[30px] px-2 rounded-full flex items-center justify-center
              font-display text-sm font-black border-2 border-ink-900 shadow animate-pop
              ${cardCount === 1 ? 'bg-sunset-500 text-white' : 'bg-ink-600 text-white'}`}
          >
            {cardCount}
          </span>
        )}
        {isEliminated && (
          <span className="absolute bottom-0 right-0 px-2 h-[30px] rounded-full flex items-center font-display text-xs font-black tracking-wider text-white bg-red-600 border-2 border-ink-900">
            OUT
          </span>
        )}
        {finished && (
          <span className={`absolute top-0 left-0 px-2 h-[30px] rounded-full flex items-center font-display text-sm font-black text-white border-2 border-ink-900 ${rankBg}`}>
            {rankLabel}
          </span>
        )}
      </div>
      <span className={`text-xs sm:text-sm font-semibold truncate max-w-[114px] ${isSelf ? 'text-mint-400' : 'text-lotus-200/80'}`}>
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
    gameState, hand, playerId, playCard, draw, endTurn, callUno, challengeUno,
    pickSwapTarget, pickColor, kickVote, sendEmote, logout,
    showColorPicker, showSwapPicker, startGame, error, avatars, myAvatar, setMyAvatar,
    revengeOffer, takeRevenge, dismissRevenge, slapstick, toggleSlapstick,
  } = useStore()

  const [toast, setToast] = useState<{ big: string; small: string; key: number } | null>(null)
  const [skippedBubbles, setSkippedBubbles] = useState<{ id: number; playerId: string; left: number; top: number }[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [turnBanner, setTurnBanner] = useState(0)
  const [passAnim, setPassAnim] = useState<{ direction: 1 | -1 } | null>(null)
  const [swapAnim, setSwapAnim] = useState<{ p1: string; p2: string } | null>(null)
  const [scores] = useState<Record<string, number>>({})
  const [showEmotePicker, setShowEmotePicker] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [activeEmotes, setActiveEmotes] = useState<{ id: number; emote: string; fromAngle: number; toAngle: number }[]>([])
  const eventLog = useStore(s => s.eventLog)
  const [showEditor, setShowEditor] = useState(false)
  const [revengeQueue, setRevengeQueue] = useState<{ id: number; attackerId: string; targetId: string; weapon: Weapon }[]>([])
  const slapstickRef = useRef(slapstick)
  slapstickRef.current = slapstick

  // ── Character reactions: short mood sequences per player ──
  const [reactions, setReactions] = useState<Record<string, { mood: Mood; key: number }>>({})
  const reactionTimers = useRef(new Map<string, ReturnType<typeof setTimeout>[]>())
  const reactionPriority = useRef(new Map<string, number>())

  const react = useCallback((id: string, steps: [Mood, number][], priority: number, delay = 0) => {
    const start = () => {
      if ((reactionPriority.current.get(id) ?? 0) > priority) return
      reactionTimers.current.get(id)?.forEach(clearTimeout)
      reactionPriority.current.set(id, priority)
      const timers: ReturnType<typeof setTimeout>[] = []
      let at = 0
      steps.forEach(([mood, ms]) => {
        timers.push(setTimeout(() => setReactions(prev => ({ ...prev, [id]: { mood, key: Math.random() } })), at))
        at += ms
      })
      timers.push(setTimeout(() => {
        reactionPriority.current.delete(id)
        setReactions(prev => { const n = { ...prev }; delete n[id]; return n })
      }, at))
      reactionTimers.current.set(id, timers)
    }
    if (delay) setTimeout(start, delay)
    else start()
  }, [])

  useEffect(() => () => reactionTimers.current.forEach(ts => ts.forEach(clearTimeout)), [])

  // Event handlers read the latest state through refs so they only run when a
  // NEW event arrives, not on every STATE update.
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState
  const playerIdRef = useRef(playerId)
  playerIdRef.current = playerId
  const lastSeqRef = useRef<number | null>(null)

  useEffect(() => {
    const newest = eventLog[eventLog.length - 1]?.seq ?? 0
    if (lastSeqRef.current === null) { lastSeqRef.current = newest; return }
    const fresh = eventLog.filter(e => e.seq > lastSeqRef.current!)
    lastSeqRef.current = newest
    const gs = gameStateRef.current
    if (!gs || fresh.length === 0) return
    const me = playerIdRef.current

    const PLAY_MS = 650
    const SEAT_SCALE = 0.45
    const posOf = (id: string): Point | null => (id === me ? anchor('hand') : seat(id))
    const hide = (ids: string[]) => setHiddenIds(prev => new Set([...prev, ...ids]))
    const reveal = (id: string) => setHiddenIds(prev => { const n = new Set(prev); n.delete(id); return n })
    const bumpPile = () => document.querySelector('[data-anchor="discard"]')?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'ease-out' },
    )
    const flyToMe = (landsInMs: number) => { handArrival.at = performance.now() + landsInMs - 120 }

    function drawFlights(recipientId: string, count: number) {
      const from = anchor('deck')
      const to = posOf(recipientId)
      if (!from || !to) return
      const total = Math.min(count, 12)
      const stagger = 90
      const duration = 600
      for (let i = 0; i < total; i++) {
        flyCard({ from, to, toScale: recipientId === me ? 1 : SEAT_SCALE, delay: i * stagger, duration, lift: 70 })
      }
      if (recipientId === me) flyToMe(duration + (total - 1) * stagger)
    }

    // A play earlier in this batch delays the colour ripple until it lands.
    let playInBatch = false

    for (const { event: ev } of fresh) {
      switch (ev.event) {
        case 'card_played': {
          playInBatch = true
          react(ev.playerId, [['smug', 1900]], 2)
          const to = anchor('discard')
          const mine = ev.playerId === me
          const from = mine ? (handCard(ev.card.id) ?? anchor('hand')) : seat(ev.playerId)
          if (!to || !from) break
          hide([ev.card.id])
          flyCard({
            from, to,
            fromScale: mine ? 1 : SEAT_SCALE,
            face: ev.card.image,
            flip: mine ? 'none' : 'toFace',
            duration: PLAY_MS,
            landSpin: (Math.random() - 0.5) * 28,
            onLand: () => { reveal(ev.card.id); bumpPile() },
          })
          break
        }

        case 'discard_all': {
          const to = anchor('discard')
          const mine = ev.playerId === me
          if (!to || !ev.cards?.length) break
          hide(ev.cards.map(c => c.id))
          ev.cards.forEach((c, i) => {
            const from = mine ? (handCard(c.id) ?? anchor('hand')) : seat(ev.playerId)
            if (!from) { reveal(c.id); return }
            flyCard({
              from, to,
              fromScale: mine ? 1 : SEAT_SCALE,
              face: c.image,
              flip: mine ? 'none' : 'toFace',
              delay: 220 + i * 120,
              duration: 560,
              lift: 60,
              landSpin: (Math.random() - 0.5) * 30,
              onLand: () => { reveal(c.id); bumpPile() },
            })
          })
          break
        }

        case 'color_chosen': {
          const at = anchor('discard')
          if (at) ripple(at, COLOR_HEX[ev.color], playInBatch ? PLAY_MS - 60 : 0)
          break
        }

        case 'cards_drawn': {
          drawFlights(ev.playerId, ev.count)
          if (ev.count >= 10) react(ev.playerId, [['shock', 600], ['tantrum', 2200], ['cry', 1600]], 3)
          else if (ev.count >= 6) react(ev.playerId, [['shock', 600], ['tantrum', 2200]], 3)
          else if (ev.count >= 2) react(ev.playerId, [['shock', 700], ['gloom', 1500]], 3)
          else react(ev.playerId, [['meh', 1200]], 1)
          if (ev.count > 1) {
            const name = gs.players.find(p => p.id === ev.playerId)?.name ?? '?'
            setToast({ big: `+${ev.count}`, small: `${name} draws`, key: Math.random() })
          }
          break
        }

        case 'uno_penalty': {
          drawFlights(ev.playerId, ev.cardsDrawn)
          react(ev.playerId, [['facepalm', 2000]], 3)
          break
        }

        case 'hands_passed': {
          setPassAnim({ direction: ev.direction })
          gs.players.filter(p => p.cardCount > 0 && !p.isEliminated).forEach(p => react(p.id, [['dizzy', 1700]], 2))
          const n = gs.players.length
          const alive = gs.players.filter(p => p.cardCount > 0 && !p.isEliminated)
          alive.forEach(p => {
            const fromIdx = gs.players.findIndex(pp => pp.id === p.id)
            // Next player with cards in the pass direction
            let toIdx = fromIdx
            for (let k = 0; k < n; k++) {
              toIdx = ((toIdx + ev.direction) % n + n) % n
              if (alive.some(a => a.id === gs.players[toIdx].id)) break
            }
            const toId = gs.players[toIdx].id
            const from = posOf(p.id)
            const to = posOf(toId)
            if (!from || !to) return
            flyCard({ from, to, fromScale: p.id === me ? 1 : 0.6, toScale: toId === me ? 1 : 0.6, duration: 900, lift: 40 })
            if (toId === me) flyToMe(900)
          })
          break
        }

        case 'hands_swapped': {
          const p1 = gs.players.find(p => p.id === ev.playerId)?.name ?? '?'
          const p2 = gs.players.find(p => p.id === ev.targetId)?.name ?? '?'
          setSwapAnim({ p1, p2 })
          // Counts are from before the swap: whoever ends up with more cards throws a fit
          const before = (id: string) => gs.players.find(p => p.id === id)?.cardCount ?? 0
          const loser = before(ev.playerId) > before(ev.targetId) ? ev.targetId : ev.playerId
          const winner = loser === ev.playerId ? ev.targetId : ev.playerId
          react(loser, [['dizzy', 900], ['tantrum', 2000]], 3)
          react(winner, [['dizzy', 900], ['smug', 1600]], 2)
          const a = posOf(ev.playerId)
          const b = posOf(ev.targetId)
          if (a && b) {
            const sA = ev.playerId === me ? 1 : 0.6
            const sB = ev.targetId === me ? 1 : 0.6
            flyCard({ from: a, to: b, fromScale: sA, toScale: sB, duration: 900, lift: 60 })
            flyCard({ from: b, to: a, fromScale: sB, toScale: sA, duration: 900, lift: -60 })
            if (ev.playerId === me || ev.targetId === me) flyToMe(900)
          }
          break
        }

        case 'turn_skipped':
        case 'skip_everyone': {
          const myIdxLocal = gs.players.findIndex(p => p.id === me)
          const totalPlayers = gs.players.length
          const targets = ev.event === 'turn_skipped'
            ? gs.players.filter(p => p.id === ev.playerId)
            : gs.players.filter(p => p.id !== ev.playerId && p.cardCount > 0 && !p.isEliminated)
          const bubbles = targets.map(p => {
            const idx = gs.players.findIndex(pp => pp.id === p.id)
            const offset = (idx - myIdxLocal + totalPlayers) % totalPlayers
            const rad = ((270 + (360 / totalPlayers) * offset) * Math.PI) / 180
            return { id: Date.now() + idx + Math.random(), playerId: p.id, left: 50 + 46 * Math.cos(rad), top: 50 - 46 * Math.sin(rad) }
          })
          // Let the skip card land first; by then someone may be out, so re-check against the latest state
          setTimeout(() => {
            const out = new Set(gameStateRef.current?.players.filter(p => p.isEliminated || p.finishRank).map(p => p.id))
            const fresh = bubbles.filter(b => !out.has(b.playerId))
            // One tag per player: a new skip replaces (and restarts) their existing tag
            setSkippedBubbles(prev => [...prev.filter(b => !fresh.some(f => f.playerId === b.playerId)), ...fresh])
          }, PLAY_MS - 100)
          targets.forEach(p => react(p.id, [['shock', 500], ['gloom', 1100]], 2, PLAY_MS - 100))
          if (ev.event === 'skip_everyone') {
            const name = gs.players.find(p => p.id === ev.playerId)?.name ?? '?'
            setTimeout(() => setToast({ big: 'Skip everyone!', small: `${name} goes again`, key: Math.random() }), PLAY_MS - 100)
          }
          break
        }

        case 'revenge': {
          if (slapstickRef.current) {
            // One scene at a time; drop extras if a skip-everyone sets off a stampede
            setRevengeQueue(q => q.length >= 4 ? q : [...q, { id: Math.random(), attackerId: ev.attackerId, targetId: ev.targetId, weapon: ev.weapon }])
          } else {
            const nameOf = (id: string) => gs.players.find(p => p.id === id)?.name ?? '?'
            setToast({ big: WEAPON_SOUND[ev.weapon], small: `${nameOf(ev.attackerId)} got revenge on ${nameOf(ev.targetId)}`, key: Math.random() })
          }
          break
        }

        case 'uno_called': {
          react(ev.playerId, [['confident', 1500]], 2)
          break
        }

        case 'eliminated': {
          const at = seat(ev.playerId)
          if (at) shatter(at)
          break
        }

        case 'player_won': {
          setTimeout(confetti, 300)
          react(ev.playerId, [['celebrate', 6000]], 4)
          break
        }

        case 'emote': {
          const senderIdx = gs.players.findIndex(p => p.id === ev.playerId)
          if (senderIdx === -1) break
          const myIdxLocal = gs.players.findIndex(p => p.id === me)
          const totalPlayers = gs.players.length
          const angleFor = (idx: number) => idx === myIdxLocal
            ? 270
            : 270 + (360 / totalPlayers) * ((idx - myIdxLocal + totalPlayers) % totalPlayers)
          const nextIdx = ((senderIdx + (gs.direction ?? 1)) % totalPlayers + totalPlayers) % totalPlayers
          const id = Date.now() + Math.random()
          setActiveEmotes(prev => [...prev, { id, emote: ev.emote, fromAngle: angleFor(senderIdx), toAngle: angleFor(nextIdx) }])
          break
        }
      }
    }
  }, [eventLog, react])

  const currentRevenge = revengeQueue[0]
  const onRevengeImpact = useCallback((to: Point, hand: Point) => {
    const r = revengeQueue[0]
    if (!r) return
    const colour: Record<Weapon, string> = { mallet: '#ff8fb1', chicken: '#ffd23f', pie: '#fffaf0', pillow: '#c9b8ff', cards: '#fc9d7c' }
    burst(to, WEAPON_SOUND[r.weapon], colour[r.weapon])
    const seatEl = document.querySelector(`[data-seat="${CSS.escape(r.targetId)}"]`)
    seatEl?.animate(
      r.weapon === 'mallet'
        ? [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(1.15,.75)' }, { transform: 'translate(-50%,-50%) scale(1)' }]
        : [{ transform: 'translate(-50%,-50%)' }, { transform: 'translate(calc(-50% + 10px),-50%) rotate(6deg)' }, { transform: 'translate(calc(-50% - 8px),-50%) rotate(-4deg)' }, { transform: 'translate(-50%,-50%)' }],
      { duration: 420, easing: 'ease-out' },
    )
    switch (r.weapon) {
      case 'mallet': react(r.targetId, [['bonked', 2400]], 5); break
      case 'chicken': react(r.targetId, [['dizzy', 1900]], 5); break
      case 'pie': react(r.targetId, [['pied', 3000]], 5); break
      case 'pillow': react(r.targetId, [['dizzy', 1500]], 5); feathers(to); break
      case 'cards':
        for (let i = 0; i < 9; i++) {
          flyCard({ from: hand, to: { x: to.x + (Math.random() - 0.5) * 60, y: to.y + (Math.random() - 0.5) * 40 }, fromScale: 0.4, toScale: 0.45, delay: i * 35, duration: 320, lift: 20, landSpin: (Math.random() - 0.5) * 360 })
        }
        react(r.targetId, [['shock', 600], ['gloom', 1200]], 5)
        break
    }
  }, [revengeQueue, react])
  const onRevengeDone = useCallback(() => {
    const r = revengeQueue[0]
    if (r) react(r.attackerId, [['smug', 1500]], 2)
    setRevengeQueue(q => q.slice(1))
  }, [revengeQueue, react])

  // "Your turn" banner when the turn comes round to me
  const myTurnNow = !!gameState && gameState.phase === 'playing' && gameState.players[gameState.turnIndex]?.id === playerId
  const wasMyTurn = useRef(myTurnNow)
  useEffect(() => {
    if (myTurnNow && !wasMyTurn.current) setTurnBanner(Date.now())
    wasMyTurn.current = myTurnNow
  }, [myTurnNow])

  const removeEmote = useCallback((id: number) => {
    setActiveEmotes(prev => prev.filter(e => e.id !== id))
  }, [])

  const clearToast = useCallback(() => setToast(null), [])
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
  const awaitingEndTurn = gameState.awaitingEndTurn ?? false
  const iAwaitEndTurn = isMyTurn && awaitingEndTurn
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

  const avatarOf = (id: string, name: string) => avatars[id] ?? avatarFromSeed(name)
  // A running reaction wins; otherwise the mood follows the player's situation
  const moodOf = (p: { id: string; cardCount: number; isEliminated: boolean; finishRank?: number | null }, isTurn: boolean): Mood => {
    if (p.isEliminated) return 'ko'
    const r = reactions[p.id]
    if (r) return r.mood
    if (p.finishRank) return 'confident'
    if (isTurn && gameState.pendingDraw > 0) return 'worried'
    if (p.cardCount === 1) return 'confident'
    return isTurn ? 'turn' : 'idle'
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
        <div className="fixed top-4 inset-x-0 mx-auto w-fit glass border border-sunset-500/40 text-sunset-200 px-4 py-2 rounded-xl text-sm z-40 animate-fade-in">
          {error}
        </div>
      )}
      {turnBanner > 0 && (
        <div key={turnBanner} onAnimationEnd={() => setTurnBanner(0)}
          className="fixed top-16 left-1/2 z-40 pointer-events-none glass rounded-2xl px-8 py-3 shadow-glow-sunset animate-turn-banner">
          <span className="font-display text-2xl font-black tracking-wide bg-gradient-to-r from-sunset-300 to-lotus-300 bg-clip-text text-transparent">
            Your turn
          </span>
        </div>
      )}
      {toast && <CentreToast key={toast.key} big={toast.big} small={toast.small} onDone={clearToast} />}
      {passAnim && <PassAnimation direction={passAnim.direction} onDone={clearPassAnim} />}
      {swapAnim && <SwapAnimation p1={swapAnim.p1} p2={swapAnim.p2} onDone={clearSwapAnim} />}
      {showColorPicker && <ColorPicker onPick={pickColor} />}
      {currentRevenge && (
        <RevengeScene
          key={currentRevenge.id}
          attackerId={currentRevenge.attackerId}
          targetId={currentRevenge.targetId}
          weapon={currentRevenge.weapon}
          attacker={avatarOf(currentRevenge.attackerId, gameState.players.find(p => p.id === currentRevenge.attackerId)?.name ?? '')}
          onImpact={onRevengeImpact}
          onDone={onRevengeDone}
        />
      )}
      {revengeOffer && isPlaying && (
        <RevengePrompt
          targetName={gameState.players.find(p => p.id === revengeOffer.targetId)?.name ?? '?'}
          reason={revengeOffer.reason}
          count={revengeOffer.count}
          expiresAt={revengeOffer.expiresAt}
          ttlMs={revengeOffer.ttlMs}
          onPick={takeRevenge}
          onDismiss={dismissRevenge}
        />
      )}
      {showEditor && (
        <AvatarEditor
          initial={myAvatar ?? avatarOf(effectivePlayerId ?? '', myPlayer?.name ?? '')}
          onSave={a => { setMyAvatar(a); setShowEditor(false) }}
          onClose={() => setShowEditor(false)}
        />
      )}
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
            <span key={gameState.pendingDraw} className="px-2 py-0.5 rounded text-xs font-bold bg-red-600 animate-pop">+{gameState.pendingDraw}</span>
          )}
          <span className="text-xs text-gray-400">Deck: {gameState.deckCount}</span>
          <button type="button" onClick={toggleSlapstick}
            title="Show or hide revenge animations on your screen"
            className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${slapstick ? 'bg-sunset-500/20 border-sunset-400/40 text-sunset-200' : 'bg-ink-700/60 border-white/10 text-lotus-300/60'}`}>
            Slapstick {slapstick ? 'on' : 'off'}
          </button>
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
              <div key={p.id} className={`glass-soft px-3 pt-2 pb-2 rounded-2xl flex flex-col items-center w-28 ${p.id === effectivePlayerId ? 'ring-2 ring-mint-400/60' : ''}`}>
                <Avatar config={avatarOf(p.id, p.name)} variant="full" className="w-20 h-28" />
                <span className="font-bold text-sm truncate max-w-full">{p.name}</span>
                {i === 0 && <span className="mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-sunset-500/20 text-sunset-300 font-black tracking-wider">HOST</span>}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setShowEditor(true)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-400 font-display font-bold text-sm shadow-glow-lotus hover:scale-[1.03] active:scale-[0.98] transition-all">
            Customise your character
          </button>
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

      {/* Game Over: winner + full standings */}
      {isEnded && (() => {
        const ranked = [...gameState.players].sort((x, y) => {
          const rx = x.isEliminated ? 999 : (x.finishRank ?? 998)
          const ry = y.isEliminated ? 999 : (y.finishRank ?? 998)
          return rx - ry
        })
        const winner = gameState.players.find(p => p.id === gameState.winner)
        const medal = (rank: number | null) =>
          rank === 1 ? 'bg-gradient-to-br from-sunset-300 to-sunset-500 text-ink-900'
          : rank === 2 ? 'bg-gradient-to-br from-lotus-300 to-lotus-500 text-ink-900'
          : rank === 3 ? 'bg-gradient-to-br from-sunset-400 to-sunset-500/70 text-ink-900'
          : 'bg-ink-600 text-lotus-100'
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-900/75 backdrop-blur-md p-4">
            <div className="glass rounded-3xl px-6 sm:px-8 py-6 w-full max-w-md max-h-[92vh] overflow-y-auto animate-rise shadow-glow-sunset">
              {winner && (
                <div className="text-center">
                  <Avatar config={avatarOf(winner.id, winner.name)} mood="celebrate" variant="full" className="w-24 h-36 mx-auto" />
                  <h2 className="font-display text-2xl sm:text-3xl font-black text-lotus-100 tracking-wide">
                    <span className="bg-gradient-to-r from-sunset-300 to-sunset-500 bg-clip-text text-transparent">{winner.name}</span> wins!
                  </h2>
                </div>
              )}

              <h3 className="font-display font-bold text-[11px] tracking-widest text-lotus-300/70 uppercase mt-5 mb-2">Final standings</h3>
              <ol className="space-y-2">
                {ranked.map((p, i) => {
                  const rank = p.isEliminated ? null : p.finishRank
                  const mood: Mood = p.isEliminated ? 'ko' : rank === 1 ? 'celebrate' : i === ranked.length - 1 ? 'gloom' : 'confident'
                  return (
                    <li key={p.id}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2 animate-rise ${rank === 1 ? 'bg-sunset-500/15 ring-1 ring-sunset-300/40' : 'bg-ink-700/50'}`}
                      style={{ animationDelay: `${200 + i * 120}ms`, animationFillMode: 'backwards' }}>
                      <span className={`w-11 h-8 shrink-0 rounded-full flex items-center justify-center font-display font-black text-sm ${p.isEliminated ? 'bg-red-600 text-white' : medal(rank)}`}>
                        {p.isEliminated ? 'OUT' : rank ? toOrdinal(rank) : '-'}
                      </span>
                      <div className="w-11 h-11 shrink-0 rounded-full overflow-hidden bg-gradient-to-b from-ink-500 to-ink-700">
                        <Avatar config={avatarOf(p.id, p.name)} mood={mood} className="w-full h-full" />
                      </div>
                      <span className={`flex-1 min-w-0 truncate font-bold ${p.id === effectivePlayerId ? 'text-mint-400' : 'text-lotus-100'}`}>
                        {p.name}{p.id === effectivePlayerId && <span className="text-lotus-300/60 font-normal"> (you)</span>}
                      </span>
                      <span className="text-[11px] text-lotus-300/70 shrink-0">
                        {p.isEliminated ? 'Mercy rule' : rank === 1 ? 'Winner' : p.cardCount > 0 ? `${p.cardCount} card${p.cardCount === 1 ? '' : 's'} left` : 'Finished'}
                      </span>
                    </li>
                  )
                })}
              </ol>

              <div className="text-center mt-6">
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
        )
      })()}

      {/* Playing */}
      {isPlaying && (
        <>
          {/* Circular table */}
          <div className="flex-1 flex items-center justify-center px-2 py-1 sm:py-3">
            <div className="relative w-[min(90vw,540px)] aspect-square">
              {/* Visible circle */}
              <div className="absolute inset-[4%] rounded-full border-2 border-gray-600/40" />

              {/* Direction arrow, outside the table circle */}
              <div className="absolute inset-[-13%] pointer-events-none">
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

              {/* Semi-transparent skip-card overlay on skipped players */}
              {skippedBubbles.map(b => (
                <SkippedOverlay
                  key={b.id}
                  left={b.left}
                  top={b.top}
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
                  <div key={p.id} data-seat={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}>
                    <PlayerBubble
                      name={p.name} cardCount={p.cardCount}
                      avatar={avatarOf(p.id, p.name)}
                      mood={moodOf(p, gameState.turnIndex === p.originalIndex)}
                      moodKey={reactions[p.id]?.key}
                      away={currentRevenge?.attackerId === p.id}
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
                <button type="button" onClick={draw} disabled={!isMyTurn || iAwaitEndTurn} data-anchor="deck"
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

                <DiscardPile cards={recentDiscard} activeColor={gameState.activeColor} hiddenIds={hiddenIds} pendingDraw={gameState.pendingDraw} />
              </div>

              {/* "You" at bottom of circle — on the circle line at 270° */}
              {myPlayer && (() => {
                const rad = (270 * Math.PI) / 180
                const r = 46
                const left = 50 + r * Math.cos(rad)
                const top = 50 - r * Math.sin(rad)
                return (
                  <div data-seat={myPlayer.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                    style={{ left: `${left}%`, top: `${top}%` }}>
                    <PlayerBubble
                      name={myPlayer.name}
                      avatar={avatarOf(myPlayer.id, myPlayer.name)}
                      mood={moodOf({ ...myPlayer, cardCount: hand.length }, isMyTurn)}
                      moodKey={reactions[myPlayer.id]?.key}
                      away={currentRevenge?.attackerId === myPlayer.id}
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
          <div className={`text-center py-1 text-sm shrink-0 relative z-10 ${hand.length > 0 ? '-mb-4' : ''}`}>
            {isMyTurn ? (
              <span className="font-display font-black tracking-wide animate-soft-pulse bg-gradient-to-r from-sunset-300 to-lotus-300 bg-clip-text text-transparent">
                {isMyRoulette
                  ? `Roulette! Draw until you get ${gameState.activeColor?.toUpperCase()}`
                  : iAwaitEndTurn
                  ? 'Play a card or end your turn'
                  : 'Your turn'}
              </span>
            ) : (
              <span className="text-lotus-200/60">{gameState.players[gameState.turnIndex]?.name}'s turn</span>
            )}
          </div>

          {/* Hand + UNO + End Turn */}
          <div className="shrink-0 relative z-30 overflow-visible">
            <div className="flex justify-center gap-3 pt-2">
              {(hand.length <= 2 && hand.length > 0 || iAmCallable) && (
                <button type="button" onClick={callUno}
                  className={`px-8 py-2 rounded-full font-display font-black text-lg tracking-widest shadow-soft transition-all
                    ${iAmCallable ? 'bg-warm-gradient animate-bounce glow-warm' : 'bg-gradient-to-r from-sunset-500 to-sunset-400 hover:scale-105'}
                  `}>
                  UNO!
                </button>
              )}
              {iAwaitEndTurn && (
                <button type="button" onClick={endTurn}
                  className="px-6 py-2 rounded-full font-display font-bold text-sm tracking-widest shadow-soft bg-gradient-to-r from-lotus-500 to-lotus-400 hover:scale-105 active:scale-95 transition-all animate-soft-pulse">
                  End Turn →
                </button>
              )}
            </div>
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
