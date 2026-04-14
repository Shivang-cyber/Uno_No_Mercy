import { useState } from 'react'
import { useStore } from '../store'

export default function Lobby() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu')
  const { createRoom, joinRoom, error } = useStore()

  const handleCreate = () => {
    if (name.trim()) createRoom(name.trim())
  }

  const handleJoin = () => {
    if (name.trim() && code.trim()) joinRoom(code.trim(), name.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <h1 className="text-3xl sm:text-4xl font-black text-center mb-2">
          <span className="text-uno-red">U</span>
          <span className="text-uno-yellow">N</span>
          <span className="text-uno-green">O</span>
          <span className="text-uno-blue"> No</span>
          <span className="text-white"> Mercy</span>
        </h1>
        <p className="text-gray-400 text-center text-sm mb-6">Friday Fun Edition</p>

        {error && (
          <div className="bg-red-900/50 text-red-300 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        {mode === 'menu' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your nickname"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={16}
              className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button
              onClick={() => { if (name.trim()) setMode('create') }}
              disabled={!name.trim()}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => { if (name.trim()) setMode('join') }}
              disabled={!name.trim()}
              className="w-full py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-3">
            <p className="text-gray-300">Creating room as <strong>{name}</strong></p>
            <button
              onClick={handleCreate}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold text-lg transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <p className="text-gray-300">Joining as <strong>{name}</strong></p>
            <input
              type="text"
              placeholder="Room code (4 letters)"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 uppercase"
            />
            <button
              onClick={handleJoin}
              disabled={code.length < 4}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-colors"
            >
              Join
            </button>
            <button
              onClick={() => setMode('menu')}
              className="w-full py-2 text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
