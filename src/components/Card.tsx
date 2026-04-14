import type { Card as CardType } from '../../shared/types'

interface CardProps {
  card: CardType
  onClick?: () => void
  selected?: boolean
  small?: boolean
  disabled?: boolean  // non-interactive (discard pile) — fully opaque, no pointer
  dimmed?: boolean    // unplayable in hand — visually grayed out
}

const colorBorder: Record<string, string> = {
  red: 'border-uno-red',
  yellow: 'border-uno-yellow',
  green: 'border-uno-green',
  blue: 'border-uno-blue',
  wild: 'border-purple-500',
}

export default function Card({ card, onClick, selected, small, disabled, dimmed }: CardProps) {
  const size = small ? 'w-14 h-22 sm:w-16 sm:h-26' : 'w-18 h-28 sm:w-22 sm:h-34'

  return (
    <button
      type="button"
      onClick={!disabled && !dimmed ? onClick : undefined}
      disabled={disabled || dimmed}
      className={`
        ${size} rounded-lg border-2 overflow-hidden transition-all duration-150
        ${colorBorder[card.color] ?? 'border-gray-600'}
        ${selected ? '-translate-y-3 ring-2 ring-white shadow-lg' : ''}
        ${!disabled && !dimmed ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer' : 'cursor-default'}
        flex-shrink-0 bg-black
      `}
      style={dimmed ? { filter: 'brightness(0.35)' } : undefined}
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
