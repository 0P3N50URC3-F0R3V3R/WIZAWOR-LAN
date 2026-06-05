/**
 * Wizard of Wor — AI Player
 * Loaded BEFORE w.js. Controls Blue Worrior (P2) in single-player AI modes.
 * Modes: 'coop' (hunts monsters only) | 'pvp' (hunts monsters + player).
 * Activated via window._wowAIMode set by the submenu when player presses '1'.
 */
(function () {
    'use strict';

    // ── Constants ─────────────────────────────────────────────────────────────
    var AI_TICK_MS            = 100;
    var AI_SPAWN_SAFE_CELLS   = 5;
    var AI_AMBUSH_TIMEOUT     = 2000;
    var AI_PATROL_TIMEOUT     = 2000;
    var AI_PERIODIC_MIN       = 20000;
    var AI_PERIODIC_MAX       = 35000;
    var AI_AGGRO_BURST_MIN    = 5000;
    var AI_AGGRO_BURST_MAX    = 10000;
    var AI_SCORE_THRESHOLD    = 5000;
    var AI_SCORE_BOOST        = 0.15;
    var AI_TIMER_JITTER       = 0.30;
    var AI_WORLUK_CHASE_CELLS = 2;
    var AI_WIZARD_REPOS_MIN   = 4000;
    var AI_WIZARD_REPOS_MAX   = 8000;
    var AI_WIZARD_SUPP_MIN    = 2000;
    var AI_WIZARD_SUPP_MAX    = 5000;
    var AI_WIZARD_MOVE_MS     = 200;
    var AI_INVIS_NEARBY_CELLS = 2;

    // Grid geometry (mirrors w.js)
    var GRID_COLS    = 11;
    var GRID_ROWS    = 6;
    var P2_SPAWN_COL = 11;
    var P2_SPAWN_ROW = 6;
    var TELE_ROW     = 3;

    // P2 key codes (blueControl = 'keyboardWasd')
    var P2 = { up: 87, down: 83, left: 65, right: 68, fire: 16 };

    // ── Runtime state ─────────────────────────────────────────────────────────
    var _b = null;  // engine (b)
    var _e = null;  // game   (e)
    var _aiState           = 'HUNT';
    var _prevState         = 'HUNT';
    var _stateTimer        = 0;
    var _pathDir           = null;
    var _pathStartKey      = null;
    var _pathTargetKey     = null;
    var _pathTime          = 0;
    var _chokepoints       = [];
    var _chokeTarget       = null;
    var _wizardReposTimer  = 0;
    var _wizardSuppTimer   = 0;
    var _wizardMoveTimer   = 0;
    var _wizardVantage     = null;
    var _pvpPeriodicTimer  = 0;
    var _pvpAggroBurstEnd  = 0;
    var _lastMonsterCount  = 0;
    var _patrolDir         = null;
    var _huntTarget        = null;
    var _huntTargetTimer   = 0;
    var _evadeDir          = null;
    var _evadeUntil        = 0;
    var _pendingAIStart    = false;
    var _lastLevel         = 0;

    // ── Submenu overlay ───────────────────────────────────────────────────────
    var _submenu = null;

    function makeEl(tag, id, cls, text, clickChoice) {
        var el = document.createElement(tag);
        if (id)  el.id = id;
        if (cls) el.className = cls;
        if (text !== undefined) el.textContent = text;
        if (clickChoice !== undefined)
            el.addEventListener('click', function () { window._wowAISelect(clickChoice); });
        return el;
    }

    function buildSubmenu() {
        if (_submenu) return;
        var style = document.createElement('style');
        style.textContent = [
            '#wowAIOverlay{position:fixed;z-index:9999;inset:0;background:#000;',
            'display:none;align-items:center;justify-content:center;',
            'font-family:"C64ProRegular",monospace}',
            '#wowAIBox{width:420px;max-width:92vw;border:2px solid #30E6C6;',
            'background:#050505;padding:32px;text-align:center;box-sizing:border-box}',
            '#wowAITitle{font-family:"WizardOfWor",serif;font-size:26px;',
            'color:#DFF60A;letter-spacing:2px;margin-bottom:4px}',
            '#wowAISub{font-size:12px;color:#30E6C6;letter-spacing:4px;margin-bottom:28px}',
            '.wowAIOpt{font-size:14px;color:#FDFEFC;padding:10px 0;cursor:pointer;',
            'letter-spacing:2px;border-bottom:1px solid #111}',
            '.wowAIOpt:last-child{border-bottom:none}',
            '.wowAIOpt:hover{color:#DFF60A}',
            '#wowAICancel{margin-top:16px;font-size:10px;color:#444;cursor:pointer}',
            '#wowAICancel:hover{color:#70746F}'
        ].join('');
        document.head.appendChild(style);

        var box = makeEl('div', 'wowAIBox');
        box.appendChild(makeEl('div', 'wowAITitle',  null, 'WIZARD OF WOR'));
        box.appendChild(makeEl('div', 'wowAISub',    null, 'SINGLE PLAYER'));
        box.appendChild(makeEl('div', null, 'wowAIOpt', '1 — PLAY ALONE',            1));
        box.appendChild(makeEl('div', null, 'wowAIOpt', '2 — PLAY WITH FRIENDLY BOT', 2));
        box.appendChild(makeEl('div', null, 'wowAIOpt', '3 — PLAY WITH HOSTILE BOT',  3));
        box.appendChild(makeEl('div', 'wowAICancel', null, 'ESC — CANCEL',            0));

        _submenu = makeEl('div', 'wowAIOverlay');
        _submenu.appendChild(box);
        document.body.appendChild(_submenu);
    }

    function showSubmenu() { buildSubmenu(); _submenu.style.display = 'flex'; }
    function hideSubmenu() { if (_submenu) _submenu.style.display = 'none'; }

    window._wowAISelect = function (choice) {
        hideSubmenu();
        if (choice === 0) return;
        if (choice === 1) {
            if (_b && _e) _e.startNewGame(1);
            return;
        }
        window._wowAIMode = (choice === 2) ? 'coop' : 'pvp';
        if (_b && _e) {
            _lastLevel = 0;
            _aiState = 'HUNT';
            _stateTimer = Date.now();
            scoreChokepoints();
            _lastMonsterCount = 0;
            _e.startNewGame(2);
        } else {
            _pendingAIStart = true;
        }
    };

    document.addEventListener('keydown', function (ev) {
        if (!_submenu || _submenu.style.display !== 'flex') return;
        var k = ev.key;
        if (k === '1')      { ev.preventDefault(); window._wowAISelect(1); }
        else if (k === '2') { ev.preventDefault(); window._wowAISelect(2); }
        else if (k === '3') { ev.preventDefault(); window._wowAISelect(3); }
        else if (k === 'Escape') { ev.preventDefault(); window._wowAISelect(0); }
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function jitter(ms) {
        return ms * (1 + AI_TIMER_JITTER * (Math.random() * 2 - 1));
    }

    function setAIKeys(dir, fire) {
        var pk = _b.pressedKeys;
        pk[P2.up]    = dir === 'up';
        pk[P2.down]  = dir === 'down';
        pk[P2.left]  = dir === 'left';
        pk[P2.right] = dir === 'right';
        pk[P2.fire]  = fire === true;
    }

    function releaseAIKeys() {
        var pk = _b.pressedKeys;
        pk[P2.up] = pk[P2.down] = pk[P2.left] = pk[P2.right] = pk[P2.fire] = false;
    }

    // ── BFS pathfinding ───────────────────────────────────────────────────────
    function bfsNeighbors(col, row) {
        var n = [];
        if (row > 1          && !_e.innerWallCollision(col, row, 'up'))
            n.push({ col: col,     row: row - 1, dir: 'up' });
        if (row < GRID_ROWS  && !_e.innerWallCollision(col, row, 'down'))
            n.push({ col: col,     row: row + 1, dir: 'down' });
        if (col > 1          && !_e.innerWallCollision(col, row, 'left'))
            n.push({ col: col - 1, row: row,     dir: 'left' });
        if (col < GRID_COLS  && !_e.innerWallCollision(col, row, 'right'))
            n.push({ col: col + 1, row: row,     dir: 'right' });
        // Teleporter edges — BFS treats them as zero-cost shortcuts when open
        if (_e.teleportStatus === 'open') {
            if (col === 1         && row === TELE_ROW)
                n.push({ col: GRID_COLS, row: TELE_ROW, dir: 'left' });
            if (col === GRID_COLS && row === TELE_ROW)
                n.push({ col: 1,         row: TELE_ROW, dir: 'right' });
        }
        return n;
    }

    function bfsPath(fc, fr, tc, tr) {
        if (fc === tc && fr === tr) return null;
        var visited = {};
        var queue = [{ col: fc, row: fr, dir: null }];
        visited[fc + ',' + fr] = true;
        while (queue.length) {
            var cur = queue.shift();
            var nb = bfsNeighbors(cur.col, cur.row);
            for (var i = 0; i < nb.length; i++) {
                var n = nb[i];
                var key = n.col + ',' + n.row;
                if (visited[key]) continue;
                visited[key] = true;
                var first = cur.dir || n.dir;
                if (n.col === tc && n.row === tr) return first;
                queue.push({ col: n.col, row: n.row, dir: first });
            }
        }
        return null;
    }

    // Like bfsPath but treats non-target monster cells as walls.
    // Gives a path that doesn't walk into occupied cells.
    function bfsPathSafe(fc, fr, tc, tr) {
        if (fc === tc && fr === tr) return null;
        var visited = {};
        var queue = [{ col: fc, row: fr, dir: null }];
        visited[fc + ',' + fr] = true;
        while (queue.length) {
            var cur = queue.shift();
            var nb = bfsNeighbors(cur.col, cur.row);
            for (var i = 0; i < nb.length; i++) {
                var n = nb[i];
                var key = n.col + ',' + n.row;
                if (visited[key]) continue;
                if (cellHasMonster(n.col, n.row) && !(n.col === tc && n.row === tr)) continue;
                visited[key] = true;
                var first = cur.dir || n.dir;
                if (n.col === tc && n.row === tr) return first;
                queue.push({ col: n.col, row: n.row, dir: first });
            }
        }
        return null;
    }

    // Recalculate BFS immediately when the AI enters a new cell (handles
    // walls and corners). Throttle recalcs driven by TARGET movement to
    // 500 ms so a monster oscillating between two cells can't flip the
    // AI direction every tick, causing back-and-forth.
    function getPathDir(tc, tr) {
        var ai = _e.players[1];
        var sk = ai.col + ',' + ai.row;
        var tk = tc + ',' + tr;
        if (sk !== _pathStartKey || tk !== _pathTargetKey) {
            _pathDir       = bfsPath(ai.col, ai.row, tc, tr);
            _pathStartKey  = sk;
            _pathTargetKey = tk;
        }
        return _pathDir;
    }

    function clearPath() {
        _pathDir = null; _pathStartKey = null; _pathTargetKey = null; _pathTime = 0;
        _evadeDir = null; _evadeUntil = 0;
    }

    // ── Chokepoint scoring ────────────────────────────────────────────────────
    function rayLen(col, row, dir) {
        var c = col, r = row, len = 0;
        while (true) {
            if (_e.innerWallCollision(c, r, dir)) break;
            if      (dir === 'up')    { r--; if (r < 1)         break; }
            else if (dir === 'down')  { r++; if (r > GRID_ROWS) break; }
            else if (dir === 'left')  { c--; if (c < 1)         break; }
            else if (dir === 'right') { c++; if (c > GRID_COLS) break; }
            len++;
        }
        return len;
    }

    function scoreChokepoints() {
        var all = [];
        for (var col = 1; col <= GRID_COLS; col++) {
            for (var row = 1; row <= GRID_ROWS; row++) {
                var s = rayLen(col, row, 'up')   + rayLen(col, row, 'down') +
                        rayLen(col, row, 'left') + rayLen(col, row, 'right');
                all.push({ col: col, row: row, score: s });
            }
        }
        all.sort(function (a, b) { return b.score - a.score; });
        _chokepoints = all.slice(0, 3);
    }

    function bestChokepoint() {
        var p1 = _e.players[0];
        for (var i = 0; i < _chokepoints.length; i++) {
            var c = _chokepoints[i];
            if (c.col !== p1.col || c.row !== p1.row) return c;
        }
        return _chokepoints[0] || { col: 6, row: 3 };
    }

    // ── Line-of-sight & firing ────────────────────────────────────────────────
    function hasLOS(fc, fr, tc, tr) {
        if (fc === tc) {
            var minR = Math.min(fr, tr), maxR = Math.max(fr, tr);
            for (var r = minR; r < maxR; r++)
                if (_e.innerWallCollision(fc, r, 'down')) return false;
            return true;
        }
        if (fr === tr) {
            var minC = Math.min(fc, tc), maxC = Math.max(fc, tc);
            for (var c = minC; c < maxC; c++)
                if (_e.innerWallCollision(c, fr, 'right')) return false;
            return true;
        }
        return false;
    }

    function dirToward(fc, fr, tc, tr) {
        if (fc === tc) return fr < tr ? 'down' : 'up';
        if (fr === tr) return fc < tc ? 'right' : 'left';
        return null;
    }

    // Only returns a direction when the AI already faces the target.
    // This prevents firing bullets in the wrong direction.
    function checkFire(tc, tr) {
        var ai = _e.players[1];
        if (ai.bullet) return null;
        var dir = dirToward(ai.col, ai.row, tc, tr);
        if (!dir) return null;
        if (ai.d !== dir) return null;
        if (!hasLOS(ai.col, ai.row, tc, tr)) return null;
        return dir;
    }

    // Nearest monster aligned (same row or col) with clear wall LOS.
    function nearestLOSMonster(monsters) {
        var ai = _e.players[1];
        var best = null, bestDist = Infinity;
        for (var i = 0; i < monsters.length; i++) {
            var m = monsters[i];
            if (!dirToward(ai.col, ai.row, m.col, m.row)) continue;
            if (!hasLOS(ai.col, ai.row, m.col, m.row)) continue;
            var d = cellDist(ai.col, ai.row, m.col, m.row);
            if (d < bestDist) { bestDist = d; best = m; }
        }
        return best;
    }

    function cellDist(c1, r1, c2, r2) {
        return Math.abs(c1 - c2) + Math.abs(r1 - r2);
    }

    function nextCell(col, row, dir) {
        if (dir === 'up')    return { col: col,     row: row - 1 };
        if (dir === 'down')  return { col: col,     row: row + 1 };
        if (dir === 'left')  return { col: col - 1, row: row     };
        if (dir === 'right') return { col: col + 1, row: row     };
        return null;
    }

    function monsterAtCell(col, row) {
        var ms = liveMonsters();
        for (var i = 0; i < ms.length; i++)
            if (ms[i].col === col && ms[i].row === row) return true;
        return false;
    }

    // True if a monster occupies OR is moving into this cell next step.
    function cellDangerous(col, row) {
        var ms = liveMonsters();
        for (var i = 0; i < ms.length; i++) {
            var m = ms[i];
            if (m.col === col && m.row === row) return true;
            var mc = nextCell(m.col, m.row, m.d);
            if (mc && mc.col === col && mc.row === row) return true;
        }
        return cellHasBulletThreat(col, row);
    }

    // Exact-position only — no movement prediction, no bullet threats.
    // Use this for path-planning decisions; cellDangerous for emergency escape.
    function cellHasMonster(col, row) {
        var ms = liveMonsters();
        for (var i = 0; i < ms.length; i++) {
            if (ms[i].col === col && ms[i].row === row) return true;
        }
        return false;
    }

    // True if a bullet will pass through (col, row) within the next ~4 cells.
    function bulletThreatensCell(bullet, col, row) {
        if (!bullet || !bullet.d) return false;
        var bc = Math.round((bullet.x - 34) / 24) + 1;
        var br = Math.round((bullet.y - 3)  / 24) + 1;
        for (var step = 0; step <= 4; step++) {
            if (bc < 1 || bc > GRID_COLS || br < 1 || br > GRID_ROWS) break;
            if (bc === col && br === row) return true;
            var nc = nextCell(bc, br, bullet.d);
            if (!nc) break;
            bc = nc.col; br = nc.row;
        }
        return false;
    }

    // Any live monster bullet, plus P1 bullet in pvp mode, threatens (col, row).
    function cellHasBulletThreat(col, row) {
        for (var i = 0; i < _e.monsters.length; i++) {
            if (bulletThreatensCell(_e.monsters[i].bullet, col, row)) return true;
        }
        if (window._wowAIMode === 'pvp') {
            var p1 = _e.players[0];
            if (p1 && bulletThreatensCell(p1.bullet, col, row)) return true;
        }
        return false;
    }

    // Returns the best escape direction if a bullet is heading for the AI's current cell.
    function findBulletEscape(ai) {
        var escDir = null;
        for (var i = 0; i < _e.monsters.length; i++) {
            var b = _e.monsters[i].bullet;
            if (b && bulletThreatensCell(b, ai.col, ai.row)) { escDir = b.d; break; }
        }
        if (!escDir && window._wowAIMode === 'pvp') {
            var p1b = _e.players[0] && _e.players[0].bullet;
            if (p1b && bulletThreatensCell(p1b, ai.col, ai.row)) escDir = p1b.d;
        }
        if (!escDir) return null;
        var tc = _huntTarget ? _huntTarget.col : 6;
        var tr = _huntTarget ? _huntTarget.row : 3;
        return evadeDir(ai.col, ai.row, escDir, tc, tr);
    }

    // Pick perpendicular safe direction when blocked, preferring the option
    // that moves closer to (tc, tr) to avoid random oscillation.
    function evadeDir(col, row, blockedDir, tc, tr) {
        var perp = {
            up: ['left', 'right'], down: ['left', 'right'],
            left: ['up', 'down'],  right: ['up', 'down']
        };
        var rev  = { up: 'down', down: 'up', left: 'right', right: 'left' };
        var opts = (perp[blockedDir] || []).filter(function (d) {
            if (_e.innerWallCollision(col, row, d)) return false;
            var nc = nextCell(col, row, d);
            return !nc || !cellDangerous(nc.col, nc.row);
        });
        if (opts.length === 2 && tc !== undefined) {
            var nc0 = nextCell(col, row, opts[0]);
            var nc1 = nextCell(col, row, opts[1]);
            return cellDist(nc0.col, nc0.row, tc, tr) <= cellDist(nc1.col, nc1.row, tc, tr)
                ? opts[0] : opts[1];
        }
        if (opts.length) return opts[0];
        var rd = rev[blockedDir];
        if (rd && !_e.innerWallCollision(col, row, rd)) {
            var nc2 = nextCell(col, row, rd);
            if (!nc2 || !cellDangerous(nc2.col, nc2.row)) return rd;
        }
        return blockedDir;
    }

    // ── State management ──────────────────────────────────────────────────────
    function setState(s) {
        _prevState  = _aiState;
        _aiState    = s;
        _stateTimer = Date.now();
        clearPath();
        _huntTarget = null;
    }

    function elapsed() { return Date.now() - _stateTimer; }

    // ── Monster queries ───────────────────────────────────────────────────────
    function liveMonsters() {
        return _e.monsters.filter(function (m) { return m.status === 'alive'; });
    }

    function regularMonsters() {
        return liveMonsters().filter(function (m) {
            return m.type !== 'worluk' && m.type !== 'wizardOfWor';
        });
    }

    function nearestTo(col, row, monsters) {
        var best = null, bestDist = Infinity;
        for (var i = 0; i < monsters.length; i++) {
            var d = cellDist(col, row, monsters[i].col, monsters[i].row);
            if (d < bestDist) { bestDist = d; best = monsters[i]; }
        }
        return best;
    }

    function isWorlukPhase() {
        return _e.monsters.some(function (m) {
            return m.type === 'worluk' && m.status === 'alive';
        });
    }

    function isWizardPhase() {
        return _e.monsters.some(function (m) {
            return m.type === 'wizardOfWor' && m.status === 'alive';
        });
    }

    function hasInvisibleMonsters() {
        return _e.monsters.some(function (m) {
            return m.status === 'alive' && m.visible === false;
        });
    }

    // ── Movement helper ───────────────────────────────────────────────────────
    // Always inject the BFS direction; the engine only accepts perpendicular
    // turns at exact grid intersections so it handles the buffering naturally.
    // Stops if the immediate next cell is occupied by a live monster (instant-death).
    function moveToward(tc, tr) {
        var ai  = _e.players[1];
        if (ai.col === tc && ai.row === tr) { releaseAIKeys(); return; }
        var dir = getPathDir(tc, tr);
        if (dir) {
            var nc = nextCell(ai.col, ai.row, dir);
            if (nc && cellDangerous(nc.col, nc.row)) { releaseAIKeys(); return; }
        }
        setAIKeys(dir || ai.d, false);
    }

    // ── HUNT ──────────────────────────────────────────────────────────────────
    function tickHunt() {
        var ai = _e.players[1];
        var monsters = regularMonsters();
        if (!monsters.length) { setState('AMBUSH'); return; }

        var now = Date.now();

        // Re-target: immediately switch to any LOS monster closer than current target
        // (it's in the corridor ahead); fall back to nearest every 3 s.
        var losM = nearestLOSMonster(monsters);
        if (!_huntTarget || _huntTarget.status !== 'alive') {
            _huntTarget = nearestTo(ai.col, ai.row, monsters);
            _huntTargetTimer = now;
        } else if (losM && cellDist(ai.col, ai.row, losM.col, losM.row) <
                           cellDist(ai.col, ai.row, _huntTarget.col, _huntTarget.row)) {
            _huntTarget = losM; _huntTargetTimer = now;
        } else if (now - _huntTargetTimer > 3000) {
            _huntTarget = nearestTo(ai.col, ai.row, monsters);
            _huntTargetTimer = now;
        }

        // Fire at any monster aligned with current facing direction
        if (!ai.bullet) {
            for (var fi = 0; fi < monsters.length; fi++) {
                if (checkFire(monsters[fi].col, monsters[fi].row)) {
                    _huntTarget = monsters[fi]; _huntTargetTimer = now;
                    setAIKeys(ai.d, true); return;
                }
            }
        }

        // Safe BFS routes around non-target monster cells.
        var dir = bfsPathSafe(ai.col, ai.row, _huntTarget.col, _huntTarget.row)
               || getPathDir(_huntTarget.col, _huntTarget.row)
               || ai.d || 'right';

        var nc = nextCell(ai.col, ai.row, dir);

        // Monster moved into next cell since BFS computed — face it so fire
        // check triggers next tick before AI physically reaches the cell.
        if (nc && cellHasMonster(nc.col, nc.row)) {
            setAIKeys(dir, false); return;
        }

        // Look-ahead: pre-inject upcoming turn so engine acts on it at the intersection.
        if (nc) {
            var nextDir = bfsPathSafe(nc.col, nc.row, _huntTarget.col, _huntTarget.row)
                       || bfsPath(nc.col, nc.row, _huntTarget.col, _huntTarget.row);
            if (nextDir && nextDir !== dir) {
                setAIKeys(nextDir, false); return;
            }
        }

        setAIKeys(dir, false);
    }

    // ── AMBUSH ────────────────────────────────────────────────────────────────
    function tickAmbush() {
        var ai = _e.players[1];
        if (!_chokeTarget) _chokeTarget = bestChokepoint();
        var cp = _chokeTarget;

        if (ai.col === cp.col && ai.row === cp.row) {
            // At the chokepoint: fire if a monster is already in our line of sight,
            // or hold still. Injecting a direction key would move us off the spot.
            var monsters = regularMonsters();
            var fired = false;
            for (var i = 0; i < monsters.length; i++) {
                var fd = checkFire(monsters[i].col, monsters[i].row);
                if (fd) { setAIKeys(fd, true); fired = true; break; }
            }
            if (!fired) releaseAIKeys();
            if (elapsed() > jitter(AI_AMBUSH_TIMEOUT)) {
                _chokeTarget = null;
                setState('HUNT');
            }
        } else {
            moveToward(cp.col, cp.row);
        }
    }

    // ── PATROL ────────────────────────────────────────────────────────────────
    function tickPatrol() {
        var ai  = _e.players[1];
        var rev = { up: 'down', down: 'up', left: 'right', right: 'left' };

        // Only change direction when blocked by a wall — never on a timer.
        // Prefer any direction over reversing; reverse only as last resort.
        if (!_patrolDir || _e.innerWallCollision(ai.col, ai.row, _patrolDir)) {
            var all  = ['up', 'down', 'left', 'right'];
            var fwd  = all.filter(function (d) {
                return d !== rev[_patrolDir] && !_e.innerWallCollision(ai.col, ai.row, d);
            });
            var opts = fwd.length ? fwd : all.filter(function (d) {
                return !_e.innerWallCollision(ai.col, ai.row, d);
            });
            _patrolDir = opts.length
                ? opts[Math.floor(Math.random() * opts.length)]
                : (ai.d || 'right');
        }

        setAIKeys(_patrolDir, false);
        if (elapsed() > jitter(AI_PATROL_TIMEOUT)) {
            _patrolDir = null;
            setState('HUNT');
        }
    }

    // ── STALK ─────────────────────────────────────────────────────────────────
    function tickStalk() {
        var ai = _e.players[1];
        var p1 = _e.players[0];
        if (p1.status !== 'alive') { setState('HUNT'); return; }
        var dist = cellDist(ai.col, ai.row, p1.col, p1.row);
        if (dist > 3) {
            moveToward(p1.col, p1.row);
        } else {
            var d = dirToward(ai.col, ai.row, p1.col, p1.row);
            setAIKeys(d || ai.d, false);
        }
    }

    // ── AGGRO ─────────────────────────────────────────────────────────────────
    function tickAggro() {
        var ai = _e.players[1];
        var p1 = _e.players[0];
        if (p1.status !== 'alive') { setState('HUNT'); return; }
        var fireDir = checkFire(p1.col, p1.row);
        if (fireDir) { setAIKeys(fireDir, true); return; }
        moveToward(p1.col, p1.row);
    }

    // ── LURK ─────────────────────────────────────────────────────────────────
    function tickLurk() {
        var ai = _e.players[1];
        var p1 = _e.players[0];
        var monsters = regularMonsters();
        if (!monsters.length) { setState('HUNT'); return; }
        var nearest = nearestTo(p1.col, p1.row, monsters);
        var tc = Math.round((p1.col + nearest.col) / 2);
        var tr = Math.round((p1.row + nearest.row) / 2);
        tc = Math.max(1, Math.min(GRID_COLS, tc));
        tr = Math.max(1, Math.min(GRID_ROWS, tr));
        moveToward(tc, tr);
    }

    // ── WORLUK phase ─────────────────────────────────────────────────────────
    function tickWorluk() {
        var ai = _e.players[1];
        var worluk = null;
        for (var i = 0; i < _e.monsters.length; i++) {
            if (_e.monsters[i].type === 'worluk' && _e.monsters[i].status === 'alive') {
                worluk = _e.monsters[i]; break;
            }
        }
        if (!worluk) { setState('HUNT'); return; }

        var fireDir = checkFire(worluk.col, worluk.row);
        if (fireDir) { setAIKeys(fireDir, true); return; }

        var dist = cellDist(ai.col, ai.row, worluk.col, worluk.row);
        if (dist <= AI_WORLUK_CHASE_CELLS) {
            moveToward(worluk.col, worluk.row);
        } else {
            // Intercept near predicted escape teleporter
            var escapeLeft  = (worluk.d === 'left' || (worluk.d !== 'right' && worluk.col <= 6));
            var interceptCol = escapeLeft ? 2 : 10;
            var interceptRow = TELE_ROW + 1;
            moveToward(interceptCol, interceptRow);
        }
    }

    // ── WIZARD phase ─────────────────────────────────────────────────────────
    function tickWizard() {
        var ai = _e.players[1];
        var wizard = null;
        for (var i = 0; i < _e.monsters.length; i++) {
            if (_e.monsters[i].type === 'wizardOfWor' && _e.monsters[i].status === 'alive') {
                wizard = _e.monsters[i]; break;
            }
        }
        if (!wizard) { setState('HUNT'); return; }

        var now = Date.now();

        // 1. React fire: wizard visible in LOS and already facing it
        if (wizard.visible) {
            var fireDir = checkFire(wizard.col, wizard.row);
            if (fireDir) { setAIKeys(fireDir, true); return; }
        }

        // 2. PvP: opportunistic shot at nearby player
        if (window._wowAIMode === 'pvp') {
            var p1 = _e.players[0];
            if (p1 && p1.status === 'alive' &&
                    cellDist(ai.col, ai.row, p1.col, p1.row) <= 2) {
                var pDir = checkFire(p1.col, p1.row);
                if (pDir) { setAIKeys(pDir, true); return; }
            }
        }

        // 3. Suppression fire: random shot every 2-5s
        if (!_wizardSuppTimer) _wizardSuppTimer = now + jitter(AI_WIZARD_SUPP_MIN);
        if (now > _wizardSuppTimer && !ai.bullet) {
            _wizardSuppTimer = now + jitter((AI_WIZARD_SUPP_MIN + AI_WIZARD_SUPP_MAX) / 2);
            var dirs = ['up', 'down', 'left', 'right'].filter(function (d) {
                return !_e.innerWallCollision(ai.col, ai.row, d);
            });
            if (dirs.length) {
                setAIKeys(dirs[Math.floor(Math.random() * dirs.length)], true);
                return;
            }
        }

        // 4. Slow reposition: new vantage every 4-8s
        if (!_wizardReposTimer) _wizardReposTimer = now + jitter(AI_WIZARD_REPOS_MIN);
        if (now > _wizardReposTimer || !_wizardVantage) {
            _wizardReposTimer = now + jitter((AI_WIZARD_REPOS_MIN + AI_WIZARD_REPOS_MAX) / 2);
            var p1c = _e.players[0] ? _e.players[0].col : -1;
            var p1r = _e.players[0] ? _e.players[0].row : -1;
            _wizardVantage = null;
            for (var i = 0; i < _chokepoints.length; i++) {
                var cp = _chokepoints[i];
                if ((cp.col !== ai.col || cp.row !== ai.row) &&
                    (cp.col !== p1c    || cp.row !== p1r)) {
                    _wizardVantage = cp; break;
                }
            }
            if (!_wizardVantage) _wizardVantage = _chokepoints[0] || { col: 6, row: 3 };
        }

        // 5. Move toward vantage at half pace
        if (now > _wizardMoveTimer && _wizardVantage) {
            _wizardMoveTimer = now + AI_WIZARD_MOVE_MS;
            if (ai.col !== _wizardVantage.col || ai.row !== _wizardVantage.row) {
                moveToward(_wizardVantage.col, _wizardVantage.row);
            } else {
                releaseAIKeys();
            }
        }
    }

    // ── INVISIBLE_HUNT ────────────────────────────────────────────────────────
    function tickInvisibleHunt() {
        var ai = _e.players[1];
        var monsters = regularMonsters();
        if (!monsters.length) { tickAmbush(); return; }
        var target = nearestTo(ai.col, ai.row, monsters);

        var fireDir = checkFire(target.col, target.row);
        if (fireDir) { setAIKeys(fireDir, true); return; }
        moveToward(target.col, target.row);

        // PvP: opportunistic fire at adjacent player
        if (window._wowAIMode === 'pvp') {
            var p1 = _e.players[0];
            if (p1 && p1.status === 'alive' &&
                    cellDist(ai.col, ai.row, p1.col, p1.row) <= AI_INVIS_NEARBY_CELLS) {
                var pDir = checkFire(p1.col, p1.row);
                if (pDir) { setAIKeys(pDir, true); }
            }
        }
    }

    // ── Spawn safety ──────────────────────────────────────────────────────────
    function tickSpawnSafety() {
        var monsters = liveMonsters();
        var safe = true;
        for (var i = 0; i < monsters.length; i++) {
            var m = monsters[i];
            var inZone = m.col >= GRID_COLS - 3 ||
                cellDist(m.col, m.row, P2_SPAWN_COL, P2_SPAWN_ROW) <= AI_SPAWN_SAFE_CELLS;
            if (inZone) { safe = false; break; }
            // Also block if monster is about to enter the zone next step
            if (!_e.innerWallCollision(m.col, m.row, m.d)) {
                var mn = nextCell(m.col, m.row, m.d);
                if (mn && (mn.col >= GRID_COLS - 3 ||
                        cellDist(mn.col, mn.row, P2_SPAWN_COL, P2_SPAWN_ROW) <= AI_SPAWN_SAFE_CELLS)) {
                    safe = false; break;
                }
            }
        }
        if (safe) setAIKeys('up', false);
        else      releaseAIKeys();
    }

    // ── Co-op transitions ─────────────────────────────────────────────────────
    function checkCoopTransitions() {
        var monsters = regularMonsters();

        if (_aiState === 'AMBUSH' && elapsed() > jitter(AI_AMBUSH_TIMEOUT)) {
            _chokeTarget = null; setState('HUNT'); return;
        }
        if (_aiState === 'PATROL' && elapsed() > jitter(AI_PATROL_TIMEOUT)) {
            _patrolDir = null;
            setState('HUNT'); // always return to HUNT, not AMBUSH
            return;
        }

        var count = monsters.length;
        if (count < _lastMonsterCount) {
            var roll = Math.random();
            // 90% stay/return to HUNT, 10% AMBUSH, 0% PATROL
            if (roll < 0.10) { _chokeTarget = null; setState('AMBUSH'); }
            else             { if (_aiState !== 'HUNT') setState('HUNT'); }
        }
        _lastMonsterCount = count;
    }

    // ── PvP transitions ───────────────────────────────────────────────────────
    function checkPvpTransitions() {
        var ai       = _e.players[1];
        var p1       = _e.players[0];
        var monsters = regularMonsters();
        var now      = Date.now();

        // Endgame: ≤2 regular monsters → force AGGRO on player
        if (monsters.length <= 2 && p1 && p1.status === 'alive') {
            if (_aiState !== 'AGGRO') {
                _pvpAggroBurstEnd = now + 60000;
                setState('AGGRO');
            }
            return;
        }

        // Exit AGGRO burst when timer expires
        if (_aiState === 'AGGRO' && now > _pvpAggroBurstEnd) {
            setState(_prevState !== 'AGGRO' ? _prevState : 'HUNT');
            return;
        }

        // Exit STALK/LURK after timeout
        if ((_aiState === 'STALK' || _aiState === 'LURK') && elapsed() > jitter(8000)) {
            setState('HUNT'); return;
        }

        // Opportunistic: player nearby
        if (p1 && p1.status === 'alive' && _aiState !== 'AGGRO') {
            var dist  = cellDist(ai.col, ai.row, p1.col, p1.row);
            var chance = 0.40 + (p1.score > AI_SCORE_THRESHOLD ? AI_SCORE_BOOST : 0);
            if (dist <= 4 && Math.random() < chance / 10) {
                _pvpAggroBurstEnd = now + jitter((AI_AGGRO_BURST_MIN + AI_AGGRO_BURST_MAX) / 2);
                setState('AGGRO');
                return;
            }
        }

        // Periodic roll
        if (!_pvpPeriodicTimer) _pvpPeriodicTimer = now + jitter(AI_PERIODIC_MIN);
        if (now > _pvpPeriodicTimer) {
            _pvpPeriodicTimer = now + jitter((AI_PERIODIC_MIN + AI_PERIODIC_MAX) / 2);
            var boost = (p1 && p1.score > AI_SCORE_THRESHOLD) ? AI_SCORE_BOOST : 0;
            var roll  = Math.random();
            if (roll < 0.35 + boost) {
                setState('STALK');
            } else if (roll < 0.60 + boost) {
                _pvpAggroBurstEnd = now + jitter((AI_AGGRO_BURST_MIN + AI_AGGRO_BURST_MAX) / 2);
                setState('AGGRO');
            } else if (roll < 0.80 + boost) {
                setState('LURK');
            } else {
                setState('HUNT');
            }
            return;
        }

        checkCoopTransitions();
    }

    // ── Main tick ─────────────────────────────────────────────────────────────
    function aiTick() {
        if (!window._wowAIMode || !_b || !_e) return;
        var ai = _e.players[1];
        if (!ai) return;

        // Level change
        if (_e.scene === 'dungeon' && _e.level !== _lastLevel) {
            _lastLevel        = _e.level;
            _chokeTarget      = null;
            _wizardVantage    = null;
            _patrolDir        = null;
            _huntTarget       = null;
            _wizardSuppTimer  = 0;
            _wizardReposTimer = 0;
            _lastMonsterCount = regularMonsters().length;
            setState('HUNT');
            scoreChokepoints();
        }

        var scene = _e.scene;
        if (scene === 'getReady' || scene === 'gameOver') { releaseAIKeys(); return; }
        if (scene !== 'dungeon' && ai.status !== 'wait') return;

        // Waiting at spawn door — press up when clear, hold back when unsafe
        if (ai.status === 'wait') { tickSpawnSafety(); return; }
        if (ai.status !== 'alive')    { releaseAIKeys(); return; }

        // Bullet dodge — highest priority regardless of state
        var bEscape = findBulletEscape(ai);
        if (bEscape) { setAIKeys(bEscape, false); return; }

        // Monster about to step into AI's cell (no wall between them) — escape
        var chargingMs = liveMonsters();
        for (var ci = 0; ci < chargingMs.length; ci++) {
            var cm = chargingMs[ci];
            if (_e.innerWallCollision(cm.col, cm.row, cm.d)) continue;
            var cmNext = nextCell(cm.col, cm.row, cm.d);
            if (cmNext && cmNext.col === ai.col && cmNext.row === ai.row) {
                var escD = evadeDir(ai.col, ai.row, cm.d,
                    _huntTarget ? _huntTarget.col : 6,
                    _huntTarget ? _huntTarget.row : 3);
                setAIKeys(escD, false); return;
            }
        }

        // Special phase overrides (priority: Worluk > Wizard)
        if (isWorlukPhase()) { tickWorluk(); return; }
        if (isWizardPhase()) { tickWizard(); return; }

        // Invisible monster sub-mode
        if (hasInvisibleMonsters()) { tickInvisibleHunt(); return; }

        // Normal state machine
        if (window._wowAIMode === 'pvp') {
            checkPvpTransitions();
        } else {
            checkCoopTransitions();
        }

        switch (_aiState) {
            case 'HUNT':   tickHunt();   break;
            case 'AMBUSH': tickAmbush(); break;
            case 'PATROL': tickPatrol(); break;
            case 'STALK':  tickStalk();  break;
            case 'AGGRO':  tickAggro();  break;
            case 'LURK':   tickLurk();   break;
            default:       tickHunt();
        }
    }

    // ── _wowReady hook ────────────────────────────────────────────────────────
    window._wowReady = function (b, e) {
        _b = b;
        _e = e;
        b.options.blueControl = 'keyboardWasd';

        // Only intercept scanTitle when not in online multiplayer
        if (!window._wowMP) {
            var _origScanTitle = e.scanTitle.bind(e);
            e.scanTitle = function () {
                if (b.pressedKeys[49] === true) {
                    b.pressedKeys[49] = false;
                    showSubmenu();
                    return;
                }
                _origScanTitle();
            };
        }

        if (_pendingAIStart) {
            _pendingAIStart = false;
            scoreChokepoints();
            _e.startNewGame(2);
        }

        setInterval(aiTick, AI_TICK_MS);
    };

})();
