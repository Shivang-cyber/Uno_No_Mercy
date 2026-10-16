import { useLayoutEffect, useRef, useState } from 'react'
import type { Card as CardType } from '../../shared/types'
import Card from './Card'
import { handArrival, snapshotHand } from '../lib/fx'

interface HandProps {
  cards: CardType[]
  onPlay: (cardId: string) => void
  isMyTurn: boolean
  canPlayCards: Set<string>
}

export default function Hand({ cards, onPlay, isMyTurn, canPlayCards }: HandProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const innerRefs = useRef(new Map<string, HTMLDivElement>())
  const prevLefts = useRef<Map<string, number> | null>(null)

  // FLIP: cards that stay slide from their old slot; new cards flip in with a glow.
  useLayoutEffect(() => {
    const lefts = new Map<string, number>()
    slotRefs.current.forEach((el, id) => lefts.set(id, el.offsetLeft))
    const prev = prevLefts.current
    prevLefts.current = lefts

    const entryDelay = Math.max(0, handArrival.at - performance.now())
    let newIdx = 0
    for (const card of cards) {
      const inner = innerRefs.current.get(card.id)
      const left = lefts.get(card.id)
      if (!inner || left === undefined) continue
      const before = prev?.get(card.id)
      if (before !== undefined) {
        const dx = before - left
        if (Math.abs(dx) > 1) {
          inner.animate(
            [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
            { duration: 320, easing: 'cubic-bezier(.2,.8,.3,1)' },
          )
        }
      } else {
        inner.animate(
          [
            { opacity: 0, transform: 'translateY(-46px) perspective(600px) rotateY(90deg) scale(.8)', filter: 'drop-shadow(0 0 0 rgba(253,196,138,0))' },
            { opacity: 1, transform: 'translateY(-10px) perspective(600px) rotateY(0) scale(1.08)', filter: 'drop-shadow(0 0 16px rgba(253,196,138,.95))', offset: 0.6 },
            { opacity: 1, transform: 'none', filter: 'drop-shadow(0 0 0 rgba(253,196,138,0))' },
          ],
          { duration: 480, delay: entryDelay + Math.min(newIdx * 45, 600), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' },
        )
        newIdx++
      }
    }
  }, [cards])

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
    <div className="w-full overflow-x-auto overflow-y-visible pb-2 pt-8" data-anchor="hand">
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
              ref={el => { if (el) slotRefs.current.set(card.id, el); else slotRefs.current.delete(card.id) }}
              className="transition-all duration-200 ease-out"
              style={{
                marginLeft: i === 0 ? 0 : ml,
                transform: `translateY(${lift}px) scale(${scale})`,
                zIndex: hoveredIndex !== null ? (hoveredIndex === i ? 50 : 50 - Math.abs(i - hoveredIndex)) : i,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
            >
              <div
                ref={el => { if (el) innerRefs.current.set(card.id, el); else innerRefs.current.delete(card.id) }}
                data-hand-card={card.id}
              >
                <Card
                  card={card}
                  onClick={() => {
                    if (!playable) return
                    snapshotHand()
                    onPlay(card.id)
                  }}
                  dimmed={!playable}
                  disabled={!isMyTurn}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
