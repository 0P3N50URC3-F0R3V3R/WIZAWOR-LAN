# Game Mechanics

## Overview

Wizard of Wor is a cooperative/competitive dungeon shooter. Two Worriors (players) navigate a maze and shoot monsters for points. The game progresses through increasingly difficult dungeons.

## Grid System

- Internal canvas: 320×200 pixels, scaled 3× to 960×600 display
- Dungeon grid: 11 columns × 6 rows
- Cell size: 24×24 pixels
- Player/monster sprites: 18×18 pixels (centred in cell)
- Outer border walls: left x=29/293, top/bottom y=0/142
- Teleport portals: left and right edges at row 3

## Players

| Property | Yellow (P1) | Blue (P2) |
|----------|-------------|-----------|
| Spawn column | 1 (left) | 11 (right) |
| Spawn row | 6 (bottom) | 6 (bottom) |
| Initial direction | right | left |
| Starting lives | 3 | 3 |

Players enter the dungeon from the bottom by walking up. `frameCounters.entering` counts down and they auto-enter if the player doesn't press up manually.

**Status states:** `wait` → `enter` → `alive` → `dead` → (respawn or `out`)

## Monsters

| Type | Points | Notes |
|------|--------|-------|
| Burwor | 100 | Blue basic enemy, 6 per dungeon |
| Garwor | 200 | Becomes invisible, appears as Burwor |
| Thorwor | 500 | Yellow, becomes invisible |
| Worluk | 1000 | Fast, triggers Double Score if killed |
| Wizard of Wor | 2500 | Fires in 4 directions, can teleport |

Monsters start as Burwors and progressively transform to harder types. The Worluk appears after all Thorwors are dead. The Wizard of Wor has a 1-in-7 chance of appearing after the Worluk.

**Monster AI:** Grid-based pathfinding. Each monster has a `path` object with primary and secondary directions, step count, and pixel-level movement tracking (`inMovingPixels` 0-24 per grid cell).

**Visibility:** Garwors and Thorwors can become invisible. They reappear when near a player or at random intervals.

## Bullets

- Player bullets: 8×2 or 2×8 pixels, move 8 pixels every 2 scan frames (200px/s)
- Monster bullets: 8×2 or 2×8 pixels, move 8 pixels every 4 scan frames (100px/s)
- One bullet per entity at a time (fire-key debounced via `hold` state)
- Player bullet hitting player: shooter scores 1000 points, victim dies (except Wizard)
- Wizard touched by player: player loses a life, Wizard escapes

## Teleport Portals

Left portal at (x=34, row=3) and right portal at (x=274, row=3). Walking into them warps to the opposite side. Portals close after use and reopen after a delay (`teleportOpenDelay` frameCounter). Portals stay closed during Worluk and Wizard sequences.

## Scoring Events

| Event | Points |
|-------|--------|
| Kill Burwor | 100 |
| Kill Garwor | 200 |
| Kill Thorwor | 500 |
| Kill Worluk | 1000 |
| Kill Wizard of Wor | 2500 |
| Shoot other player | 1000 |
| All above during Double Score | ×2 |

## Level Progression

| Level range | Dungeon type |
|-------------|--------------|
| 1–3 | Easy layouts (random, no repeat) |
| 4 | Fixed layout |
| 5–7 | Easy layouts |
| 8–12 | Hard layouts |
| 13+ | Fixed layouts cycling every 6 levels |

Speed increases as monsters are killed: `e.speed` goes from 1 to 16. Higher speed = faster monster movement.

Bonus life awarded at levels 3 and 12 if player is still alive.

## Scene Flow

```
title ←→ enemyRoster
   ↓ (press 1/2/3)
getReady
   ↓ (~4s)
doubleScore  ← shows if Worluk killed previous level
   ↓ (~5s)
dungeon
   ↓ (all monsters dead)
getReady (next level)
   ↓ (both players dead)
gameOver
   ↓ (~8s)
title
```

## frameCounters

Key frame counters used for timing (at 50fps):

| Counter | Purpose |
|---------|---------|
| `getReady` | GetReady animation (GO appears at frame 60, transitions at frame 200) |
| `doubleScore` | Double score screen duration (~245 frames) |
| `dungeon` | Dungeon frame counter |
| `teleport` | Portal open/close state |
| `teleportOpenDelay` | Delay before portal reopens |
| `worlukDeathAnimation` | Worluk death flash |
| `worlukEscaped` | Worluk escape sequence |
| `wizardDeathAnimation` | Wizard death animation |
| `wizardEscaped` | Wizard escape sequence |
| `gameOver` | Game over screen duration |
