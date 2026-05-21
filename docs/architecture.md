# Architecture

## Overview

The game is a **host-authoritative** real-time multiplayer system built on top of a single-player browser game engine.

```
┌─────────────────────────────────────────────────────┐
│                  Node.js Server                      │
│  Express (static files) + Socket.IO (relay only)    │
│  No game logic — pure event relay between clients   │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
    ┌──────────┴──────┐  ┌────────┴─────────┐
    │   HOST (Yellow) │  │  CLIENT (Blue)   │
    │                 │  │                  │
    │  Full game loop │  │  Render only     │
    │  Authoritative  │  │  No scan logic   │
    │  All physics    │  │  Receives state  │
    │  All AI         │  │  Sends input     │
    └─────────────────┘  └──────────────────┘
```

## Host Responsibilities

- Runs the complete game engine (scan loop at 50fps)
- Executes all game logic: player movement, monster AI, collision detection, bullet physics, scoring, level transitions
- Broadcasts position snapshots to the client every 20ms
- Broadcasts full state correction every 2s
- Relays audio events to the client
- Receives and injects client (Blue) input into the engine

## Client Responsibilities

- Replaces the scan loop with a stub (only increments `scanFrameCounter`, plays queued audio)
- Renders based on state received from the host via pos-sync
- Captures Arrow+Enter input and sends to host every 20ms
- Receives and injects host (Yellow) input into its local engine for visual rendering

## Why Host-Authoritative

The original `w.js` game engine uses `Math.random()` extensively for monster AI direction decisions. Even with a shared seed, scan-frame timing differences between two browsers would cause RNG divergence. Running logic only on the host eliminates this entirely.

## Seeded PRNG

`multiplayer.js` overrides `Math.random` with a [mulberry32](https://github.com/bryc/code/blob/master/jshash/PRNGs.md) seeded PRNG **before** `w.js` loads. The server generates a seed when the lobby is created and sends it to both players. Both sides call `_wowResetSeed()` at game start to synchronise to the same PRNG state.

On the client the seed only matters for the brief moment before pos-sync takes over — monster positions on the client are immediately authoritative from the host.

## Engine Hooks

Three minimal additions to `w.js` expose the private game engine to `multiplayer.js`:

```javascript
window._wowEngine    = b;                      // engine object (pressedKeys, audio, options)
window._wowGame      = e;                      // game state object
window._wowNewBullet = (owner,x,y,d) => new I(owner,x,y,d);  // bullet factory
window._wowNewMonster = (type) => new B(type);                 // monster factory
```

These are appended at the end of the resource-load callback in `w.js` and call the `window._wowReady(b, e)` hook that `multiplayer.js` sets up before `w.js` loads.
