import { useEffect, useRef, useState } from 'react'
import Avatar from '../avatar/Avatar'
import type { AvatarConfig } from '../../shared/avatar'
import { WEAPONS, type RevengeReason, type Weapon } from '../../shared/types'
import { seat, type Point } from '../lib/fx'

export const WEAPON_LABEL: Record<Weapon, string> = {
  mallet: 'Mallet', chicken: 'Chicken', pie: 'Pie', pillow: 'Pillow', cards: 'Card shower',
}

export const WEAPON_SOUND: Record<Weapon, string> = {
  mallet: 'BONK!', chicken: 'SQUAWK!', pie: 'SPLAT!', pillow: 'FWUMP!', cards: 'WHAP!',
}

// ── Weapon drawings (60x60) ──────────────────────────────────────

export function WeaponArt({ weapon, className }: { weapon: Weapon; className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} style={{ overflow: 'visible' }}>
      {weapon === 'mallet' && (
        <g>
          <rect x={27} y={20} width={6} height={38} rx={3} fill="#c58b4b" />
          <rect x={6} y={4} width={48} height={22} rx={10} fill="#ff8fb1" stroke="#e5679a" strokeWidth={2} />
          <rect x={14} y={4} width={5} height={22} fill="#ffc2d4" />
          <rect x={41} y={4} width={5} height={22} fill="#ffc2d4" />
        </g>
      )}
      {weapon === 'chicken' && (
        <g>
          <path d="M26,56 L26,48 M34,56 L34,48" stroke="#f39c12" strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={30} cy={34} rx={13} ry={17} fill="#ffd23f" stroke="#e0a800" strokeWidth={2} />
          <circle cx={30} cy={13} r={8} fill="#ffd23f" stroke="#e0a800" strokeWidth={2} />
          <path d="M25,6 Q27,0 30,5 Q32,-1 35,6" fill="#e74c3c" />
          <path d="M37,13 L45,15 L37,17 Z" fill="#f39c12" />
          <circle cx={32} cy={11} r={1.6} fill="#1a1426" />
        </g>
      )}
      {weapon === 'pie' && (
        <g>
          <ellipse cx={30} cy={42} rx={27} ry={7} fill="#e8e3ef" stroke="#c9c2d6" strokeWidth={1.5} />
          <ellipse cx={30} cy={36} rx={22} ry={9} fill="#d9a35b" />
          <path d="M10,34 C12,22 22,20 30,22 C38,18 50,22 50,34 C44,38 16,38 10,34 Z" fill="#fffaf0" stroke="#efdcb8" strokeWidth={1.5} />
          <circle cx={31} cy={20} r={4} fill="#d6203a" />
        </g>
      )}
      {weapon === 'pillow' && (
        <g>
          <rect x={4} y={14} width={52} height={32} rx={13} fill="#f3f0ff" stroke="#c9b8ff" strokeWidth={2} />
          <rect x={10} y={20} width={40} height={20} rx={8} fill="none" stroke="#c9b8ff" strokeWidth={1.2} strokeDasharray="3 3" />
        </g>
      )}
      {weapon === 'cards' && (
        <g>
          {[-18, 0, 18].map((r, i) => (
            <g key={i} transform={`rotate(${r} 30 54)`}>
              <rect x={20} y={12} width={20} height={30} rx={3} fill="#c0392b" stroke="#fff" strokeWidth={1.5} />
              <ellipse cx={30} cy={27} rx={6} ry={10} fill="#f1c40f" transform="rotate(25 30 27)" />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

// ── "Get revenge?" prompt (only the victim sees it) ──────────────

const REASON_TEXT: Record<RevengeReason, (name: string, count?: number) => string> = {
  stack: (n, c) => `${n} made you draw ${c ?? 'a pile of'} cards!`,
  uno: n => `${n} caught you on UNO!`,
  swap: n => `${n} stuck you with a bigger hand!`,
  skip: n => `${n} skipped everyone!`,
}

export function RevengePrompt({ targetName, reason, count, expiresAt, ttlMs, onPick, onDismiss }: {
  targetName: string
  reason: RevengeReason
  count?: number
  expiresAt: number
  ttlMs: number
  onPick: (w: Weapon) => void
  onDismiss: () => void
}) {
  const remaining = Math.max(0, expiresAt - Date.now())
  const [started, setStarted] = useState(false)
  useEffect(() => { const t = requestAnimationFrame(() => setStarted(true)); return () => cancelAnimationFrame(t) }, [])

  return (
    <div className="fixed bottom-44 inset-x-0 mx-auto w-fit z-50 animate-rise">
      <div className="glass rounded-2xl px-4 pt-3 pb-3 shadow-glow-sunset border border-sunset-400/40">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-sm text-lotus-100">
            <span className="font-bold">{REASON_TEXT[reason](targetName, count)}</span>
            <span className="text-sunset-300 font-display font-black ml-2">Get revenge?</span>
          </div>
          <button type="button" onClick={onDismiss} className="ml-auto w-7 h-7 rounded-full bg-ink-700/60 hover:bg-ink-600 text-xs" title="Let it go">✕</button>
        </div>
        <div className="flex gap-2">
          {WEAPONS.map(w => (
            <button key={w} type="button" onClick={() => onPick(w)}
              className="w-[72px] rounded-xl bg-ink-700/60 hover:bg-sunset-500/30 hover:scale-105 active:scale-95 transition-all flex flex-col items-center py-1.5 border border-white/10">
              <WeaponArt weapon={w} className="w-9 h-9" />
              <span className="text-[10px] font-bold text-lotus-100 mt-0.5">{WEAPON_LABEL[w]}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 h-1 rounded-full bg-ink-700 overflow-hidden">
          <div className="h-full bg-warm-gradient"
            style={{ width: started ? '0%' : `${(remaining / ttlMs) * 100}%`, transition: `width ${remaining}ms linear` }} />
        </div>
      </div>
    </div>
  )
}

// ── The scene: walk over, hit, walk back ─────────────────────────

const WALK_MS = 1100
const WINDUP_MS = 250
const HOLD_MS = 450
const BACK_MS = 1000
const IMPACT_AT = WALK_MS + WINDUP_MS
const DONE_AT = IMPACT_AT + HOLD_MS + BACK_MS

const WALKER_W = 104
const WALKER_H = 156
// Where the weapon's centre sits relative to the walker's anchor point (facing right)
const WEAPON_OFFSET = { x: WALKER_W * 0.18 + 24, y: -WALKER_H * 0.62 + 18 }

export function RevengeScene({ attackerId, targetId, weapon, attacker, onImpact, onDone }: {
  attackerId: string
  targetId: string
  weapon: Weapon
  attacker: AvatarConfig
  onImpact: (at: Point, hand: Point) => void
  onDone: () => void
}) {
  const walkerRef = useRef<HTMLDivElement>(null)
  const weaponRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'out' | 'hit' | 'back'>('out')
  const [geo, setGeo] = useState<{ from: Point; stop: Point; to: Point; facing: 1 | -1 } | null>(null)
  // Callbacks change on every table render; the timeline must not restart
  const cb = useRef({ onImpact, onDone })
  cb.current = { onImpact, onDone }

  useEffect(() => {
    const from = seat(attackerId)
    const to = seat(targetId)
    if (!from || !to) { cb.current.onDone(); return }
    const facing: 1 | -1 = to.x - from.x >= 0 ? 1 : -1
    // Stand so the weapon (held up by the walker's shoulder) comes down on the target's head
    const stop = {
      x: to.x - facing * (WEAPON_OFFSET.x + 12),
      y: to.y - 18 - WEAPON_OFFSET.y,
    }
    setGeo({ from, stop, to, facing })

    const timers = [
      setTimeout(() => setPhase('hit'), WALK_MS),
      setTimeout(() => {
        const w = weaponRef.current?.getBoundingClientRect()
        const hand = w ? { x: w.left + w.width / 2, y: w.top + w.height / 2 } : stop
        cb.current.onImpact(to, hand)
      }, IMPACT_AT),
      setTimeout(() => setPhase('back'), IMPACT_AT + HOLD_MS),
      setTimeout(() => cb.current.onDone(), DONE_AT),
    ]
    return () => timers.forEach(clearTimeout)
  }, [attackerId, targetId])

  // Path: seat -> beside target -> (hold) -> seat
  useEffect(() => {
    if (!geo || !walkerRef.current) return
    const { from, stop } = geo
    const at = (p: Point) => `translate(${p.x - WALKER_W / 2}px, ${p.y - WALKER_H * 0.62}px)`
    walkerRef.current.animate(
      [
        { transform: at(from), opacity: 0, offset: 0 },
        { transform: at(from), opacity: 1, offset: 0.04 },
        { transform: at(stop), offset: WALK_MS / DONE_AT, easing: 'linear' },
        { transform: at(stop), offset: (IMPACT_AT + HOLD_MS) / DONE_AT },
        { transform: at(from), opacity: 1, offset: 0.96 },
        { transform: at(from), opacity: 0, offset: 1 },
      ],
      { duration: DONE_AT, fill: 'both', easing: 'ease-in-out' },
    )
  }, [geo])

  // Weapon swing at the hit
  useEffect(() => {
    if (phase !== 'hit' || !weaponRef.current) return
    const swing = weapon === 'pie' || weapon === 'cards'
      ? [{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(-12px) rotate(-20deg)', offset: 0.6 }, { transform: 'translateX(46px) rotate(10deg)', opacity: weapon === 'cards' ? 0 : 1 }]
      : [{ transform: 'rotate(0)' }, { transform: 'rotate(-75deg)', offset: 0.6 }, { transform: 'rotate(80deg)' }]
    weaponRef.current.animate(swing, { duration: WINDUP_MS + 80, easing: 'cubic-bezier(.5,0,.3,1.4)', fill: 'forwards' })
  }, [phase, weapon])

  if (!geo) return null
  // Face the way we're walking: towards the target on the way out, home on the way back
  const facing = phase === 'back' ? -geo.facing : geo.facing
  const usedUp = phase === 'back' && (weapon === 'pie' || weapon === 'cards')

  return (
    <div className="fixed inset-0 z-[55] pointer-events-none">
      <div ref={walkerRef} className="absolute left-0 top-0" style={{ width: WALKER_W, height: WALKER_H }}>
        <div className="relative w-full h-full transition-transform duration-200" style={{ transform: `scaleX(${facing})` }}>
          <Avatar config={attacker} mood={phase === 'back' ? 'smug' : 'tantrum'} variant="full" walking={phase !== 'hit'} className="w-full h-full drop-shadow-[0_10px_12px_rgba(0,0,0,.5)]" />
          {!usedUp && (
            <div ref={weaponRef} className="absolute w-12 h-12" style={{ left: WALKER_W * 0.68, top: -6, transformOrigin: '20% 90%' }}>
              <WeaponArt weapon={weapon} className="w-full h-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
