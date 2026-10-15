import { useRef, useState } from 'react'
import Avatar, { type Mood } from './Avatar'
import { PRESETS } from './presets'
import {
  SKIN_TONES, HAIR_COLOURS, SHIRT_COLOURS, HEADS, HAIRS, EYES, BROWS, MOUTHS, EXTRAS,
  randomAvatar, type AvatarConfig,
} from '../../shared/avatar'

type Tab = 'presets' | 'face' | 'hair' | 'eyes' | 'mouth' | 'clothes' | 'extras' | 'photo'

const TABS: { id: Tab; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'face', label: 'Face' },
  { id: 'hair', label: 'Hair' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'clothes', label: 'Clothes' },
  { id: 'extras', label: 'Extras' },
  { id: 'photo', label: 'Photo' },
]

const DEMO_MOODS: { mood: Mood; label: string }[] = [
  { mood: 'idle', label: 'Idle' },
  { mood: 'smug', label: 'Smug' },
  { mood: 'shock', label: 'Shocked' },
  { mood: 'gloom', label: 'Gloomy' },
  { mood: 'facepalm', label: 'Facepalm' },
  { mood: 'tantrum', label: 'Tantrum' },
  { mood: 'celebrate', label: 'Celebrate' },
]

const LABELS: Record<string, string> = {
  none: 'None', sidepart: 'Side part', sunglasses: 'Shades', headphones: 'Headphones', moustache: 'Moustache',
}
const label = (v: string) => LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1)

// Shrink an uploaded photo to a small centre-cropped square so it stays light on the wire.
async function photoToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const size = 192
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    const side = Math.min(img.width, img.height)
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function presetSnippet(a: AvatarConfig): string {
  const copy: AvatarConfig = { ...a }
  // Uploaded photos are data URLs; a preset should point at a file instead.
  const photoNote = copy.photo?.startsWith('data:') ? ' // put the photo in public/avatars/faces/ and point to it' : ''
  if (copy.photo?.startsWith('data:')) copy.photo = '/avatars/faces/REPLACE_ME.jpg'
  return `  {\n    name: 'New character',\n    avatar: ${JSON.stringify(copy).replace(/"([a-zA-Z]+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=\w)/g, ', ')},${photoNote}\n  },\n`
}

function Swatches({ colours, value, onPick }: { colours: readonly string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colours.map(c => (
        <button key={c} type="button" onClick={() => onPick(c)} title={c}
          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-white scale-110 shadow-glow-lotus' : 'border-white/15'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  )
}

function Options<K extends keyof AvatarConfig>({ field, values, current, onPick, preview }: {
  field: K
  values: readonly string[]
  current: AvatarConfig
  onPick: (patch: Partial<AvatarConfig>) => void
  preview?: Partial<AvatarConfig>  // tweaks for thumbnails only, e.g. hide a hat over hair styles
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {values.map(v => {
        const selected = current[field] === v
        return (
          <button key={v} type="button" onClick={() => onPick({ [field]: v } as Partial<AvatarConfig>)}
            className={`rounded-xl p-1 flex flex-col items-center transition-all ${selected ? 'bg-lotus-500/30 ring-2 ring-lotus-300' : 'bg-ink-700/50 hover:bg-ink-600/70'}`}>
            <div className="w-14 h-14 rounded-full overflow-hidden bg-ink-600/70">
              <Avatar config={{ ...current, ...preview, [field]: v, photo: undefined, photoMoods: undefined }} className="w-full h-full" />
            </div>
            <span className="text-[10px] mt-0.5 text-lotus-200/80">{label(v)}</span>
          </button>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="font-display font-bold text-[11px] tracking-widest text-lotus-300/70 mb-2 uppercase">{title}</h4>
      {children}
    </div>
  )
}

export default function AvatarEditor({ initial, onSave, onClose }: {
  initial: AvatarConfig
  onSave: (a: AvatarConfig) => void
  onClose: () => void
}) {
  const [a, setA] = useState<AvatarConfig>(initial)
  const [tab, setTab] = useState<Tab>('presets')
  const [demo, setDemo] = useState<{ mood: Mood; key: number }>({ mood: 'idle', key: 0 })
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const patch = (p: Partial<AvatarConfig>) => setA(prev => ({ ...prev, ...p }))

  const copyPreset = async () => {
    const text = presetSnippet(a)
    try {
      await navigator.clipboard.writeText(text)
      setCopied('ok')
    } catch {
      console.log(text)
      setCopied('failed')
    }
    setTimeout(() => setCopied(null), 2500)
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)
    try {
      const photo = await photoToDataUrl(file)
      patch({ photo, photoMoods: undefined })
    } catch {
      setPhotoError("Couldn't read that image. Try a JPG or PNG.")
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-ink-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="glass rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-soft" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="font-display text-xl font-black text-lotus-100">Your character</h3>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-ink-700/60 hover:bg-sunset-500/30 text-lg">✕</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 px-6 pb-4 overflow-y-auto">
          {/* Preview */}
          <div className="sm:w-56 shrink-0 flex flex-col items-center">
            <div className="relative w-full h-64 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(178,134,255,.25),transparent_70%)] flex items-end justify-center">
              <Avatar key={demo.key} config={a} mood={demo.mood} cards={5} variant="full" className="w-40 h-60" />
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {DEMO_MOODS.map(m => (
                <button key={m.mood} type="button" onClick={() => setDemo({ mood: m.mood, key: Math.random() })}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${demo.mood === m.mood ? 'bg-sunset-500/80 text-white' : 'bg-ink-700/60 text-lotus-200/80 hover:bg-ink-600'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-4">
              {TABS.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all ${tab === t.id ? 'bg-lotus-500/40 text-white' : 'text-lotus-200/70 hover:bg-ink-600/60'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'presets' && (
              PRESETS.length === 0
                ? <p className="text-sm text-lotus-200/60">No presets yet. Build one, then use Copy as preset.</p>
                : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {PRESETS.map(p => (
                      <button key={p.name} type="button" onClick={() => setA({ ...p.avatar })}
                        className="rounded-2xl p-2 bg-ink-700/50 hover:bg-ink-600/70 flex flex-col items-center transition-all hover:scale-[1.03]">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-ink-600/70">
                          <Avatar config={p.avatar} className="w-full h-full" />
                        </div>
                        <span className="text-[11px] mt-1 text-lotus-100 text-center leading-tight">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )
            )}

            {tab === 'face' && (
              <>
                <Section title="Skin"><Swatches colours={SKIN_TONES} value={a.skin} onPick={skin => patch({ skin })} /></Section>
                <Section title="Head shape"><Options field="head" values={HEADS} current={a} onPick={patch} /></Section>
              </>
            )}

            {tab === 'hair' && (
              <>
                <Section title="Colour"><Swatches colours={HAIR_COLOURS} value={a.hairColour} onPick={hairColour => patch({ hairColour })} /></Section>
                <Section title="Style"><Options field="hair" values={HAIRS} current={a} onPick={patch} preview={{ extra: 'none' }} /></Section>
              </>
            )}

            {tab === 'eyes' && (
              <>
                <Section title="Eyes"><Options field="eyes" values={EYES} current={a} onPick={patch} /></Section>
                <Section title="Eyebrows"><Options field="brows" values={BROWS} current={a} onPick={patch} /></Section>
              </>
            )}

            {tab === 'mouth' && <Section title="Mouth"><Options field="mouth" values={MOUTHS} current={a} onPick={patch} /></Section>}

            {tab === 'clothes' && <Section title="Shirt colour"><Swatches colours={SHIRT_COLOURS} value={a.shirt} onPick={shirt => patch({ shirt })} /></Section>}

            {tab === 'extras' && <Section title="Extras"><Options field="extra" values={EXTRAS} current={a} onPick={patch} /></Section>}

            {tab === 'photo' && (
              <Section title="Face photo">
                <p className="text-sm text-lotus-200/70 mb-3">
                  Your photo is cropped into the head shape. A front-facing photo with your face in the middle works best.
                </p>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-400 font-display font-bold text-sm shadow-glow-lotus">
                    {a.photo ? 'Change photo' : 'Upload photo'}
                  </button>
                  {a.photo && (
                    <button type="button" onClick={() => patch({ photo: undefined, photoMoods: undefined })}
                      className="px-4 py-2 rounded-xl bg-ink-600/60 hover:bg-sunset-500/30 border border-white/10 text-sm font-semibold">
                      Use drawn face
                    </button>
                  )}
                </div>
                {photoError && <p className="text-sm text-sunset-300 mt-2">{photoError}</p>}
              </Section>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-white/5">
          <button type="button" onClick={() => setA({ ...randomAvatar() })}
            className="px-4 py-2 rounded-xl bg-ink-600/60 hover:bg-ink-500/70 border border-white/10 text-sm font-semibold">
            🎲 Randomise
          </button>
          <button type="button" onClick={copyPreset}
            className="px-4 py-2 rounded-xl bg-ink-600/60 hover:bg-ink-500/70 border border-white/10 text-sm font-semibold">
            {copied === 'ok' ? 'Copied!' : copied === 'failed' ? 'Copy failed, see console' : 'Copy as preset'}
          </button>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-lotus-200/70 hover:text-white">Cancel</button>
          <button type="button" onClick={() => onSave(a)}
            className="px-6 py-2 rounded-xl bg-warm-gradient font-display font-bold shadow-glow-sunset hover:scale-[1.03] active:scale-[0.98] transition-all">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
