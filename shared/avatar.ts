// ── Mii-style character config, shared by client and server ─────
// Every option is a whitelist so the server can sanitise what clients send.

export const SKIN_TONES = ['#fde7d4', '#f6d3b3', '#e8b98f', '#c98f62', '#a26a42', '#86593a'] as const
export const HAIR_COLOURS = ['#1f1a17', '#3b2a1a', '#6b4423', '#a0662f', '#d9a548', '#e8d39a', '#9c9c9c', '#c0392b', '#5b6ee1', '#e170b5'] as const
export const SHIRT_COLOURS = ['#e74c3c', '#f39c12', '#f1c40f', '#27ae60', '#16a085', '#3498db', '#2c3e9e', '#8e44ad', '#e170b5', '#ecf0f1', '#34495e', '#1f1f1f'] as const

export const HEADS = ['round', 'oval', 'square', 'long'] as const
export const HAIRS = ['short', 'sidepart', 'spiky', 'curly', 'bob', 'long', 'bun', 'bald'] as const
export const EYES = ['dot', 'round', 'sharp', 'sleepy', 'lashes'] as const
export const BROWS = ['flat', 'arched', 'thick', 'angry'] as const
export const MOUTHS = ['smile', 'flat', 'grin', 'small'] as const
export const EXTRAS = ['none', 'glasses', 'sunglasses', 'cap', 'headphones', 'beard', 'moustache'] as const

// Moods a photo face can have its own image for
export const PHOTO_MOODS = ['smug', 'shock', 'gloom', 'celebrate', 'tantrum'] as const
export type PhotoMood = typeof PHOTO_MOODS[number]

export interface AvatarConfig {
  skin: string
  head: typeof HEADS[number]
  hair: typeof HAIRS[number]
  hairColour: string
  eyes: typeof EYES[number]
  brows: typeof BROWS[number]
  mouth: typeof MOUTHS[number]
  shirt: string
  extra: typeof EXTRAS[number]
  photo?: string                                     // face photo: /avatars/faces/... or a small data: URL
  photoMoods?: Partial<Record<PhotoMood, string>>    // optional per-reaction photos (files only)
}

const MAX_PHOTO_DATA_URL = 80_000
const FACE_FILE = /^\/avatars\/faces\/[A-Za-z0-9_-]+\.(png|jpe?g|webp)$/
const FACE_DATA = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

function pick<T extends string>(list: readonly T[], v: unknown, fallback: T): T {
  return list.includes(v as T) ? (v as T) : fallback
}

function validPhoto(v: unknown, allowData: boolean): string | undefined {
  if (typeof v !== 'string') return undefined
  if (FACE_FILE.test(v)) return v
  if (allowData && v.length <= MAX_PHOTO_DATA_URL && FACE_DATA.test(v)) return v
  return undefined
}

export function sanitiseAvatar(input: unknown, fallbackSeed: string): AvatarConfig {
  const base = avatarFromSeed(fallbackSeed)
  if (!input || typeof input !== 'object') return base
  const a = input as Record<string, unknown>
  const out: AvatarConfig = {
    skin: pick(SKIN_TONES, a.skin, base.skin),
    head: pick(HEADS, a.head, base.head),
    hair: pick(HAIRS, a.hair, base.hair),
    hairColour: pick(HAIR_COLOURS, a.hairColour, base.hairColour),
    eyes: pick(EYES, a.eyes, base.eyes),
    brows: pick(BROWS, a.brows, base.brows),
    mouth: pick(MOUTHS, a.mouth, base.mouth),
    shirt: pick(SHIRT_COLOURS, a.shirt, base.shirt),
    extra: pick(EXTRAS, a.extra, base.extra),
  }
  const photo = validPhoto(a.photo, true)
  if (photo) out.photo = photo
  if (photo && a.photoMoods && typeof a.photoMoods === 'object') {
    const moods: Partial<Record<PhotoMood, string>> = {}
    for (const m of PHOTO_MOODS) {
      const p = validPhoto((a.photoMoods as Record<string, unknown>)[m], false)
      if (p) moods[m] = p
    }
    if (Object.keys(moods).length) out.photoMoods = moods
  }
  return out
}

// Deterministic "random" character from a string (used until a player customises)
export function avatarFromSeed(seed: string): AvatarConfig {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const next = <T>(list: readonly T[]): T => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    return list[h % list.length]
  }
  return {
    skin: next(SKIN_TONES),
    head: next(HEADS),
    hair: next(HAIRS.filter(x => x !== 'bald')),
    hairColour: next(HAIR_COLOURS.slice(0, 6)),
    eyes: next(EYES),
    brows: next(BROWS),
    mouth: next(MOUTHS),
    shirt: next(SHIRT_COLOURS),
    extra: next(['none', 'none', 'none', 'glasses', 'headphones', 'cap'] as const),
  }
}

export function randomAvatar(): AvatarConfig {
  return avatarFromSeed(Math.random().toString(36))
}
