# Networking Protocol

## Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-lobby` | `{roomId}` | Host creates lobby with client-generated room ID |
| `join-lobby` | `{roomId}` | Client joins lobby |
| `game-start` | `{}` | Host signals game start |
| `p1-input` | `{up,down,left,right,fire}` | Host broadcasts Yellow input (booleans) |
| `p2-input` | `{up,down,left,right,fire}` | Client broadcasts Blue input (booleans) |
| `pos-sync` | See below | Host broadcasts full position snapshot |
| `game-state` | See below | Host broadcasts full state correction |
| `snd` | `{a,n,l,m}` | Host relays audio event |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby-created` | — | (internal) |
| `player-joined` | — | Host notified that client joined |
| `game-start` | `{}` | Relayed to client |
| `p1-input` | `{up,...}` | Relayed to client |
| `p2-input` | `{up,...}` | Relayed to host |
| `pos-sync` | snapshot | Relayed to client |
| `game-state` | full state | Relayed to client |
| `snd` | `{a,n,l,m}` | Relayed to client |
| `player-left` | `{role}` | Broadcast when a player disconnects |

### join-lobby Response

```json
{
  "ok": true,
  "seed": 12345678,
  "started": false
}
```

`started: true` is returned when the game is already running — client starts immediately without waiting for `game-start`.

## Sync Channels

### pos-sync (20ms / 50fps)

Full position snapshot sent from host to client on every scan frame tick. Payload:

```json
{
  "sc": "dungeon",
  "lv": 3,
  "sp": 4,
  "st": 2,
  "ds": false,
  "dn": false,
  "bc": 1,
  "rt": "RADAR",
  "rn": 14,
  "wt": "blue",
  "tl": "open",
  "km": 3,
  "kb": 2,
  "kt": 1,
  "al": false,
  "dt": "easy",
  "du": 2,
  "iw": [...],
  "wh": [...],
  "wv": [...],
  "fc": { "dungeon": 120, "getReady": 0, ... },
  "p": [
    { "st": "alive", "x": 100, "y": 51, "d": "right", "co": 3, "ro": 2,
      "as": 4, "li": 3, "sc": 0,
      "fc": { "js": 0, "de": 0, "en": 0 },
      "bu": { "x": 108, "y": 59, "d": "right", "bw": 8, "bh": 2, "col": 0, "row": 2 }
    },
    { ... }
  ],
  "m": [
    { "tp": "burwor", "st": "alive", "x": 154, "y": 75, "d": "left",
      "co": 6, "ro": 4, "vi": true, "as": 2, "rc": 6,
      "fc": { ... },
      "pi": { "pr": "left", "se": "up", "le": 3, "sp": 2, "im": true, "ip": 12, "di": false },
      "bu": null
    },
    ...
  ]
}
```

### game-state (2s)

Full state correction sent every 2 seconds. Same structure as `serializeState()`. Covers edge cases missed by pos-sync (scene transitions during reconnect, wall layout on new level, etc.).

### input (20ms)

Both sides broadcast their local player's current key state as 5 booleans: `{up, down, left, right, fire}`. Only `=== true` values are transmitted (not `'hold'` debounce state — that is managed locally per side).

### snd

```json
{ "a": "play",    "n": "Fire",   "l": false }
{ "a": "stop",    "n": "Speed3"            }
{ "a": "stopAll", "m": false               }
```

## Bandwidth Estimate

| Channel | Size | Rate | ~KB/s |
|---------|------|------|-------|
| pos-sync | ~800 bytes | 50/s | ~40 |
| p1-input | ~30 bytes | 50/s | ~1.5 |
| p2-input | ~30 bytes | 50/s | ~1.5 |
| game-state | ~1200 bytes | 0.5/s | ~0.6 |
| snd | ~20 bytes | occasional | ~0.1 |
| **Total outbound (host)** | | | **~45 KB/s** |

Suitable for LAN and broadband WAN connections.

## Server Lobby Storage

```javascript
lobbies: Map<roomId, {
  host: Socket,
  client: Socket | null,
  seed: number,
  started: boolean
}>

pending: Map<roomId, Array<{ws: Socket, cb: Function}>>
```

The `pending` map holds clients who connected before the host. They wait up to 30 seconds for the host to appear. When the host creates the lobby, pending clients are automatically promoted.

When the **host** disconnects: lobby deleted.
When the **client** disconnects: `lobby.client = null` (lobby preserved, client can rejoin).
