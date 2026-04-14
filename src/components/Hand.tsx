import { useState } from 'react'
import type { Card as CardType } from '../../shared/types'
import Card from './Card'

interface HandProps {
  cards: CardType[]
  onPlay: (cardId: string) => void
  isMyTurn: boolean
  canPlayCards: Set<string>
}

export default function Hand({ cards, onPlay, isMyTurn, canPlayCards }: HandProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  if (cards.length === 0) return null

  const ml = cards.length > 12 ? -36 : cards.length > 8 ? -24 : cards.length > 5 ? -14 : -6

  // Wave effect: hovered card pops up the most, neighbors pop less
  function getLift(i: number): number {
    if (hoveredIndex === null) return 0
    const dist = Math.abs(i - hoveredIndex)
    if (dist === 0) return -24  // hovered card
    if (dist === 1) return -14
    if (dist === 2) return -6
    return 0
  }

  function getScale(i: number): number {
    if (hoveredIndex === null) return 1
    const dist = Math.abs(i - hoveredIndex)
    if (dist === 0) return 1.12
    if (dist === 1) return 1.04
    return 1
  }

  return (
    <div className="w-full overflow-x-auto overflow-y-visible pb-2 pt-8">
      <div
        className="flex items-end justify-center min-w-min px-2 sm:px-4 py-2"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {cards.map((card, i) => {
          const playable = isMyTurn && canPlayCards.has(card.id)
          const lift = getLift(i)
          const scale = getScale(i)

          return (
            <div
              key={card.id}
              className="transition-all duration-200 ease-out"
              style={{
                marginLeft: i === 0 ? 0 : ml,
                transform: `translateY(${lift}px) scale(${scale})`,
                zIndex: hoveredIndex !== null ? (hoveredIndex === i ? 50 : 50 - Math.abs(i - hoveredIndex)) : i,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
            >
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
