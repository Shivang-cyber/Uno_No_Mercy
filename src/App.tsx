import { useEffect, useState } from 'react'
import { useStore } from './store'
import Lobby from './components/Lobby'
import Table from './components/Table'
import SplashScreen, { hasSeenSplash } from './components/SplashScreen'

export default function App() {
  const { gameState, init } = useStore()
  const [showSplash, setShowSplash] = useState(() => !hasSeenSplash())

  useEffect(() => {
    init()
  }, [init])

  return (
    <>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}
      {gameState ? <Table /> : <Lobby />}
    </>
  )
}
