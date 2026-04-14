import type { Color } from '../../shared/types'

interface ColorPickerProps {
  onPick: (color: Color) => void
  title?: string
}

const colors: { color: Color; bg: string; label: string }[] = [
  { color: 'red', bg: 'bg-uno-red', label: 'Red' },
  { color: 'yellow', bg: 'bg-uno-yellow', label: 'Yellow' },
  { color: 'green', bg: 'bg-uno-green', label: 'Green' },
  { color: 'blue', bg: 'bg-uno-blue', label: 'Blue' },
]

export default function ColorPicker({ onPick, title = 'Pick a color' }: ColorPickerProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-center mb-4">{title}</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.map(c => (
            <button
              key={c.color}
              onClick={() => onPick(c.color)}
              className={`${c.bg} text-white font-bold py-4 rounded-lg text-lg hover:opacity-80 transition-opacity`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
