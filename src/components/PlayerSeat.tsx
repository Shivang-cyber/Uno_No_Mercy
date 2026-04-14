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
        flex flex-col items-center p-2 sm:p-3 rounded-xl min-w-[70px] sm:min-w-[90px] transition-all
        ${isCurrentTurn ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-gray-800/60'}
        ${!player.connected ? 'opacity-50' : ''}
        ${player.isEliminated ? 'opacity-30 line-through' : ''}
        ${isSelf ? 'ring-1 ring-cyan-400' : ''}
      `}
    >
      <div className="text-xs sm:text-sm font-bold truncate max-w-[80px]">
        {player.name}{isSelf ? ' (You)' : ''}
      </div>
      <div className="text-lg sm:text-2xl font-bold mt-1">
        {player.isEliminated ? 'X' : player.cardCount}
      </div>
      <div className="text-[10px] sm:text-xs text-gray-400">
        {player.isEliminated ? 'Out' : `card${player.cardCount !== 1 ? 's' : ''}`}
      </div>
      {!player.connected && (
        <div className="text-[10px] text-yellow-400 mt-1">Reconnecting...</div>
      )}
      {player.cardCount === 1 && !isSelf && onChallenge && (
        <button
          onClick={onChallenge}
          className="mt-1 px-2 py-0.5 bg-red-600 rounded text-[10px] sm:text-xs font-bold hover:bg-red-500"
        >
          UNO?
        </button>
      )}
      {showSwapButton && !isSelf && !player.isEliminated && player.cardCount > 0 && (
        <button
          onClick={onSwapPick}
          className="mt-1 px-2 py-0.5 bg-purple-600 rounded text-[10px] sm:text-xs font-bold hover:bg-purple-500"
        >
          Swap
        </button>
      )}
    </div>
  )
}
