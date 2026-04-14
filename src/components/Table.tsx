import { useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import type { Color, Card as CardType } from '../../shared/types'
import Card from './Card'
import Hand from './Hand'
import ColorPicker from './ColorPicker'

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

// ── Draw animation ───────────────────────────────────────────────

function DrawAnimation({ count, onDone }: { count: number; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1000 + Math.min(count, 10) * 120)
    return () => clearTimeout(timer)
  }, [count, onDone])

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="bg-black/60 rounded-2xl px-8 py-5 flex flex-col items-center backdrop-blur-sm">
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(count, 10) }).map((_, i) => (
            <div
              key={i}
              className="w-7 h-10 bg-gray-700 border border-gray-500 rounded animate-card-fly"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="text-3xl font-black text-red-400 mt-2 animate-bounce">+{count}</div>
      </div>
    </div>
  )
}

// ── Pass / Swap animations ───────────────────────────────────────

function PassAnimation({ direction, onDone }: { direction: 1 | -1; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="bg-black/60 rounded-2xl px-8 py-5 backdrop-blur-sm flex flex-col items-center animate-fade-in">
        <div className={`text-4xl mb-2 ${direction === 1 ? '' : 'scale-x-[-1]'}`}>&#x21BB;</div>
        <div className="text-lg font-bold text-yellow-300">Hands passed {direction === 1 ? 'clockwise' : 'counter-clockwise'}!</div>
      </div>
    </div>
  )
}

function SwapAnimation({ p1, p2, onDone }: { p1: string; p2: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div className="bg-black/60 rounded-2xl px-8 py-5 backdrop-blur-sm flex flex-col items-center animate-fade-in">
        <div className="text-4xl mb-2">&#x21C4;</div>
        <div className="text-lg font-bold text-purple-300">{p1} swapped hands with {p2}!</div>
      </div>
    </div>
  )
}

// ── Player bubble ────────────────────────────────────────────────

function PlayerBubble({
  name, cardCount, isCurrentTurn, isSelf, connected, isEliminated,
  isCallable, onChallenge, showSwapButton, onSwapPick,
  onKick, kickInfo,
}: {
  name: string; cardCount: number; isCurrentTurn: boolean; isSelf: boolean
  connected: boolean; isEliminated: boolean; isCallable: boolean
  onChallenge?: () => void; showSwapButton?: boolean; onSwapPick?: () => void
  onKick?: () => void; kickInfo?: { votes: number; needed: number }
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
          text-lg sm:text-xl font-black transition-all duration-300
          ${isCurrentTurn ? 'ring-3 ring-yellow-400 bg-yellow-600 scale-110' : 'bg-gray-700'}
          ${!connected ? 'opacity-40' : ''}
          ${isEliminated ? 'opacity-20 bg-red-900' : ''}
          ${isSelf ? 'ring-2 ring-cyan-400' : ''}
          ${cardCount === 1 && !isEliminated ? 'text-red-400 animate-pulse' : 'text-white'}
        `}
      >
        {isEliminated ? 'X' : cardCount}
      </div>
      <span className={`text-[10px] sm:text-xs font-semibold truncate max-w-[60px] ${isSelf ? 'text-cyan-300' : 'text-gray-300'}`}>
        {name}
      </span>
      {cardCount === 1 && !isEliminated && <span className="text-[9px] font-black text-red-400">UNO!</span>}
      {!connected && <span className="text-[8px] text-yellow-500">offline</span>}
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
        className="bg-gray-800/90 border border-gray-600 rounded-r-lg cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {!open && (
          <div className="py-3 px-1 text-[10px] font-bold text-gray-400"
            style={{ writingMode: 'vertical-rl' }}>
            SCORE
          </div>
        )}
        {open && (
          <div className="p-3">
            <h3 className="font-bold text-sm mb-2 text-gray-200">Scoreboard</h3>
            <div className="space-y-1.5 mb-3">
              {players.map(p => (
                <div key={p.id} className={`flex justify-between text-xs ${p.isEliminated ? 'text-red-400 line-through' : 'text-gray-300'}`}>
                  <span className="truncate max-w-[120px]">{p.name}</span>
                  <span className="font-mono font-bold">{scores[p.id] ?? 0}</span>
                </div>
              ))}
            </div>
            <hr className="border-gray-600 mb-2" />
            <h4 className="font-bold text-[10px] text-gray-400 mb-1">SCORING</h4>
            <div className="text-[9px] text-gray-500 space-y-0.5">
              <div>0-9: Face value</div>
              <div>Skip, Reverse, +2, +4, Discard, Skip All: <b>20</b></div>
              <div>Wild Reverse +4, Wild +6, +10, Roulette: <b>50</b></div>
              <div>Knockout bonus: <b>250</b></div>
              <div className="mt-1 text-gray-400">First to <b>1000</b> wins!</div>
            </div>
            <hr className="border-gray-600 my-2" />
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-1.5 bg-red-800 hover:bg-red-700 rounded text-xs font-bold transition-colors"
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
    pickSwapTarget, pickColor, kickVote, logout,
    showColorPicker, showSwapPicker, startGame, error,
  } = useStore()

  const [drawAnim, setDrawAnim] = useState<{ count: number } | null>(null)
  const [passAnim, setPassAnim] = useState<{ direction: 1 | -1 } | null>(null)
  const [swapAnim, setSwapAnim] = useState<{ p1: string; p2: string } | null>(null)
  const [scores] = useState<Record<string, number>>({})
  const events = useStore(s => s.events)

  useEffect(() => {
    if (events.length === 0) return
    const last = events[events.length - 1]
    if (last.event === 'cards_drawn' && last.count > 1) {
      setDrawAnim({ count: last.count })
    } else if (last.event === 'hands_passed') {
      setPassAnim({ direction: last.direction })
    } else if (last.event === 'hands_swapped') {
      const players = gameState?.players ?? []
      const p1Name = players.find(p => p.id === last.playerId)?.name ?? '?'
      const p2Name = players.find(p => p.id === last.targetId)?.name ?? '?'
      setSwapAnim({ p1: p1Name, p2: p2Name })
    }
  }, [events, gameState?.players])

  const clearDrawAnim = useCallback(() => setDrawAnim(null), [])
  const clearPassAnim = useCallback(() => setPassAnim(null), [])
  const clearSwapAnim = useCallback(() => setSwapAnim(null), [])

  if (!gameState) return null

  const isLobby = gameState.phase === 'lobby'
  const isPlaying = gameState.phase === 'playing'
  const isEnded = gameState.phase === 'ended'
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
  const orderedOthers: { id: string; name: string; cardCount: number; connected: boolean; isEliminated: boolean; originalIndex: number }[] = []
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
    <div className="min-h-[100dvh] flex flex-col bg-gray-900">
      {/* Overlays */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-sm z-40 animate-fade-in">
          {error}
        </div>
      )}
      {drawAnim && <DrawAnimation count={drawAnim.count} onDone={clearDrawAnim} />}
      {passAnim && <PassAnimation direction={passAnim.direction} onDone={clearPassAnim} />}
      {swapAnim && <SwapAnimation p1={swapAnim.p1} p2={swapAnim.p2} onDone={clearSwapAnim} />}
      {showColorPicker && <ColorPicker onPick={pickColor} />}

      {showSwapPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-center mb-4">Pick a player to swap hands with</h3>
            <div className="space-y-2">
              {gameState.players
                .filter(p => p.id !== effectivePlayerId && !p.isEliminated && p.cardCount > 0)
                .map(p => (
                  <button type="button" key={p.id} onClick={() => pickSwapTarget(p.id)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors">
                    {p.name} ({p.cardCount} cards)
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 bg-gray-800/90 border-b border-gray-700 shrink-0">
        <div className="text-sm">
          Room: <span className="font-mono font-bold text-cyan-400 text-lg">{gameState.code}</span>
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
              <div key={p.id} className="bg-gray-800 px-4 py-2 rounded-lg">
                <span className="font-bold">{p.name}</span>
                {i === 0 && <span className="text-yellow-400 text-xs ml-2">HOST</span>}
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm">{gameState.players.length}/10 players</p>
          {isHost && gameState.players.length >= 2 && (
            <button type="button" onClick={startGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg transition-colors">
              Start Game
            </button>
          )}
        </div>
      )}

      {/* Game Over */}
      {isEnded && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <h2 className="text-3xl font-black">Game Over!</h2>
          <p className="text-xl">
            Winner: <span className="text-yellow-400 font-bold">
              {gameState.players.find(p => p.id === gameState.winner)?.name ?? '?'}
            </span>
          </p>
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
              <span className="text-yellow-400 font-bold animate-pulse">
                {isMyRoulette
                  ? `Roulette! Keep drawing until you get ${gameState.activeColor?.toUpperCase()}!`
                  : 'Your turn!'}
              </span>
            ) : (
              <span className="text-gray-400">{gameState.players[gameState.turnIndex]?.name}'s turn</span>
            )}
          </div>

          {/* Hand + UNO */}
          <div className="shrink-0 relative z-30 overflow-visible">
            {(hand.length <= 2 && hand.length > 0 || iAmCallable) && (
              <div className="flex justify-center pt-2">
                <button type="button" onClick={callUno}
                  className={`px-8 py-2 rounded-full font-black text-lg shadow-lg transition-all
                    ${iAmCallable ? 'bg-red-600 hover:bg-red-500 animate-bounce ring-2 ring-red-400' : 'bg-red-700 hover:bg-red-600'}
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
