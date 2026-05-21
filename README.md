# Wizard of Wor — Online Multiplayer Remake

A faithful browser remake of the 1981 Commodore 64 arcade classic, extended with real-time online multiplayer via Socket.IO.

## Quick Start

```
node server.js
```

Open `http://localhost:3000/lobby.html` to create or join a game.

## Controls

Both players use the same control scheme:

| Action | Key |
|--------|-----|
| Move   | Arrow keys |
| Fire   | Enter |

- **Yellow Worrior** — Host (Player 1, spawns left)
- **Blue Worrior** — Client (Player 2, spawns right)

## Modes

| Key | Mode |
|-----|------|
| `1` | Single Player |
| `2` | Local Multiplayer (same machine) |
| `3` | Online Multiplayer → lobby |

## Requirements

- Node.js **or** use the bundled `node.exe` (Windows, double-click `start_server.bat`)
- Modern browser (Chrome, Firefox, Edge)

## Documentation

See [`docs/`](docs/) for full technical documentation:

- [Architecture](docs/architecture.md)
- [Multiplayer System](docs/multiplayer.md)
- [Networking Protocol](docs/networking.md)
- [Game Mechanics](docs/game-mechanics.md)
- [File Structure](docs/file-structure.md)
