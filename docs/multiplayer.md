# Multiplayer System

## Lobby Flow

```
1. Host opens lobby.html → clicks "HOST GAME"
   → random 6-char hex room code generated client-side
   → redirected to index.html?room=XXXXXX&role=host

2. Host's page loads → socket connects → create-lobby emitted
   → server creates lobby, assigns seed, returns {ok, seed}
   → overlay shows room code + shareable invite link

3. Client opens invite link (index.html?room=XXXXXX&role=client)
   → socket connects → join-lobby emitted
   → server links client to lobby, returns {ok, seed, started}
   → if started=true: game starts immediately (reconnect case)
   → if started=false: overlay shows "Waiting for host to start"

4. Host clicks "START GAME"
   → socket emits game-start → server relays to client
   → both sides call startGame() → game begins
```

## Controls Mapping

Both players use Arrow keys + Enter. The key SLOTS used by the engine differ:

| Side   | Role   | Local keyboard | Engine slot   | Notes |
|--------|--------|----------------|---------------|-------|
| Host   | Yellow | Arrow + Enter  | keyboardArrows (slot 0) | direct local input |
| Host   | Blue   | (network)      | keyboardWasd (slot 1)   | injected from client's arrows |
| Client | Blue   | Arrow + Enter  | keyboardArrows (slot 0) | direct local input |
| Client | Yellow | (network)      | keyboardWasd (slot 1)   | injected from host's arrows |

On the client: `b.options.yellowControl = 'keyboardWasd'` and `b.options.blueControl = 'keyboardArrows'` are set in `_wowReady` to achieve this cross-mapping.

## Input Key Codes

```javascript
var P1 = { up: 38, right: 39, down: 40, left: 37, fire: 17 }; // Arrow + Enter(13→17)
var P2 = { up: 87, right: 68, down: 83, left: 65, fire: 16 }; // WASD + Shift (injection slots)
```

Note: Enter (keycode 13) is remapped to 17 by `w.js` `initKeyHandling`. Left Ctrl (17, location 1) is mapped to 0 (ignored). Right Ctrl stays at 17.

## Reconnection

### Client Reconnect (fresh page load or socket drop)

```
Client opens link while game running
  → tryJoin → server returns {started: true}
  → if engine loaded: startGame(false) → hideLobby()
  → if engine still loading: _pendingStart flag
      → _wowReady fires → startGame(false)
  → pos-sync restores full state within 20ms
```

### Client Socket Drop (auto-reconnect)

Socket.IO reconnects automatically. On `connect` event (reconnect branch):
- `tryJoin()` called with `joinRetries = 0`
- Server may briefly return "Room is full" if old socket not yet cleaned up → retries every 2s
- On success with `mp.gameStarted = true` → `startGame(true)` (no game reset)

### Host Disconnect

Client shows "Host disconnected" overlay → auto-redirects to `index.html` after 5 seconds.

### Host Reconnect / Page Refresh

Warning: `beforeunload` browser dialog shown when game is active. If host refreshes anyway:
- New socket → `create-lobby` with same room ID → lobby recreated
- Client (if still on page) retries join loop → reconnects → receives `player-joined` → host auto-sends `game-start`

## Race Condition: `player-left` After Reconnect

When a client's socket drops and immediately reconnects, the server processes the disconnect AFTER the new socket has already joined the room. The `player-left` event is sent to the room (excluding the old socket), but the new socket is now in the room and receives it.

Fix: `player-left` handler checks `data.role` (who left) not `mpRole` (who am I). A `{role: 'client'}` event received by a client is silently ignored — it was triggered by the client's own previous socket disconnecting.

## Audio

The host's `b.audio.request`, `b.audio.stop`, and `b.audio.stopAllSound` are monkey-patched to also emit `snd` socket events. The client receives these and calls the same audio methods locally. This gives the client full sound without any game logic.

All 23 audio files are OGG format:
- Speed1-7 (looping dungeon music, speed increases with level)
- Death, WizardDeath, WorlukDeath
- Fire, EnemyFire
- Teleport, Visible, Enter, GetReady, GameOver
- Doublescore, Worluk, WizardEscape, WorlukEscape, Shooted
