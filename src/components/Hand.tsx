import type { Card as CardType } from '../../shared/types'
import Card from './Card'

interface HandProps {
  cards: CardType[]
  onPlay: (cardId: string) => void
  isMyTurn: boolean
  canPlayCards: Set<string>
}

export default function Hand({ cards, onPlay, isMyTurn, canPlayCards }: HandProps) {
  if (cards.length === 0) return null

  const overlapClass = cards.length > 10
    ? '-ml-8 sm:-ml-6 first:ml-0'
    : cards.length > 6
    ? '-ml-6 sm:-ml-4 first:ml-0'
    : '-ml-3 sm:-ml-2 first:ml-0'

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-end justify-center min-w-min px-2 sm:px-4 py-2">
        {cards.map((card) => {
          const playable = isMyTurn && canPlayCards.has(card.id)
          return (
            <div key={card.id} className={overlapClass}>
              <Card
                card={card}
                onClick={() => playable && onPlay(card.id)}
                dimmed={!playable}
                disabled={!isMyTurn}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
