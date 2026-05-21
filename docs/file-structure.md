# File Structure

```
wizardofwar/
│
├── server.js               # Node.js Express + Socket.IO multiplayer server
├── package.json            # Dependencies: express, socket.io
├── package-lock.json       # Locked dependency versions
├── node.exe                # Bundled Node.js executable (Windows portable)
├── start_server.bat        # Double-click to start server (uses bundled node.exe)
│
├── index.html              # Main game page
├── lobby.html              # Multiplayer lobby (create/join rooms)
├── Unsupported browser.html # Fallback for browsers without AudioContext/rAF
├── favicon.ico
│
├── js/
│   └── v5.0/
│       ├── w.js            # Main game engine (minified, ~2300 lines)
│       └── multiplayer.js  # Multiplayer layer (loaded before w.js)
│
├── audio/
│   └── v2.0/               # 23 OGG audio files
│       ├── Speed1-7.ogg    # Looping dungeon music (7 speeds)
│       ├── Death.ogg
│       ├── WizardDeath.ogg
│       ├── WorlukDeath.ogg
│       ├── Fire.ogg
│       ├── EnemyFire.ogg
│       ├── Teleport.ogg
│       ├── Visible.ogg
│       ├── Enter.ogg
│       ├── GetReady.ogg
│       ├── GameOver.ogg
│       ├── Doublescore.ogg
│       ├── Worluk.ogg
│       ├── WizardEscape.ogg
│       ├── WorlukEscape.ogg
│       └── Shooted.ogg
│
├── fonts/
│   └── v2.0/
│       ├── wizardofwor-webfont.woff       # Title/HUD font
│       └── c64_pro_v1.0-style-webfont-webfont.woff  # C64-style body font
│
├── images/
│   ├── v2.0/
│   │   └── wizard-of-wor-icon.png
│   ├── v3.0/
│   │   └── sprite.png      # Master sprite sheet (all game sprites, 248×355)
│   └── v4.0/
│       ├── menu-toggler.png
│       ├── noise.png        # CRT noise overlay texture
│       └── buy-me-a-coffee-button-dark.png
│
├── docs/                   # Technical documentation
│   ├── architecture.md
│   ├── multiplayer.md
│   ├── networking.md
│   ├── game-mechanics.md
│   └── file-structure.md   # (this file)
│
└── README.md
```

## Key Files Explained

### `server.js`
Express serves all static files. Socket.IO manages lobbies (`Map<roomId, lobby>`) and a pending-client queue (`Map<roomId, waiters[]>`). All game logic stays in the browser — the server only relays events between host and client.

### `js/v5.0/w.js`
Original minified game engine with 4 additions at the end of the resource-load callback:
```javascript
window._wowEngine    = b;
window._wowGame      = e;
window._wowNewBullet  = (owner, x, y, d) => new I(owner, x, y, d);
window._wowNewMonster = (type) => new B(type);
if (window._wowReady) window._wowReady(b, e);
```

### `js/v5.0/multiplayer.js`
Loaded **before** `w.js`. Responsibilities:
1. Override `Math.random` with mulberry32 seeded PRNG
2. Set `window._wowReady` hook before w.js calls it
3. Load Socket.IO client dynamically
4. Manage lobby overlay UI
5. Set up host/client roles, control mapping, input broadcast
6. Relay pos-sync and game-state to/from server
7. Manage reconnection logic

### `index.html`
Game canvas + sandwich menu. Two script tags added for multiplayer:
```html
<script src="js/v5.0/multiplayer.js?v=1"></script>
<script class="j" src="js/v5.0/w.js?v=1"></script>
```
The `.j` class on `w.js` causes the engine to remove it from the DOM after loading.

### `lobby.html`
Purely static — no socket connection. Generates a random 6-char hex room code client-side and redirects to `index.html?room=CODE&role=host|client`. All actual lobby communication happens inside `index.html` via `multiplayer.js`.

### `sprite.png`
248×355 pixel master sprite sheet containing all game sprites. The engine applies palette transforms at runtime via `getImageData`/`putImageData` to support 4 colour palettes (default, grayscale, vice, green). Indexed colour approach: palette index stored in R channel, engine maps to actual RGB.
