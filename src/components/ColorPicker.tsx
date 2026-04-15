import type { Color } from '../../shared/types'

interface ColorPickerProps {
  onPick: (color: Color) => void
  title?: string
}

const colors: { color: Color; bg: string; label: string }[] = [
  { color: 'red', bg: 'bg-uno-red', label: 'Red' },
  { color: 'yellow', bg: 'bg-uno-yellow text-black', label: 'Yellow' },
  { color: 'green', bg: 'bg-uno-green', label: 'Green' },
  { color: 'blue', bg: 'bg-uno-blue', label: 'Blue' },
]

export default function ColorPicker({ onPick, title = 'Pick a color' }: ColorPickerProps) {
  return (
    <div className="fixed inset-0 bg-ink-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 max-w-sm w-full shadow-soft">
        <h3 className="font-display text-lg font-black text-center mb-5 text-lotus-200 tracking-wide">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.map(c => (
            <button
              type="button"
              key={c.color}
              onClick={() => onPick(c.color)}
              className={`${c.bg} text-white font-display font-black py-5 rounded-xl text-lg hover:scale-105 active:scale-95 transition-all shadow-soft border border-white/10`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
