import { useStore } from '../store'
import type { Color, Card as CardType } from '../../shared/types'
import Card from './Card'
import Hand from './Hand'
import PlayerSeat from './PlayerSeat'
import ColorPicker from './ColorPicker'

const activeColorBg: Record<string, string> = {
  red: 'bg-uno-red/30',
  yellow: 'bg-uno-yellow/30',
  green: 'bg-uno-green/30',
  blue: 'bg-uno-blue/30',
}

export default function Table() {
  const {
    gameState, hand, playerId, playCard, draw, callUno, challengeUno,
    pickSwapTarget, pickColor, showColorPicker, showSwapPicker, startGame, error,
  } = useStore()

  if (!gameState) return null

  const isLobby = gameState.phase === 'lobby'
  const isPlaying = gameState.phase === 'playing'
  const isEnded = gameState.phase === 'ended'
  const isHost = gameState.players[0]?.id === playerId
  const myIndex = gameState.players.findIndex(p => p.id === playerId)
  const isMyTurn = isPlaying && gameState.turnIndex === myIndex

  // Determine which cards in hand can be played
  const canPlayCards = new Set<string>()
  if (isMyTurn && hand.length > 0 && gameState.topDiscard) {
    for (const card of hand) {
      if (canPlayCheck(card, gameState)) {
        canPlayCards.add(card.id)
      }
    }
  }

  const handlePlay = (cardId: string) => {
    const card = hand.find(c => c.id === cardId)
    if (!card) return
    // Wild cards need color pick — play without color first, server will ask
    if (card.color === 'wild') {
      playCard(cardId)
    } else {
      playCard(cardId)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Error toast */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-200 px-4 py-2 rounded-lg text-sm z-40">
          {error}
        </div>
      )}

      {/* Color picker modal */}
      {showColorPicker && <ColorPicker onPick={pickColor} />}

      {/* Swap picker modal */}
      {showSwapPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-center mb-4">Pick a player to swap hands with</h3>
            <div className="space-y-2">
              {gameState.players
                .filter(p => p.id !== playerId && !p.isEliminated && p.cardCount > 0)
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => pickSwapTarget(p.id)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors"
                  >
                    {p.name} ({p.cardCount} cards)
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Room code header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 bg-gray-800/80 border-b border-gray-700">
        <div className="text-sm">
          Room: <span className="font-mono font-bold text-cyan-400 text-lg">{gameState.code}</span>
        </div>
        <div className="flex items-center gap-2">
          {gameState.activeColor && (
            <div className={`px-2 py-1 rounded text-xs font-bold ${activeColorBg[gameState.activeColor]} border border-gray-600`}>
              {gameState.activeColor.toUpperCase()}
            </div>
          )}
          {gameState.pendingDraw > 0 && (
            <div className="px-2 py-1 rounded text-xs font-bold bg-red-600/40 border border-red-500">
              +{gameState.pendingDraw} pending
            </div>
          )}
          {isPlaying && (
            <div className="text-xs text-gray-400">
              {gameState.direction === 1 ? 'CW' : 'CCW'} | Deck: {gameState.deckCount}
            </div>
          )}
        </div>
      </div>

      {/* Lobby view */}
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
            <button
              onClick={startGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg transition-colors"
            >
              Start Game
            </button>
          )}
          {isHost && gameState.players.length < 2 && (
            <p className="text-gray-500 text-sm">Need at least 2 players to start</p>
          )}
        </div>
      )}

      {/* Game over */}
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

      {/* Playing view */}
      {isPlaying && (
        <>
          {/* Other players */}
          <div className="flex flex-wrap gap-2 justify-center px-2 sm:px-4 py-2 sm:py-3">
            {gameState.players.map((p, i) => (
              <PlayerSeat
                key={p.id}
                player={p}
                isCurrentTurn={gameState.turnIndex === i}
                isSelf={p.id === playerId}
                onChallenge={() => challengeUno(p.id)}
                onSwapPick={() => pickSwapTarget(p.id)}
                showSwapButton={showSwapPicker}
              />
            ))}
          </div>

          {/* Discard pile + draw */}
          <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 p-4">
            {/* Draw pile */}
            <button
              onClick={draw}
              disabled={!isMyTurn}
              className={`
                relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl bg-gray-800 border-2 border-gray-600
                flex flex-col items-center justify-center
                ${isMyTurn ? 'hover:border-cyan-400 cursor-pointer hover:bg-gray-700' : 'opacity-60 cursor-not-allowed'}
                transition-all
              `}
            >
              <span className="text-2xl sm:text-3xl font-black text-gray-500">?</span>
              <span className="text-[10px] sm:text-xs text-gray-500 mt-1">DRAW</span>
              <span className="absolute -top-2 -right-2 bg-gray-700 text-xs px-1.5 py-0.5 rounded-full border border-gray-600">
                {gameState.deckCount}
              </span>
            </button>

            {/* Discard pile */}
            {gameState.topDiscard && (
              <div className="relative">
                <Card card={gameState.topDiscard} small={false} disabled />
                {gameState.activeColor && gameState.topDiscard.color === 'wild' && (
                  <div
                    className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                      gameState.activeColor === 'red' ? 'bg-uno-red' :
                      gameState.activeColor === 'yellow' ? 'bg-uno-yellow' :
                      gameState.activeColor === 'green' ? 'bg-uno-green' :
                      'bg-uno-blue'
                    }`}
                  >
                    {gameState.activeColor.toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Turn indicator */}
          <div className="text-center py-1 text-sm">
            {isMyTurn ? (
              <span className="text-yellow-400 font-bold animate-pulse">Your turn!</span>
            ) : (
              <span className="text-gray-400">
                {gameState.players[gameState.turnIndex]?.name}'s turn
              </span>
            )}
          </div>

          {/* My hand + actions */}
          <div className="bg-gray-800/80 border-t border-gray-700">
            {/* UNO button */}
            {hand.length <= 2 && isMyTurn && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={callUno}
                  className="px-6 py-1.5 bg-red-600 hover:bg-red-500 rounded-full font-black text-sm animate-bounce"
                >
                  UNO!
                </button>
              </div>
            )}
            <Hand
              cards={hand}
              onPlay={handlePlay}
              isMyTurn={isMyTurn}
              canPlayCards={canPlayCards}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Client-side play check (mirrors server logic for UI hints) ───

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
