import type { Card as CardType, Color } from '../../shared/types'

interface CardProps {
  card: CardType
  onClick?: () => void
  selected?: boolean
  small?: boolean
  disabled?: boolean
}

const colorBorder: Record<string, string> = {
  red: 'border-uno-red',
  yellow: 'border-uno-yellow',
  green: 'border-uno-green',
  blue: 'border-uno-blue',
  wild: 'border-purple-500',
}

export default function Card({ card, onClick, selected, small, disabled }: CardProps) {
  const size = small ? 'w-14 h-20 sm:w-16 sm:h-24' : 'w-16 h-24 sm:w-20 sm:h-30'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${size} rounded-lg border-2 overflow-hidden transition-all duration-150
        ${colorBorder[card.color] ?? 'border-gray-600'}
        ${selected ? '-translate-y-3 ring-2 ring-white shadow-lg' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-md cursor-pointer'}
        flex-shrink-0
      `}
    >
      <img
        src={`/cards/${card.image}`}
        alt={`${card.color} ${card.value}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </button>
  )
}

export function CardBack({ small }: { small?: boolean }) {
  const size = small ? 'w-10 h-14 sm:w-12 sm:h-18' : 'w-14 h-20 sm:w-16 sm:h-24'
  return (
    <div className={`${size} rounded-lg bg-gray-800 border-2 border-gray-600 flex items-center justify-center flex-shrink-0`}>
      <span className="text-xl font-bold text-gray-500">?</span>
    </div>
  )
}
