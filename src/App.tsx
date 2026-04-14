import { useEffect } from 'react'
import { useStore } from './store'
import Lobby from './components/Lobby'
import Table from './components/Table'

export default function App() {
  const { gameState, init } = useStore()

  useEffect(() => {
    init()
  }, [init])

  // If we have a game state (lobby or playing), show the table
  if (gameState) {
    return <Table />
  }

  // Otherwise show lobby/join screen
  return <Lobby />
}
