import { useState } from 'react'
import { useStore } from '../store'
import RulesModal, { RulesButton } from './RulesModal'

export default function Lobby() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const [showRules, setShowRules] = useState(false)
  const { createRoom, joinRoom, error } = useStore()

  const handleCreate = () => {
    if (name.trim()) createRoom(name.trim())
  }

  const handleJoin = () => {
    if (name.trim() && code.trim()) joinRoom(code.trim(), name.trim())
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Splash background */}
      <img
        src="/UNO_No_Mercy_splash.avif"
        alt=""
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-40"
        draggable={false}
      />
      {/* Dark gradient wash for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/60 via-ink-900/70 to-ink-900/90" />

      {/* Decorative blur blobs on top */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 bg-sunset-500/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 w-96 h-96 bg-lotus-500/30 rounded-full blur-3xl" />

      <div className="glass rounded-3xl p-7 sm:p-10 max-w-md w-full relative z-10 shadow-soft">
        <h1 className="font-display text-4xl sm:text-5xl font-black text-center mb-1 tracking-tight">
          <span className="bg-gradient-to-r from-sunset-500 via-sunset-300 to-lotus-400 bg-clip-text text-transparent">
            UNO
          </span>
          <span className="text-white/90 ml-2">No Mercy</span>
        </h1>
        <p className="text-lotus-300/70 text-center text-sm mb-7">Friday Fun · chill edition</p>

        {error && (
          <div className="bg-sunset-500/15 border border-sunset-500/30 text-sunset-300 text-sm rounded-xl p-3 mb-4">
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your nickname"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={16}
              className="w-full px-4 py-3 bg-ink-700/60 border border-white/10 rounded-xl text-white placeholder-lotus-300/40 focus:outline-none focus:ring-2 focus:ring-lotus-400/50 focus:border-lotus-400/30 transition-all"
            />
            <button
              type="button"
              onClick={() => { if (name.trim()) setMode('create') }}
              disabled={!name.trim()}
              className="w-full py-3 bg-warm-gradient disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-display font-bold text-lg text-white transition-all hover:scale-[1.02] active:scale-[0.99] shadow-glow-sunset disabled:shadow-none"
            >
              Create Room
            </button>
            <button
              type="button"
              onClick={() => { if (name.trim()) setMode('join') }}
              disabled={!name.trim()}
              className="w-full py-3 bg-ink-600/60 hover:bg-ink-500/70 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-display font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-lotus-200/80 text-center">Creating room as <span className="text-white font-bold">{name}</span></p>
            <button
              type="button"
              onClick={handleCreate}
              className="w-full py-3 bg-warm-gradient rounded-xl font-display font-bold text-lg shadow-glow-sunset transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setMode('menu')}
              className="w-full py-2 text-lotus-300/60 hover:text-lotus-200 text-sm"
            >
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <p className="text-lotus-200/80 text-center">Joining as <span className="text-white font-bold">{name}</span></p>
            <input
              type="text"
              placeholder="ABCD"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-4 py-3 bg-ink-700/60 border border-white/10 rounded-xl text-white text-center text-3xl tracking-[0.5em] pl-7 placeholder-lotus-300/30 focus:outline-none focus:ring-2 focus:ring-lotus-400/50 focus:border-lotus-400/30 uppercase font-display font-black transition-all"
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={code.length < 4}
              className="w-full py-3 bg-warm-gradient disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-display font-bold text-lg shadow-glow-sunset disabled:shadow-none transition-all hover:scale-[1.02] active:scale-[0.99]"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setMode('menu')}
              className="w-full py-2 text-lotus-300/60 hover:text-lotus-200 text-sm"
            >
              ← Back
            </button>
          </div>
        )}
      </div>

      {/* Rules button + modal */}
      <RulesButton onClick={() => setShowRules(true)} position="bottom-left" />
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  )
}
