import type { PublicPlayerInfo } from '../../shared/types'

interface PlayerSeatProps {
  player: PublicPlayerInfo
  isCurrentTurn: boolean
  isSelf: boolean
  onChallenge?: () => void
  onSwapPick?: () => void
  showSwapButton?: boolean
}

export default function PlayerSeat({
  player, isCurrentTurn, isSelf, onChallenge, onSwapPick, showSwapButton,
}: PlayerSeatProps) {
  return (
    <div
      className={`
        flex flex-col items-center p-1.5 sm:p-2.5 rounded-xl transition-all
        min-w-[60px] sm:min-w-[80px] max-w-[90px] sm:max-w-[110px]
        ${isCurrentTurn ? 'bg-yellow-500/20 ring-2 ring-yellow-400 scale-110' : 'bg-gray-800/70'}
        ${!player.connected ? 'opacity-50' : ''}
        ${player.isEliminated ? 'opacity-30' : ''}
        ${isSelf ? 'ring-1 ring-cyan-400' : ''}
      `}
    >
      <div className={`text-[10px] sm:text-xs font-bold truncate max-w-[70px] sm:max-w-[90px] ${isSelf ? 'text-cyan-300' : ''}`}>
        {player.name}
      </div>

      {/* Card count — big and visible */}
      <div className={`text-xl sm:text-2xl font-black mt-0.5 ${
        player.isEliminated ? 'text-red-500' :
        player.cardCount === 1 ? 'text-red-400 animate-pulse' :
        player.cardCount <= 3 ? 'text-yellow-400' :
        'text-white'
      }`}>
        {player.isEliminated ? 'X' : player.cardCount}
      </div>

      <div className="text-[8px] sm:text-[10px] text-gray-500">
        {player.isEliminated ? 'OUT' : player.cardCount === 1 ? 'UNO!' : 'cards'}
      </div>

      {!player.connected && (
        <div className="text-[8px] text-yellow-400 mt-0.5">offline...</div>
      )}

      {/* UNO challenge button — visible to other players when target has 1 card */}
      {onChallenge && (
        <button
          onClick={(e) => { e.stopPropagation(); onChallenge() }}
          className="mt-1 px-2 py-0.5 bg-red-600 hover:bg-red-500 rounded text-[9px] sm:text-[11px] font-black animate-pulse"
        >
          CATCH!
        </button>
      )}

      {/* Swap pick button */}
      {showSwapButton && onSwapPick && (
        <button
          onClick={(e) => { e.stopPropagation(); onSwapPick() }}
          className="mt-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-500 rounded text-[9px] sm:text-[11px] font-bold"
        >
          Swap
        </button>
      )}
    </div>
  )
}
