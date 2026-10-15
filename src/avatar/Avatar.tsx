import { useId } from 'react'
import type { AvatarConfig, PhotoMood } from '../../shared/avatar'

export type Mood =
  | 'idle' | 'turn' | 'worried' | 'confident'
  | 'smug' | 'shock' | 'gloom' | 'cry' | 'meh' | 'facepalm' | 'dizzy' | 'ko' | 'celebrate' | 'tantrum'

// Whole character lives in a 200x300 space; the seat bust is a crop of it.
const VIEW = { full: '0 0 200 300', bust: '18 14 164 164' }

const HEAD_CY = 88
const EYE_X = 80   // left eye; the right side is drawn mirrored
const EYE_Y = 90
const BROW_Y = 72
const INK = '#2b2230'
const LIP = '#6b2b2b'

function headHalfWidth(head: AvatarConfig['head']) {
  return head === 'oval' ? 47 : head === 'long' ? 45 : 52
}

function HeadShape({ head, ...rest }: { head: AvatarConfig['head'] } & React.SVGProps<SVGEllipseElement & SVGRectElement>) {
  if (head === 'square') return <rect x={48} y={32} width={104} height={112} rx={34} {...rest} />
  const [rx, ry] = head === 'oval' ? [47, 58] : head === 'long' ? [45, 62] : [52, 55]
  return <ellipse cx={100} cy={HEAD_CY} rx={rx} ry={ry} {...rest} />
}

// Mirror helper: draw the left-side part, then the same part flipped for the right.
const MIRROR = 'translate(200,0) scale(-1,1)'

// ── Hair ─────────────────────────────────────────────────────────

const HAIR_FRONT: Record<AvatarConfig['hair'], string | null> = {
  short: 'M47,92 C44,44 78,26 100,26 C122,26 156,44 153,92 C149,74 141,62 130,58 C112,66 84,66 68,60 C59,66 52,76 47,92 Z',
  sidepart: 'M46,96 C42,46 72,26 104,28 C136,28 158,48 154,96 C150,76 146,66 138,60 C122,64 96,62 84,50 C76,66 60,70 50,80 Z',
  spiky: 'M46,92 C44,56 58,36 70,34 L74,18 L88,32 L100,14 L112,32 L126,18 L130,34 C142,36 156,56 154,92 C150,74 142,62 130,58 L120,66 L108,56 L96,66 L84,56 L72,64 C62,66 52,76 46,92 Z',
  curly: null, // drawn as curls below
  bob: 'M48,90 C48,48 76,28 100,28 C124,28 152,48 152,90 C142,66 122,56 98,58 C80,60 62,70 48,90 Z',
  long: 'M48,90 C48,48 76,28 100,28 C124,28 152,48 152,90 C142,66 122,56 98,58 C80,60 62,70 48,90 Z',
  bun: 'M47,92 C44,46 78,30 100,30 C122,30 156,46 153,92 C146,70 128,60 100,60 C72,60 54,70 47,92 Z',
  bald: null,
}

const CURLS: [number, number, number][] = [
  [60, 62, 18], [74, 44, 18], [100, 36, 21], [126, 44, 18], [140, 62, 18],
  [50, 82, 12], [150, 82, 12], [88, 52, 14], [112, 52, 14],
]

function HairBack({ a }: { a: AvatarConfig }) {
  if (a.hair === 'bob') return <path fill={a.hairColour} d="M42,126 C34,62 62,24 100,24 C138,24 166,62 158,126 C152,132 140,132 136,126 L138,90 L62,90 L64,126 C60,132 48,132 42,126 Z" />
  if (a.hair === 'long') return <path fill={a.hairColour} d="M40,176 C28,96 50,24 100,24 C150,24 172,96 160,176 C140,182 60,182 40,176 Z" />
  if (a.hair === 'bun') return <circle cx={100} cy={26} r={17} fill={a.hairColour} />
  return null
}

function HairFront({ a }: { a: AvatarConfig }) {
  if (a.hair === 'curly') {
    return <g fill={a.hairColour}>{CURLS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
  }
  const d = HAIR_FRONT[a.hair]
  return d ? <path d={d} fill={a.hairColour} /> : null
}

// ── Eyes ─────────────────────────────────────────────────────────

function Eye({ a, mood, skin }: { a: AvatarConfig; mood: Mood; skin: string }) {
  const x = EYE_X, y = EYE_Y
  const pupil = (dx = 0, dy = 1, r = 4) => (
    <>
      <circle cx={x + dx} cy={y + dy} r={r} fill={INK} />
      <circle cx={x + dx + 1.3} cy={y + dy - 1.4} r={1.2} fill="#fff" />
    </>
  )
  switch (mood) {
    case 'tantrum':
      return (
        <g>
          <path d={`M${x - 9},${y + 1} Q${x},${y - 6} ${x + 9},${y + 3} Q${x},${y + 8} ${x - 9},${y + 1} Z`} fill="#fff" stroke={INK} strokeWidth={1.2} />
          <circle cx={x + 1.5} cy={y + 1.5} r={2.6} fill={INK} />
        </g>
      )
    case 'shock':
      return <g><circle cx={x} cy={y} r={10} fill="#fff" stroke={INK} strokeWidth={1} />{pupil(0, 0, 3)}</g>
    case 'worried':
      return <g><ellipse cx={x} cy={y} rx={8} ry={9} fill="#fff" stroke={INK} strokeWidth={0.8} />{pupil(2, 1, 3.5)}</g>
    case 'smug':
      return (
        <g>
          <ellipse cx={x} cy={y + 1} rx={8} ry={5.5} fill="#fff" stroke={INK} strokeWidth={0.8} />
          {pupil(2, 2.5, 3.6)}
          <path d={`M${x - 10},${y - 5} L${x + 10},${y - 5} L${x + 10},${y - 1} Q${x},${y - 3} ${x - 10},${y + 1} Z`} fill={skin} />
          <path d={`M${x - 10},${y + 1} Q${x},${y - 3} ${x + 10},${y - 1}`} stroke={INK} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      )
    case 'gloom':
    case 'cry':
      return <ellipse cx={x} cy={y + 3} rx={3.6} ry={4.4} fill={INK} />
    case 'meh':
      return <path d={`M${x - 7},${y + 1} L${x + 7},${y + 1}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
    case 'facepalm':
      return <path d={`M${x - 7},${y} Q${x},${y + 6} ${x + 7},${y}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    case 'celebrate':
      return <path d={`M${x - 7},${y + 3} Q${x},${y - 7} ${x + 7},${y + 3}`} stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    case 'dizzy':
      return (
        <g className="av-spin">
          <path d={`M${x},${y} m-1,0 a1,1 0 1,1 2,0 a2.5,2.5 0 1,1 -5,0 a4,4 0 1,1 8,0 a5.5,5.5 0 1,1 -11,0`} stroke={INK} strokeWidth={1.8} fill="none" />
        </g>
      )
    case 'ko':
      return <path d={`M${x - 6},${y - 6} L${x + 6},${y + 6} M${x + 6},${y - 6} L${x - 6},${y + 6}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
  }
  // Normal look per style
  switch (a.eyes) {
    case 'dot':
      return <ellipse cx={x} cy={y} rx={4.2} ry={5.6} fill={INK} />
    case 'round':
      return <g><ellipse cx={x} cy={y} rx={7.5} ry={8.5} fill="#fff" stroke={INK} strokeWidth={0.8} />{pupil()}</g>
    case 'sharp':
      return (
        <g>
          <path d={`M${x - 9},${y + 2} Q${x},${y - 9} ${x + 9},${y - 1} Q${x},${y + 8} ${x - 9},${y + 2} Z`} fill="#fff" stroke={INK} strokeWidth={1} />
          {pupil(0.5, 0.5, 3.8)}
        </g>
      )
    case 'sleepy':
      return (
        <g>
          <ellipse cx={x} cy={y + 1} rx={7} ry={6} fill="#fff" stroke={INK} strokeWidth={0.8} />
          {pupil(0, 2, 3.5)}
          <path d={`M${x - 8},${y - 6} L${x + 8},${y - 6} L${x + 8},${y} L${x - 8},${y} Z`} fill={skin} />
          <path d={`M${x - 8},${y} L${x + 8},${y}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </g>
      )
    case 'lashes':
      return (
        <g>
          <ellipse cx={x} cy={y} rx={7.5} ry={8.5} fill="#fff" stroke={INK} strokeWidth={0.8} />
          {pupil()}
          <path d={`M${x - 6},${y - 6} L${x - 10},${y - 9} M${x - 8},${y - 2} L${x - 12},${y - 4}`} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </g>
      )
  }
}

// ── Brows ────────────────────────────────────────────────────────

function Brow({ a, mood, side }: { a: AvatarConfig; mood: Mood; side: 'l' | 'r' }) {
  const x = EYE_X
  let y = BROW_Y
  let kind: AvatarConfig['brows'] | 'sad' = a.brows
  if (mood === 'shock') y -= 6
  if (mood === 'celebrate') y -= 3
  if (mood === 'worried' || mood === 'gloom' || mood === 'cry' || mood === 'facepalm') kind = 'sad'
  if (mood === 'confident') kind = 'angry'
  if (mood === 'tantrum') { kind = 'angry'; y += 4 }
  if (mood === 'smug' && side === 'r') { y -= 6; kind = 'arched' }
  const common = { stroke: a.hairColour, strokeWidth: mood === 'tantrum' ? 5 : 3.6, strokeLinecap: 'round' as const, fill: 'none' }
  switch (kind) {
    case 'flat': return <path d={`M${x - 9},${y} L${x + 9},${y}`} {...common} />
    case 'arched': return <path d={`M${x - 9},${y + 2} Q${x},${y - 5} ${x + 9},${y + 2}`} {...common} />
    case 'thick': return <rect x={x - 10} y={y - 3} width={20} height={6.5} rx={3} fill={a.hairColour} />
    case 'angry': return <path d={`M${x - 9},${y - 3} L${x + 8},${y + 3}`} {...common} />
    case 'sad': return <path d={`M${x - 9},${y + 3} L${x + 8},${y - 3}`} {...common} />
  }
}

// ── Mouth ────────────────────────────────────────────────────────

function Mouth({ a, mood }: { a: AvatarConfig; mood: Mood }) {
  const line = { stroke: LIP, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' }
  switch (mood) {
    case 'smug': return <path d="M89,118 Q103,120 113,109" {...line} />
    case 'tantrum':
      return (
        <g>
          <rect x={85} y={111} width={30} height={12} rx={4} fill="#fff" stroke={LIP} strokeWidth={2} />
          <path d="M85,117 L115,117 M92.5,111 L92.5,123 M100,111 L100,123 M107.5,111 L107.5,123" stroke={LIP} strokeWidth={1.3} />
        </g>
      )
    case 'shock': return <ellipse cx={100} cy={119} rx={6} ry={8} fill="#5a1f25" />
    case 'worried':
    case 'facepalm':
    case 'dizzy':
      return <path d="M88,118 q3,-3 6,0 t6,0 t6,0 t6,0" {...line} strokeWidth={2.4} />
    case 'gloom': return <path d="M89,121 Q100,111 111,121" {...line} />
    case 'cry': return <path d="M88,122 Q100,108 112,122 Z" fill="#5a1f25" />
    case 'meh': return <path d="M91,118 L108,115" {...line} />
    case 'ko': return <ellipse cx={100} cy={119} rx={4} ry={3} fill="#5a1f25" />
    case 'celebrate':
      return (
        <g>
          <path d="M84,110 Q100,136 116,110 Z" fill="#5a1f25" />
          <ellipse cx={100} cy={124} rx={7} ry={4} fill="#ff8b9a" />
        </g>
      )
  }
  const style = mood === 'confident' ? 'grin' : a.mouth
  switch (style) {
    case 'smile': return <path d="M88,113 Q100,124 112,113" {...line} />
    case 'flat': return <path d="M90,116 L110,116" {...line} />
    case 'small': return <path d="M95,115 Q100,119 105,115" {...line} />
    case 'grin':
      return (
        <g>
          <path d="M86,111 Q100,129 114,111 Z" fill="#5a1f25" />
          <path d="M88,112 L112,112 L111,115.5 L89,115.5 Z" fill="#fff" />
        </g>
      )
  }
}

// ── Extras ───────────────────────────────────────────────────────

function ExtraUnder({ a }: { a: AvatarConfig }) {
  // Drawn before the mouth so it stays visible
  if (a.extra === 'beard') return <path d="M50,100 C50,152 150,152 150,100 C140,128 120,136 100,136 C80,136 60,128 50,100 Z" fill={a.hairColour} />
  return null
}

function ExtraOver({ a, photo }: { a: AvatarConfig; photo: boolean }) {
  switch (a.extra) {
    case 'moustache':
      return photo ? null : <path d="M86,110 Q93,104 100,109 Q107,104 114,110 Q107,113 100,111 Q93,113 86,110 Z" fill={a.hairColour} />
    case 'glasses':
      return photo ? null : (
        <g stroke={INK} strokeWidth={2.6} fill="rgba(255,255,255,.12)">
          <rect x={67} y={80} width={26} height={21} rx={7} />
          <rect x={107} y={80} width={26} height={21} rx={7} />
          <path d="M93,89 L107,89" fill="none" />
        </g>
      )
    case 'sunglasses':
      return photo ? null : (
        <g>
          <path d="M66,82 L94,82 Q95,100 81,101 Q66,100 66,82 Z M106,82 L134,82 Q134,100 119,101 Q105,100 106,82 Z" fill="#14121a" />
          <path d="M94,85 L106,85" stroke="#14121a" strokeWidth={3} />
          <path d="M71,86 L78,86 M111,86 L118,86" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
        </g>
      )
    case 'cap':
      return (
        <g>
          <path d="M45,70 C45,22 155,22 155,70 Z" fill={a.shirt} />
          <path d="M45,70 C45,22 155,22 155,70 Z" fill="rgba(0,0,0,.12)" />
          <ellipse cx={104} cy={70} rx={62} ry={9} fill={a.shirt} stroke="rgba(0,0,0,.2)" strokeWidth={1.5} />
          <circle cx={100} cy={30} r={4} fill="rgba(0,0,0,.25)" />
        </g>
      )
    case 'headphones':
      return (
        <g>
          <path d="M44,92 C42,18 158,18 156,92" stroke="#2d2d35" strokeWidth={7} fill="none" />
          <rect x={36} y={78} width={17} height={32} rx={7} fill="#2d2d35" />
          <rect x={147} y={78} width={17} height={32} rx={7} fill="#2d2d35" />
          <rect x={39} y={84} width={4} height={20} rx={2} fill="#f97373" />
          <rect x={157} y={84} width={4} height={20} rx={2} fill="#f97373" />
        </g>
      )
  }
  return null
}

// ── Body ─────────────────────────────────────────────────────────

function Fist({ a, x, y, r = 9.5 }: { a: AvatarConfig; x: number; y: number; r?: number }) {
  return <><circle cx={x} cy={y} r={r} fill={a.shirt} /><circle cx={x} cy={y} r={r} fill="rgba(0,0,0,.12)" /></>
}

// Hands meet at chin height when holding cards
const HOLD_L = { x: 84, y: 168 }
const HOLD_R = { x: 116, y: 168 }

function Arms({ a, mood, holding }: { a: AvatarConfig; mood: Mood; holding: boolean }) {
  const arm = { stroke: a.shirt, strokeWidth: 14, strokeLinecap: 'round' as const, fill: 'none' }
  const hand = 'rgba(0,0,0,.12)'
  if (mood === 'tantrum') {
    return (
      <g>
        <g className="av-arm-l"><path d="M70,156 Q38,148 36,112" {...arm} /><Fist a={a} x={35} y={104} r={11} /></g>
        <g className="av-arm-r"><path d="M130,156 Q162,148 164,112" {...arm} /><Fist a={a} x={165} y={104} r={11} /></g>
      </g>
    )
  }
  if (holding) {
    return (
      <g>
        <path d={`M70,156 Q58,178 ${HOLD_L.x},${HOLD_L.y}`} {...arm} />
        <path d={`M130,156 Q142,178 ${HOLD_R.x},${HOLD_R.y}`} {...arm} />
      </g>
    )
  }
  if (mood === 'celebrate') {
    return (
      <g>
        <path d="M70,156 Q50,130 42,104" {...arm} /><circle cx={40} cy={98} r={10} fill={a.shirt} /><circle cx={40} cy={98} r={10} fill={hand} />
        <path d="M130,156 Q150,130 158,104" {...arm} /><circle cx={160} cy={98} r={10} fill={a.shirt} /><circle cx={160} cy={98} r={10} fill={hand} />
      </g>
    )
  }
  const left = <g><path d="M70,156 Q56,180 50,205" {...arm} /><circle cx={48} cy={210} r={9.5} fill={a.shirt} /><circle cx={48} cy={210} r={9.5} fill={hand} /></g>
  if (mood === 'facepalm') return left // the raised hand is drawn over the face
  return (
    <g>
      {left}
      <path d="M130,156 Q144,180 150,205" {...arm} /><circle cx={152} cy={210} r={9.5} fill={a.shirt} /><circle cx={152} cy={210} r={9.5} fill={hand} />
    </g>
  )
}

function Body({ a, mood, holding }: { a: AvatarConfig; mood: Mood; holding: boolean }) {
  return (
    <g className="av-body">
      <ellipse cx={100} cy={289} rx={44} ry={7} fill="rgba(0,0,0,.25)" />
      <rect x={80} y={210} width={17} height={66} rx={8} fill="#3a3f4b" />
      <rect x={103} y={210} width={17} height={66} rx={8} fill="#3a3f4b" />
      <ellipse cx={87} cy={279} rx={12} ry={7} fill="#2a2e37" />
      <ellipse cx={113} cy={279} rx={12} ry={7} fill="#2a2e37" />
      <rect x={92} y={134} width={16} height={18} rx={5} fill={a.skin} />
      <path d="M70,150 Q100,140 130,150 L138,216 Q100,224 62,216 Z" fill={a.shirt} />
      <path d="M86,146 Q100,156 114,146" stroke="rgba(0,0,0,.15)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Arms a={a} mood={mood} holding={holding} />
    </g>
  )
}

// ── Cards held up to the chin ────────────────────────────────────

const CARD_W = 28
const CARD_H = 40
const CARD_TOP = 134
const FAN_PIVOT = { x: 100, y: 214 }

function CardFan({ a, count, uid }: { a: AvatarConfig; count: number; uid: string }) {
  const n = Math.min(count, 8)
  const spread = Math.min(64, 11 * (n - 1))
  return (
    <g className="av-fan">
      <defs>
        <clipPath id={`card-${uid}`}><rect x={100 - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H} rx={3.5} /></clipPath>
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const angle = n === 1 ? 0 : -spread / 2 + (spread / (n - 1)) * i
        return (
          <g key={i} transform={`rotate(${angle} ${FAN_PIVOT.x} ${FAN_PIVOT.y})`}>
            <image href="/cards/Back/back.png" x={100 - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H}
              preserveAspectRatio="xMidYMid slice" clipPath={`url(#card-${uid})`} />
            <rect x={100 - CARD_W / 2} y={CARD_TOP} width={CARD_W} height={CARD_H} rx={3.5} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={1.4} />
          </g>
        )
      })}
      <Fist a={a} x={HOLD_L.x} y={HOLD_L.y} />
      <Fist a={a} x={HOLD_R.x} y={HOLD_R.y} />
    </g>
  )
}

// ── Reaction effects ─────────────────────────────────────────────

function Effects({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'tantrum':
      return (
        <g>
          <g className="av-vein" stroke="#e74c3c" strokeWidth={3.2} fill="none" strokeLinecap="round">
            <path d="M141,38 Q146,43 141,48 M155,38 Q150,43 155,48 M143,36 Q148,41 153,36 M143,50 Q148,45 153,50" />
          </g>
          <g fill="#fff" fillOpacity={0.85}>
            <circle className="av-steam" cx={52} cy={40} r={7} />
            <circle className="av-steam av-steam-2" cx={148} cy={28} r={6} />
            <circle className="av-steam av-steam-3" cx={60} cy={30} r={5} />
          </g>
        </g>
      )
    case 'shock':
    case 'worried':
      return <path className="av-sweat" d="M150,48 Q158,62 150,66 Q142,62 150,48 Z" fill="#8fd3ff" stroke="#fff" strokeWidth={1.5} />
    case 'gloom':
    case 'cry':
      return (
        <g stroke="#7d6bff" strokeOpacity={0.75} strokeWidth={2.5} strokeLinecap="round" className="av-gloom">
          <path d="M80,40 L80,58 M92,36 L92,58 M108,36 L108,58 M120,40 L120,58" />
        </g>
      )
    case 'dizzy':
      return (
        <g className="av-orbit" style={{ transformOrigin: '100px 30px' }}>
          <path d="M70,30 l3,-7 l3,7 l-7,-4 h8 z" fill="#fdc48a" />
          <path d="M124,24 l3,-7 l3,7 l-7,-4 h8 z" fill="#fdc48a" />
        </g>
      )
    case 'smug':
      return <path className="av-sparkle" d="M156,44 l3,9 l9,3 l-9,3 l-3,9 l-3,-9 l-9,-3 l9,-3 z" fill="#fff6c8" />
  }
  return null
}

function Tears() {
  return (
    <g fill="#8fd3ff" className="av-tears">
      <path d="M74,98 Q78,108 74,112 Q70,108 74,98 Z" />
      <path d="M126,98 Q130,108 126,112 Q122,108 126,98 Z" />
    </g>
  )
}

const PHOTO_MOOD: Partial<Record<Mood, PhotoMood>> = {
  smug: 'smug', shock: 'shock', worried: 'shock',
  gloom: 'gloom', cry: 'gloom', meh: 'gloom', facepalm: 'gloom',
  celebrate: 'celebrate', confident: 'celebrate', tantrum: 'tantrum',
}

// ── Avatar ───────────────────────────────────────────────────────

// Moods where the arms are busy, so the cards go down
const HANDS_BUSY: Mood[] = ['celebrate', 'tantrum', 'facepalm', 'ko']

export default function Avatar({ config: a, mood = 'idle', variant = 'bust', cards = 0, className }: {
  config: AvatarConfig
  mood?: Mood
  cards?: number
  variant?: 'bust' | 'full'
  className?: string
}) {
  const uid = useId().replace(/:/g, '')
  const hw = headHalfWidth(a.head)
  const k = hw / 52
  const fit = `translate(100,0) scale(${k},1) translate(-100,0)`
  const photo = a.photo ? (a.photoMoods?.[PHOTO_MOOD[mood] as PhotoMood] ?? a.photo) : null
  const blush = mood === 'facepalm' || mood === 'celebrate' || mood === 'smug'
  const holding = cards > 0 && !HANDS_BUSY.includes(mood)
  const flush = mood === 'tantrum' && <HeadShape head={a.head} fill="#e74c3c" className="av-flush" />
  const blinks = mood === 'idle' || mood === 'turn' || mood === 'confident' || mood === 'worried'

  return (
    <svg viewBox={VIEW[variant]} className={`av av-${mood} ${className ?? ''}`} style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={`head-${uid}`}><HeadShape head={a.head} /></clipPath>
      </defs>
      <g className="av-all">
        {!photo && <g transform={fit}><HairBack a={a} /></g>}
        <Body a={a} mood={mood} holding={holding} />
        <g className="av-head">
          {/* Ears */}
          {!photo && <>
            <circle cx={100 - hw} cy={94} r={9} fill={a.skin} />
            <circle cx={100 + hw} cy={94} r={9} fill={a.skin} />
          </>}
          <HeadShape head={a.head} fill={a.skin} />
          {!photo && flush}
          {photo ? (
            <>
              <image href={photo} x={40} y={22} width={120} height={130} preserveAspectRatio="xMidYMid slice" clipPath={`url(#head-${uid})`} />
              {flush}
              <HeadShape head={a.head} fill="none" stroke="#fff" strokeOpacity={0.8} strokeWidth={2.5} />
              {mood === 'ko' && <path d="M62,52 L138,128 M138,52 L62,128" stroke="#e74c3c" strokeWidth={7} strokeLinecap="round" strokeOpacity={0.85} />}
            </>
          ) : (
            <>
              <path d="M98,98 Q104,104 98,107" stroke="rgba(0,0,0,.18)" strokeWidth={2.4} fill="none" strokeLinecap="round" />
              {blush && <g fill="#ff7a8a" fillOpacity={0.45}><ellipse cx={68} cy={106} rx={8} ry={4.5} /><ellipse cx={132} cy={106} rx={8} ry={4.5} /></g>}
              <g className={blinks ? 'av-blink' : undefined}>
                {/* plain wrappers: a CSS blink would override a transform attribute */}
                <g><Eye a={a} mood={mood} skin={a.skin} /></g>
                <g><g transform={MIRROR}><Eye a={a} mood={mood} skin={a.skin} /></g></g>
              </g>
              <Brow a={a} mood={mood} side="l" />
              <g transform={MIRROR}><Brow a={a} mood={mood} side="r" /></g>
              <ExtraUnder a={a} />
              <Mouth a={a} mood={mood} />
              <g transform={fit}><HairFront a={a} /></g>
              {mood === 'cry' && <Tears />}
            </>
          )}
          <g transform={fit}><ExtraOver a={a} photo={!!photo} /></g>
          {mood === 'facepalm' && (
            <g>
              <path d="M130,156 Q152,140 126,112" stroke={a.shirt} strokeWidth={14} strokeLinecap="round" fill="none" />
              <circle cx={118} cy={102} r={13} fill={a.shirt} />
              <circle cx={118} cy={102} r={13} fill="rgba(0,0,0,.12)" />
            </g>
          )}
          <Effects mood={mood} />
        </g>
        {holding && <CardFan a={a} count={cards} uid={uid} />}
      </g>
    </svg>
  )
}
