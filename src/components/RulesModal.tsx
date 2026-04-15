import { useEffect } from 'react'

interface RuleEntry {
  name: string
  image: string  // one sample card image to preview this rule
  effect: string
  category: 'number' | 'action' | 'wild' | 'special'
}

// One representative image per rule type
const RULES: RuleEntry[] = [
  // Numbers
  {
    name: 'Number Cards (1-6, 8, 9)',
    image: 'Red/red_5.jpg',
    effect: 'Match by color or number.',
    category: 'number',
  },
  {
    name: '0 — 0\'s Pass',
    image: 'Yellow/yellow_0.jpg',
    effect: 'All players pass their entire hand to the next player in the current direction.',
    category: 'number',
  },
  {
    name: '7 — 7\'s Swap',
    image: 'Green/green_7.jpg',
    effect: 'Swap your entire hand with any player of your choice.',
    category: 'number',
  },

  // Colored action cards
  {
    name: 'Skip',
    image: 'Blue/blue_skip.jpg',
    effect: 'Next player loses their turn.',
    category: 'action',
  },
  {
    name: 'Reverse',
    image: 'Red/red_reverse.jpg',
    effect: 'Direction of play reverses.',
    category: 'action',
  },
  {
    name: 'Draw 2 (+2)',
    image: 'Yellow/yellow_+2.jpg',
    effect: 'Next player draws 2 and loses their turn. Can be stacked.',
    category: 'action',
  },
  {
    name: 'Draw 4 (+4)',
    image: 'Green/green_+4.jpg',
    effect: 'Next player draws 4 and loses their turn. Can be stacked.',
    category: 'action',
  },
  {
    name: 'Discard All',
    image: 'Blue/blue_discard.jpg',
    effect: 'Discard every card from your hand matching this card\'s color.',
    category: 'action',
  },
  {
    name: 'Skip Everyone',
    image: 'Red/red_skip_all.jpg',
    effect: 'Skip all other players. You take another turn.',
    category: 'action',
  },

  // Wild cards
  {
    name: 'Wild Reverse +4',
    image: 'Wild/wild_reverse_+4.jpg',
    effect: 'Reverse direction + next player draws 4 and loses their turn. You pick the new color.',
    category: 'wild',
  },
  {
    name: 'Wild +6',
    image: 'Wild/wild_+6.jpg',
    effect: 'Next player draws 6 and loses their turn. You pick the new color. Stackable.',
    category: 'wild',
  },
  {
    name: 'Wild +10',
    image: 'Wild/wild_+10.jpg',
    effect: 'Next player draws 10 and loses their turn. You pick the new color. Stackable.',
    category: 'wild',
  },
  {
    name: 'Wild Color Roulette',
    image: 'Wild/wild_roulette.jpg',
    effect: 'Next player draws cards until they reveal a card of your chosen color. They keep all drawn cards.',
    category: 'wild',
  },
]

const SPECIAL_RULES = [
  {
    name: 'Stacking',
    description: 'On a Draw card (+2, +4, +6, +10), play an equal-or-higher Draw card to pass the penalty to the next player. Penalties compound.',
  },
  {
    name: 'Mercy Rule',
    description: 'If you ever hit 25+ cards in your hand, you\'re eliminated from the game.',
  },
  {
    name: 'UNO Call',
    description: 'When you\'re down to 1 card, press UNO. Other players can "catch" you if you forgot — they force you to draw 2.',
  },
  {
    name: 'Draw When Stuck',
    description: 'If you can\'t play any card, draw one from the pile. Your turn ends.',
  },
  {
    name: 'Placement',
    description: 'First to empty their hand = 1st place. Game continues until only one player still has cards. Get 25+ cards and you\'re out.',
  },
]

const CATEGORY_LABELS: Record<RuleEntry['category'], string> = {
  number: 'Number Cards',
  action: 'Colored Action Cards',
  wild: 'Wild Cards',
  special: 'Special Rules',
}

export default function RulesModal({ onClose }: { onClose: () => void }) {
  // Close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const categories: RuleEntry['category'][] = ['number', 'action', 'wild']

  return (
    <div
      className="fixed inset-0 z-[80] bg-ink-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass rounded-3xl p-5 sm:p-7 max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl sm:text-3xl font-black bg-gradient-to-r from-sunset-300 to-lotus-400 bg-clip-text text-transparent">
            Rules & Cards
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-ink-700/60 hover:bg-sunset-500/30 flex items-center justify-center text-lg transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {categories.map(cat => (
          <section key={cat} className="mb-6">
            <h3 className="font-display text-sm font-black text-lotus-300 tracking-[0.2em] mb-3 uppercase">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RULES.filter(r => r.category === cat).map(rule => (
                <div key={rule.name} className="flex gap-3 glass-soft rounded-xl p-3">
                  <img
                    src={`/cards/${rule.image}`}
                    alt={rule.name}
                    className="w-14 h-20 rounded-md shadow-lg flex-shrink-0 border border-white/10"
                  />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-lotus-100 mb-0.5">{rule.name}</div>
                    <div className="text-xs text-lotus-200/70 leading-snug">{rule.effect}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h3 className="font-display text-sm font-black text-lotus-300 tracking-[0.2em] mb-3 uppercase">
            Special Rules
          </h3>
          <div className="space-y-2">
            {SPECIAL_RULES.map(rule => (
              <div key={rule.name} className="glass-soft rounded-xl p-3">
                <div className="font-display font-bold text-sm text-sunset-300 mb-0.5">{rule.name}</div>
                <div className="text-xs text-lotus-200/80 leading-snug">{rule.description}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-lotus-300/50">
          Press <kbd className="px-1.5 py-0.5 bg-ink-700/60 rounded border border-white/10 font-mono">Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  )
}

// ── Floating "Rules" button (corner-positioned) ──────────────────

export function RulesButton({ onClick, position = 'bottom-left' }: {
  onClick: () => void
  position?: 'bottom-left' | 'top-right'
}) {
  const posClass = position === 'top-right'
    ? 'top-4 right-4'
    : 'bottom-4 left-4'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed ${posClass} z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-mint-400 to-mint-500 hover:scale-110 active:scale-95 shadow-soft flex items-center justify-center text-xl sm:text-2xl border border-white/20 transition-all`}
      title="Rules"
      aria-label="Show rules"
    >
      📖
    </button>
  )
}
