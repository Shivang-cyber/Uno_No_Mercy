# UNO No Mercy - Online Multiplayer

A real-time multiplayer UNO No Mercy card game built for Friday fun with friends and teammates. Supports 2-10 players per room, up to 5 concurrent rooms.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS (served by Vite)
- **Backend**: Node.js WebSocket server (using `ws`)
- **State**: Zustand (client) / server-authoritative game state
- **Build**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
cd uno-no-mercy
npm install
```

### Run (both servers at once)

```bash
npm start
```

This starts both the WebSocket game server and the Vite dev server using `concurrently`.

### Run separately

```bash
# Terminal 1 — game server (WebSocket on port 3001, auto-restarts on changes)
npm run server

# Terminal 2 — frontend dev server (port 3000, hot reload)
npm run dev
```

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

## How to Play

1. Open `http://localhost:3000` in your browser
2. Enter a nickname
3. **Create Room** — generates a 4-letter room code, or **Join Room** — enter a code from someone else
4. Host clicks **Start Game** once 2+ players have joined
5. Play cards, draw, call UNO

### Multiplayer on the same network

Other players on your network can join using your machine's IP address (shown by Vite on startup), e.g. `http://192.168.x.x:3000`.

For remote players (different network), use VS Code port forwarding or a tunnel tool like `ngrok` to expose ports 3000 (frontend) and 3001 (WebSocket).

## UNO No Mercy Rules

This implements the official Mattel UNO No Mercy (2023) ruleset.

### Number Cards

| Card | Effect |
|------|--------|
| **1-6, 8-9** | Match by color or number |
| **0 (Pass)** | All players pass their entire hand to the next player in the current direction |
| **7 (Swap)** | Swap your entire hand with any player of your choice |

### Colored Action Cards (Red, Yellow, Green, Blue)

| Card | Effect |
|------|--------|
| **Skip** | Next player loses their turn |
| **Reverse** | Direction of play switches |
| **Draw 2 (+2)** | Next player draws 2 and loses their turn |
| **Draw 4 (+4)** | Next player draws 4 and loses their turn |
| **Discard All** | Discard all cards from your hand that match this card's color |
| **Skip Everyone** | Skip all other players — you take another turn |

### Wild Cards

| Card | Effect |
|------|--------|
| **Wild Reverse Draw 4** | Reverse direction + next player draws 4. You choose the new color. |
| **Wild Draw 6** | Next player draws 6. You choose the new color. |
| **Wild Draw 10** | Next player draws 10. You choose the new color. |
| **Wild Color Roulette** | Next player picks a color and draws until they reveal a card of that color. You choose the active color. |

### Special Rules

- **Stacking**: When hit with a Draw card (+2/+4/+6/+10), you can play a Draw card of equal or higher value to pass the penalty to the next player. Penalties compound.
- **Draw Until Match**: If you have no playable card, you draw until you get one.
- **Mercy Rule**: If you ever have 25 or more cards in your hand, you are eliminated from the game.
- **UNO Call**: When you're down to 1 card, call UNO. Other players can challenge you — if you forgot to call, you draw 2 penalty cards.

## Project Structure

```
uno-no-mercy/
├── server/
│   ├── index.ts          # WebSocket server entry, room routing
│   ├── Room.ts           # Room lifecycle, message handling, reconnect
│   ├── engine.ts         # Game rules engine (pure logic)
│   └── deck.ts           # Card catalog, shuffle, deal
├── src/
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   ├── store.ts           # Zustand store, WebSocket message handling
│   ├── lib/
│   │   └── socket.ts      # WebSocket client with auto-reconnect
│   ├── components/
│   │   ├── Lobby.tsx       # Create/join room screen
│   │   ├── Table.tsx       # Main game view
│   │   ├── Hand.tsx        # Player's hand of cards
│   │   ├── Card.tsx        # Single card component
│   │   ├── PlayerSeat.tsx  # Other player info display
│   │   └── ColorPicker.tsx # Wild card color selection modal
│   └── index.css
├── shared/
│   └── types.ts           # Shared TypeScript types (client + server)
├── public/
│   └── cards/             # Card images organized by color folder
│       ├── Red/
│       ├── Yellow/
│       ├── Green/
│       ├── Blue/
│       └── Wild/
└── assets/
    └── no_mercy_cards.json # Card catalog reference
```

## Reconnect Support

- If a player disconnects (network drop, tab close), their seat is held for **2 minutes**
- Other players see a "Reconnecting..." status
- If it's the disconnected player's turn, the game pauses for 30 seconds then auto-skips
- After 2 minutes with no reconnect, the player is removed and their cards are shuffled back into the deck

## Configuration

| Setting | Default | Location |
|---------|---------|----------|
| WebSocket port | 3001 | `server/index.ts` |
| Vite dev port | 3000 | `vite.config.ts` |
| Max rooms | 5 | `server/index.ts` |
| Max players per room | 10 | `server/Room.ts` |
| Reconnect timeout | 2 min | `server/Room.ts` |
| Mercy rule limit | 25 cards | `server/engine.ts` |
| Starting hand size | 7 cards | `server/engine.ts` |
