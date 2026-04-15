import { useEffect, useState } from 'react'

export const EMOTES = [
  '😂', '🤣', '🤡', '💀', '🔥',
  '👀', '😭', '🙄', '😤', '🥱',
  '🤔', '🤯', '🥳', '😎', '👑',
  '👏', '🤝', '🖕', '💩', '🎯',
  '⚡', '💯', '🚀', '🤞', '🤌',
] as const


// Giphy API key — read from env (set VITE_GIPHY_KEY in .env)
// Fallback to the public beta key (rate-limited, may or may not work)
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || 'dc6zaTOxFJmzC'

interface GifItem {
  id: string
  url: string
  label: string
}

const TRENDING_CACHE_KEY = 'giphy_trending_cache'
const TRENDING_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

function readTrendingCache(): GifItem[] | null {
  try {
    const raw = localStorage.getItem(TRENDING_CACHE_KEY)
    if (!raw) return null
    const { items, ts } = JSON.parse(raw)
    if (Date.now() - ts > TRENDING_CACHE_TTL) return null
    return items
  } catch {
    return null
  }
}

function writeTrendingCache(items: GifItem[]) {
  try {
    localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({ items, ts: Date.now() }))
  } catch { /* ignore quota */ }
}

async function trendingGiphy(): Promise<{ items: GifItem[]; error?: string }> {
  // Check daily cache first
  const cached = readTrendingCache()
  if (cached) return { items: cached }

  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=5`
    const res = await fetch(url)
    if (!res.ok) return { items: [], error: `Giphy error ${res.status}` }
    const data = await res.json()
    const items: GifItem[] = (data.data ?? []).map((g: any) => ({
      id: g.id,
      url: g.images?.fixed_height?.url ?? g.images?.original?.url,
      label: g.title ?? 'gif',
    })).filter((g: GifItem) => g.url)
    if (items.length > 0) writeTrendingCache(items)
    return { items }
  } catch (err) {
    return { items: [], error: String(err) }
  }
}

async function searchGiphy(query: string): Promise<{ items: GifItem[]; error?: string }> {
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=5`
    const res = await fetch(url)
    if (!res.ok) {
      return { items: [], error: `Giphy error ${res.status}` }
    }
    const data = await res.json()
    const items = (data.data ?? []).map((g: any) => ({
      id: g.id,
      // Use fixed_height (200px tall, consistent) — the best for square/wide gifs
      url: g.images?.fixed_height?.url ?? g.images?.original?.url,
      label: g.title ?? 'gif',
    })).filter((g: GifItem) => g.url)
    return { items }
  } catch (err) {
    return { items: [], error: String(err) }
  }
}

export default function EmotePicker({ onPick, onClose }: {
  onPick: (emote: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'emoji' | 'gif'>('emoji')
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Debounced live search (or trending when empty)
  useEffect(() => {
    if (tab !== 'gif') return
    setErrorMsg(null)
    const q = query.trim()

    // Empty query → load trending immediately (no debounce)
    if (!q) {
      let cancelled = false
      setLoading(true)
      trendingGiphy().then(({ items, error }) => {
        if (cancelled) return
        if (error) { setErrorMsg(error); setGifs([]) }
        else setGifs(items)
        setLoading(false)
      })
      return () => { cancelled = true }
    }

    // Debounced search
    const t = setTimeout(async () => {
      setLoading(true)
      const { items, error } = await searchGiphy(q)
      if (error) { setErrorMsg(error); setGifs([]) }
      else setGifs(items)
      setLoading(false)
    }, 1500)
    return () => clearTimeout(t)
  }, [query, tab])

  const handlePick = (emote: string) => {
    onPick(emote)
    onClose()
  }

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/50 cursor-default"
        aria-label="Close"
      />

      <div className="fixed z-[70] left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 bg-gray-800 rounded-2xl p-4 max-w-md w-[min(95vw,420px)] border border-gray-600 shadow-2xl">
        {/* Tabs */}
        <div className="flex gap-1 mb-3 bg-gray-900 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('emoji')}
            className={`flex-1 py-1.5 rounded text-sm font-semibold transition-colors ${
              tab === 'emoji' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Emoji
          </button>
          <button
            type="button"
            onClick={() => setTab('gif')}
            className={`flex-1 py-1.5 rounded text-sm font-semibold transition-colors ${
              tab === 'gif' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            GIFs
          </button>
        </div>

        {tab === 'emoji' && (
          <div className="grid grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
            {EMOTES.map(emote => (
              <button
                key={emote}
                type="button"
                onClick={() => handlePick(emote)}
                className="text-3xl sm:text-4xl p-2 hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
              >
                {emote}
              </button>
            ))}
          </div>
        )}

        {tab === 'gif' && (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs (tease, laugh, ...)"
              className="w-full mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-purple-400"
            />
            {loading && <div className="text-xs text-gray-500 text-center py-2">Searching...</div>}
            {errorMsg && (
              <div className="text-xs text-red-400 text-center py-2 bg-red-900/30 rounded mb-2">
                {errorMsg} — add a free key via <code>VITE_GIPHY_KEY</code> in .env
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
              {gifs.map(gif => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handlePick(gif.url)}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-700 hover:ring-2 hover:ring-purple-400 active:scale-95 transition-all"
                  title={gif.label}
                >
                  <img src={gif.url} alt={gif.label} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
              {!loading && gifs.length === 0 && !errorMsg && (
                <div className="col-span-full text-xs text-gray-500 text-center py-4">No results</div>
              )}
            </div>
            <div className="text-[10px] text-gray-600 text-center mt-2">Powered by GIPHY</div>
          </>
        )}
      </div>
    </>
  )
}

// ── Floating emote that appears between two positions ────────────

export function FloatingEmote({
  emote, fromAngle, toAngle, direction, onDone,
}: {
  emote: string
  fromAngle: number
  toAngle: number
  direction: 1 | -1
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'enter' | 'travel' | 'exit'>('enter')

  // Midpoint in the direction of play (not mathematical midpoint).
  // Going clockwise in degree-land: angular diff from->to is (to - from + 360) % 360.
  let angularDiff = ((toAngle - fromAngle) + 360) % 360
  if (direction === -1) angularDiff = ((fromAngle - toAngle) + 360) % 360
  const midAngle = ((fromAngle + direction * (angularDiff / 2)) % 360 + 360) % 360

  const rad = (midAngle * Math.PI) / 180
  const r = 46 // same as player bubbles — on the circle line
  const left = 50 + r * Math.cos(rad)
  const top = 50 - r * Math.sin(rad)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('travel'), 250)
    const t2 = setTimeout(() => setPhase('exit'), 2400)
    const t3 = setTimeout(onDone, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const isGif = emote.startsWith('http')

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-500 ease-out
        ${phase === 'enter' ? 'scale-0 opacity-0' : ''}
        ${phase === 'travel' ? 'scale-100 opacity-100' : ''}
        ${phase === 'exit' ? 'scale-125 opacity-0' : ''}
      `}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {isGif ? (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-black/20 shadow-xl flex items-center justify-center overflow-hidden">
          <img src={emote} alt="emote" className="max-w-full max-h-full object-contain" />
        </div>
      ) : (
        <div className="text-5xl sm:text-6xl drop-shadow-lg animate-bounce">{emote}</div>
      )}
    </div>
  )
}
