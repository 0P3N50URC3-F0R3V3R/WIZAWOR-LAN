/**
 * Wizard of Wor - Multiplayer Client
 * Loaded BEFORE w.js. Sets up seeded PRNG and socket relay.
 * Yellow (Player 1) = host. Blue (Player 2) = client.
 */
(function () {
    'use strict';

    // ── Seeded PRNG (mulberry32) ────────────────────────────────────────────
    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = (seed + 0x6D2B79F5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    var _rng = null;
    var _rngSeed = null;
    var _origRandom = Math.random.bind(Math);

    // Override Math.random before w.js loads
    Math.random = function () {
        return _rng ? _rng() : _origRandom();
    };

    window._wowSetSeed = function (seed) {
        _rngSeed = seed;
        _rng = mulberry32(seed);
    };

    window._wowResetSeed = function () {
        if (_rngSeed !== null) _rng = mulberry32(_rngSeed);
    };

    // ── Parse URL params ───────────────────────────────────────────────────
    var params = new URLSearchParams(window.location.search);
    var mpRoom = params.get('room');
    var mpRole = params.get('role'); // 'host' | 'client' | 'spectator' (set at runtime)

    if (!mpRoom || !mpRole) return; // Not in multiplayer mode

    // ── State ──────────────────────────────────────────────────────────────
    var mp = {
        room: mpRoom,
        role: mpRole,
        socket: null,
        gameStarted: false
    };
    window._wowMP = mp;

    // Key codes
    var P1 = { up: 38, right: 39, down: 40, left: 37, fire: 17 };
    var P2 = { up: 87, right: 68, down: 83, left: 65, fire: 16 };

    // ── Inject multiplayer.js's _wowReady hook (called by w.js after init) ─
    window._wowReady = function (b, e) {
        e.paused = true;
        mp._engine = b;
        mp._game   = e;

        // Client: Arrow+Enter = P2 controls. Yellow (P1) rendered from injected WASD.
        if (mpRole === 'client') {
            b.options.yellowControl = 'keyboardWasd';   // P1 slot reads WASD (injected from host)
            b.options.blueControl   = 'keyboardArrows'; // P2 slot reads Arrows (local keyboard)

            // Client does NOT run game logic — host is authoritative.
            // Replace scan routine with a stub: no collision, no death, no scene transitions,
            // no scanTitle (which would re-start game on Enter press).
            b.scanRoutine = function () {
                b.scanFrameCounter++;
                b.audio.playQueue();
            };

        }

        // ── Audio relay: host intercepts audio calls → sends to client ───────
        if (mpRole === 'host') {
            var _origRequest      = b.audio.request.bind(b.audio);
            var _origStop         = b.audio.stop.bind(b.audio);
            var _origStopAll      = b.audio.stopAllSound.bind(b.audio);

            b.audio.request = function (sound) {
                _origRequest(sound);
                if (mp.socket && mp.gameStarted) mp.socket.emit('snd', { a: 'play', n: sound.name, l: !!sound.loop });
            };
            b.audio.stop = function (name) {
                _origStop(name);
                if (mp.socket && mp.gameStarted) mp.socket.emit('snd', { a: 'stop', n: name });
            };
            b.audio.stopAllSound = function (mute) {
                _origStopAll(mute);
                if (mp.socket && mp.gameStarted) mp.socket.emit('snd', { a: 'stopAll', m: !!mute });
            };
        }

        // ── Input broadcast loop (20ms / 50fps) ───────────────────────────
        setInterval(function () {
            if (!mp.socket || !mp.socket.connected || !mp.gameStarted) return;
            if (mpRole === 'spectator') return; // spectators never send input
            var keys = b.pressedKeys;
            mp.socket.emit(mpRole === 'host' ? 'p1-input' : 'p2-input', {
                up:    keys[P1.up]    === true,
                down:  keys[P1.down]  === true,
                left:  keys[P1.left]  === true,
                right: keys[P1.right] === true,
                fire:  keys[P1.fire]  === true
            });
        }, 20);

        // ── Fast position/bullet sync: host → client every 50ms ─────────────
        if (mpRole === 'host') {
            setInterval(function () {
                if (!mp.socket || !mp.gameStarted) return;
                var e2 = window._wowGame;
                if (e2) mp.socket.emit('pos-sync', serializePositions(e2));
            }, 20);
        }

        // ── Full state correction: host → client every 2s ─────────────────
        if (mpRole === 'host') {
            setInterval(function () {
                if (!mp.socket || !mp.gameStarted) return;
                var e2 = window._wowGame;
                if (e2) mp.socket.emit('game-state', serializeState(e2));
            }, 2000);
        }

        // If socket connected before engine loaded, start was deferred — do it now
        if (mp._pendingStart) {
            mp._pendingStart = false;
            mp.startGame(false);
        }
    };

    // Called from socket handler to start the game (first time or rejoin)
    mp.startGame = function (rejoin) {
        var b = mp._engine;
        var e = mp._game;
        if (!b || !e) return;
        if (!rejoin) {
            if (mp.gameStarted) return;
            window._wowResetSeed();
            e.paused = false;
            e.startNewGame(2);
            mp.gameStarted = true;
            // Refresh prevention: warn host before closing/refreshing
            if (mpRole === 'host') {
                window.addEventListener('beforeunload', function (ev) {
                    ev.preventDefault();
                    ev.returnValue = 'Leaving will disconnect your opponent.';
                    return ev.returnValue;
                });
            }
        } else {
            // Rejoin: game already running, just resume
            e.paused = false;
            mp.gameStarted = true;
        }
        hideLobby();
        showHUD();
    };

    // ── Full snapshot (50ms): every field both players need to render correctly ──
    function serializePositions(e) {
        return {
            // Scene + level + scores
            sc: e.scene,
            lv: e.level,
            sp: e.speed,
            st: e.speedSoundTempo,
            ds: e.doubleScoreNow,
            dn: e.doubleScoreNext,
            bc: e.borderColor,
            // Radar / wall / teleport
            rt: e.radarText,
            rn: e.radarTextColor,
            wt: e.wallType,
            tl: e.teleportStatus,
            // Kill counters
            km: e.killedMonsters,
            kb: e.killedBurwors,
            kt: e.killedThorwors,
            al: e.afterLastThorwor,
            // Dungeon layout
            dt: e.dungeonType,
            du: e.dungeonNumber,
            // Dungeon walls (only change between levels)
            iw: e.innerWalls,
            wh: e.wallsH,
            wv: e.wallsV,
            // Game frameCounters (drives scene animations: getReady, doubleScore, worluk, wizard…)
            fc: JSON.parse(JSON.stringify(e.frameCounters)),
            // Players
            p: e.players.map(function (p) {
                return {
                    st: p.status,
                    x:  p.x,  y: p.y,  d: p.d,
                    co: p.col, ro: p.row,
                    as: p.animationSequence,
                    li: p.lives,
                    sc: p.score,
                    fc: {
                        js: p.frameCounters.justShoot,
                        de: p.frameCounters.dead,
                        en: p.frameCounters.entering
                    },
                    bu: serializeBullet(p.bullet)
                };
            }),
            // Monsters
            m: e.monsters.map(function (mo) {
                return {
                    tp: mo.type,
                    st: mo.status,
                    x:  mo.x,  y: mo.y,  d: mo.d,
                    co: mo.col, ro: mo.row,
                    vi: mo.visible,
                    as: mo.animationSequence,
                    rc: mo.radarTextColor,
                    fc: JSON.parse(JSON.stringify(mo.frameCounters || {})),
                    pi: mo.path ? {
                        pr: mo.path.primary,
                        se: mo.path.secondary,
                        le: mo.path.len,
                        sp: mo.path.steps,
                        im: mo.path.inMoving,
                        ip: mo.path.inMovingPixels,
                        di: mo.path.diagonal
                    } : null,
                    bu: serializeBullet(mo.bullet)
                };
            })
        };
    }

    function applyBullet(owner, existing, bu) {
        if (bu && existing) {
            existing.x = bu.x; existing.y = bu.y; existing.d = bu.d;
            existing.bw = bu.bw; existing.bh = bu.bh;
            existing.col = bu.col; existing.row = bu.row;
        } else if (bu && !existing && window._wowNewBullet) {
            return window._wowNewBullet(owner, bu.x, bu.y, bu.d);
        } else if (!bu) {
            return false;
        }
        return existing;
    }

    function applyPositions(e, s) {
        // ── Scene / game state ───────────────────────────────────────────────
        var sceneChanged = s.sc && s.sc !== e.scene;
        if (sceneChanged) {
            e.scene = s.sc;
            if (e.resetAnimateSkips) e.resetAnimateSkips();
        }
        if (s.lv !== undefined) e.level           = s.lv;
        if (s.sp !== undefined) e.speed           = s.sp;
        if (s.st !== undefined) e.speedSoundTempo = s.st;
        e.doubleScoreNow   = s.ds;
        e.doubleScoreNext  = s.dn;
        e.borderColor      = s.bc;
        e.radarText        = s.rt;
        e.radarTextColor   = s.rn;
        e.wallType         = s.wt;
        e.teleportStatus   = s.tl;
        e.killedMonsters   = s.km;
        e.killedBurwors    = s.kb;
        e.killedThorwors   = s.kt;
        e.afterLastThorwor = s.al;
        if (s.dt) e.dungeonType   = s.dt;
        if (s.du !== undefined) e.dungeonNumber = s.du;
        if (s.fc) {
            Object.assign(e.frameCounters, s.fc);
            // Force re-render for animated scenes (getReady GO text, doubleScore, gameOver)
            // Client has no scan loop so animateSkip never resets on its own
            if (e.scene !== 'dungeon' && e.animateSkip && e.animateSkip[e.scene] !== undefined) {
                e.animateSkip[e.scene] = false;
            }
        }

        // ── Dungeon walls ────────────────────────────────────────────────────
        if (s.iw) e.innerWalls = s.iw;
        if (s.wh) e.wallsH    = s.wh;
        if (s.wv) e.wallsV    = s.wv;

        // ── Players ──────────────────────────────────────────────────────────
        if (s.p && e.players) {
            var n = Math.min(s.p.length, e.players.length);
            for (var i = 0; i < n; i++) {
                var sp = s.p[i], p = e.players[i];
                p.status = sp.st;
                p.x = sp.x;  p.y = sp.y;  p.d = sp.d;
                p.col = sp.co; p.row = sp.ro;
                p.animationSequence = sp.as;
                p.lives = sp.li;
                p.score = sp.sc;
                if (sp.fc) {
                    p.frameCounters.justShoot = sp.fc.js;
                    p.frameCounters.dead      = sp.fc.de;
                    p.frameCounters.entering  = sp.fc.en;
                }
                p.bullet = applyBullet(p, p.bullet, sp.bu);
            }
        }

        // ── Monsters ─────────────────────────────────────────────────────────
        if (s.m && e.monsters !== undefined) {
            // Create any monsters the client is missing
            while (e.monsters.length < s.m.length && window._wowNewMonster) {
                e.monsters.push(window._wowNewMonster(s.m[e.monsters.length].tp || 'burwor'));
            }
            var nm = Math.min(s.m.length, e.monsters.length);
            for (var j = 0; j < nm; j++) {
                var sm = s.m[j], mo = e.monsters[j];
                // Compare against previous sync pos (not extrapolated pos)
                mo.status = sm.st;
                mo.x = sm.x;  mo.y = sm.y;  mo.d = sm.d;
                mo.col = sm.co; mo.row = sm.ro;
                mo.visible = sm.vi;
                mo.animationSequence = sm.as;
                mo.radarTextColor = sm.rc;
                if (sm.fc) Object.assign(mo.frameCounters || (mo.frameCounters = {}), sm.fc);
                if (sm.pi && mo.path) {
                    mo.path.primary          = sm.pi.pr;
                    mo.path.secondary        = sm.pi.se;
                    mo.path.len              = sm.pi.le;
                    mo.path.steps            = sm.pi.sp;
                    mo.path.inMoving         = sm.pi.im;
                    mo.path.inMovingPixels   = sm.pi.ip;
                    mo.path.diagonal         = sm.pi.di;
                }
                mo.bullet = applyBullet(mo, mo.bullet, sm.bu);
            }
            if (e.monsters.length > s.m.length) e.monsters.splice(s.m.length);
        }
    }

    // ── State serialization (for 2s correction) ───────────────────────────
    function serializeBullet(bu) {
        if (!bu) return null;
        return { x: bu.x, y: bu.y, d: bu.d, bw: bu.bw, bh: bu.bh, col: bu.col, row: bu.row };
    }

    function serializeState(e) {
        return {
            scene:            e.scene,
            level:            e.level,
            speed:            e.speed,
            speedSoundTempo:  e.speedSoundTempo,
            dungeonType:      e.dungeonType,
            dungeonNumber:    e.dungeonNumber,
            doubleScoreNow:   e.doubleScoreNow,
            doubleScoreNext:  e.doubleScoreNext,
            killedMonsters:   e.killedMonsters,
            killedBurwors:    e.killedBurwors,
            killedThorwors:   e.killedThorwors,
            afterLastThorwor: e.afterLastThorwor,
            radarText:        e.radarText,
            radarTextColor:   e.radarTextColor,
            wallType:         e.wallType,
            teleportStatus:   e.teleportStatus,
            borderColor:      e.borderColor,
            frameCounters:    JSON.parse(JSON.stringify(e.frameCounters)),
            innerWalls:       e.innerWalls,
            wallsH:           e.wallsH,
            wallsV:           e.wallsV,
            players: e.players.map(function (p) {
                return {
                    status: p.status, x: p.x, y: p.y, d: p.d,
                    col: p.col, row: p.row, lives: p.lives, score: p.score,
                    animationSequence: p.animationSequence,
                    frameCounters: JSON.parse(JSON.stringify(p.frameCounters)),
                    bullet: serializeBullet(p.bullet)
                };
            }),
            monsters: e.monsters.map(function (mo) {
                return {
                    type: mo.type, status: mo.status, x: mo.x, y: mo.y, d: mo.d,
                    col: mo.col, row: mo.row, visible: mo.visible,
                    animationSequence: mo.animationSequence,
                    radarTextColor: mo.radarTextColor,
                    frameCounters: JSON.parse(JSON.stringify(mo.frameCounters || {})),
                    path: mo.path ? JSON.parse(JSON.stringify(mo.path)) : null,
                    bullet: serializeBullet(mo.bullet)
                };
            })
        };
    }

    function applyStateCorrection(e, s) {
        var prevScene = e.scene;
        e.scene            = s.scene;
        e.level            = s.level;
        e.speed            = s.speed;
        e.speedSoundTempo  = s.speedSoundTempo;
        e.dungeonType      = s.dungeonType;
        e.dungeonNumber    = s.dungeonNumber;
        e.doubleScoreNow   = s.doubleScoreNow;
        e.doubleScoreNext  = s.doubleScoreNext;
        e.killedMonsters   = s.killedMonsters;
        e.killedBurwors    = s.killedBurwors;
        e.killedThorwors   = s.killedThorwors;
        e.afterLastThorwor = s.afterLastThorwor;
        e.radarText        = s.radarText;
        e.radarTextColor   = s.radarTextColor;
        e.wallType         = s.wallType;
        e.teleportStatus   = s.teleportStatus;
        e.borderColor      = s.borderColor;
        if (s.frameCounters) Object.assign(e.frameCounters, s.frameCounters);
        if (s.innerWalls)    e.innerWalls = s.innerWalls;
        if (s.wallsH)        e.wallsH = s.wallsH;
        if (s.wallsV)        e.wallsV = s.wallsV;
        if (prevScene !== s.scene && e.resetAnimateSkips) e.resetAnimateSkips();

        if (s.players && e.players) {
            var n = Math.min(s.players.length, e.players.length);
            for (var i = 0; i < n; i++) {
                var sp = s.players[i], p = e.players[i];
                p.status = sp.status; p.x = sp.x; p.y = sp.y; p.d = sp.d;
                p.col = sp.col; p.row = sp.row;
                p.lives = sp.lives; p.score = sp.score;
                p.animationSequence = sp.animationSequence;
                if (sp.frameCounters) Object.assign(p.frameCounters, sp.frameCounters);
                p.bullet = applyBullet(p, p.bullet, sp.bullet);
            }
        }

        if (s.monsters && e.monsters) {
            var nm = Math.min(s.monsters.length, e.monsters.length);
            for (var j = 0; j < nm; j++) {
                var sm = s.monsters[j], mo = e.monsters[j];
                mo.status = sm.status; mo.x = sm.x; mo.y = sm.y; mo.d = sm.d;
                mo.col = sm.col; mo.row = sm.row; mo.visible = sm.visible;
                mo.animationSequence = sm.animationSequence;
                mo.radarTextColor = sm.radarTextColor;
                if (sm.frameCounters) Object.assign(mo.frameCounters || (mo.frameCounters = {}), sm.frameCounters);
                if (sm.path && mo.path) Object.assign(mo.path, sm.path);
                mo.bullet = applyBullet(mo, mo.bullet, sm.bullet);
            }
            if (e.monsters.length > s.monsters.length) {
                e.monsters.splice(s.monsters.length);
            }
        }
    }

    // ── Inject remote player keys safely ──────────────────────────────────
    function injectKeys(pressedKeys, keyMap, data) {
        ['up', 'down', 'left', 'right', 'fire'].forEach(function (dir) {
            if (!data[dir]) {
                pressedKeys[keyMap[dir]] = false;
            } else if (pressedKeys[keyMap[dir]] !== 'hold') {
                pressedKeys[keyMap[dir]] = true;
            }
        });
    }

    // ── Socket.IO init ─────────────────────────────────────────────────────
    var soScript = document.createElement('script');
    soScript.src = '/socket.io/socket.io.js';
    soScript.onload = function () { initSocket(); };
    document.head.appendChild(soScript);

    function initSocket() {
        var socket = io();
        mp.socket = socket;

        var joinRetries = 0;
        function tryJoin() {
            socket.emit('join-lobby', { roomId: mpRoom }, function (resp) {
                if (resp.full) {
                    if (mp.gameStarted) {
                        // Reconnect: old socket may not have cleared yet — retry
                        joinRetries++;
                        if (joinRetries < 20) {
                            updateStatus('retrying', 'Reconnecting... (' + joinRetries + ')');
                            setTimeout(tryJoin, 2000);
                        } else {
                            updateStatus('full', null); // give up, offer spectator
                        }
                    } else {
                        // Fresh join: slot genuinely taken — offer spectator
                        updateStatus('full', null);
                        if (resp.spectatorCount !== undefined) updateHUDSpectators(resp.spectatorCount);
                    }
                    return;
                }
                if (resp.error) {
                    joinRetries++;
                    if (joinRetries < 20) {
                        updateStatus('retrying', 'Waiting for host... (' + joinRetries + ')');
                        setTimeout(tryJoin, 2000);
                    } else {
                        updateStatus('error', 'Could not join room: ' + resp.error);
                    }
                    return;
                }
                window._wowSetSeed(resp.seed);
                if (mp.gameStarted) {
                    // Socket auto-reconnect mid-game: resume without reset
                    mp.startGame(true);
                } else if (resp.started) {
                    // Fresh page load joining already-running game
                    if (mp._game) {
                        mp.startGame(false);
                    } else {
                        // Engine still loading (sprite/audio) — defer to _wowReady
                        mp._pendingStart = true;
                        updateStatus('joined', null);
                    }
                } else {
                    updateStatus('joined', null);
                }
            });
        }

        // ── Spectator join ─────────────────────────────────────────────────
        mp.joinAsSpectator = function () {
            mpRole = 'spectator';
            mp.role = 'spectator';
            socket.emit('join-spectator', { roomId: mpRoom }, function (resp) {
                if (resp.error) { updateStatus('error', resp.error); return; }
                window._wowSetSeed(resp.seed);
                updateStatus('spectator-wait', { spectatorCount: 0 });
                if (resp.started) {
                    if (mp._game) {
                        mp.startGame(false);
                    } else {
                        mp._pendingStart = true;
                        updateStatus('spectator-wait', { spectatorCount: 0 });
                    }
                }
            });
        };

        socket.on('player-joined', function () {
            if (mpRole !== 'host') return;
            if (mp.gameStarted) {
                mp.socket.emit('game-start');
                showNotification('Blue Worrior reconnected!');
            } else {
                updateStatus('ready', null);
            }
        });

        socket.on('game-start', function () {
            if (mpRole === 'spectator') {
                if (mp.gameStarted) { mp.startGame(true); } else { mp.startGame(false); }
                return;
            }
            if (mpRole !== 'client') return;
            if (mp.gameStarted) { mp.startGame(true); } else { mp.startGame(false); }
        });

        socket.on('spectator-update', function (data) {
            updateHUDSpectators(data.count);
            if (mp.gameStarted) {
                showNotification(data.count + ' spectator' + (data.count === 1 ? '' : 's') + ' watching');
            }
        });

        // Host's Arrow input → inject into client's WASD slots (yellowControl=keyboardWasd on client)
        socket.on('p1-input', function (data) {
            if (mpRole === 'client' && mp._engine) {
                injectKeys(mp._engine.pressedKeys, P2, data);
            }
        });

        // Client's Arrow input → inject into host's WASD slots (blueControl=keyboardWasd on host)
        socket.on('p2-input', function (data) {
            if (mpRole === 'host' && mp._engine) {
                injectKeys(mp._engine.pressedKeys, P2, data);
            }
        });

        socket.on('snd', function (cmd) {
            if ((mpRole !== 'client' && mpRole !== 'spectator') || !mp._engine) return;
            var audio = mp._engine.audio;
            if (cmd.a === 'play')         audio.request({ name: cmd.n, loop: cmd.l });
            else if (cmd.a === 'stop')    audio.stop(cmd.n);
            else if (cmd.a === 'stopAll') audio.stopAllSound(cmd.m);
        });

        socket.on('pos-sync', function (snap) {
            if ((mpRole === 'client' || mpRole === 'spectator') && window._wowGame && mp.gameStarted) {
                applyPositions(window._wowGame, snap);
            }
        });

        socket.on('game-state', function (state) {
            if ((mpRole === 'client' || mpRole === 'spectator') && window._wowGame && mp.gameStarted) {
                applyStateCorrection(window._wowGame, state);
            }
        });

        socket.on('player-left', function (data) {
            if (data.role === 'host') {
                // Host left — client game cannot continue
                if (mp._engine) mp._engine.pressedKeys = [];
                mp.gameStarted = false;
                showLobby();
                updateStatus('host-left', null);
            } else if (data.role === 'client' && mpRole === 'host') {
                // Client left — host game continues, client can rejoin
                showNotification('Blue Worrior disconnected. Waiting for reconnect...');
            }
            // If data.role === 'client' and mpRole === 'client': this is our OWN
            // previous socket's disconnect arriving after reconnect — ignore it.
        });

        socket.on('disconnect', function () {
            // Socket to server lost (network issue / server down)
            if (mpRole === 'client' && mp.gameStarted) {
                if (mp._engine) mp._engine.paused = true;
                showLobby();
                updateStatus('reconnecting', null);
            } else if (mpRole === 'host' && mp.gameStarted) {
                showNotification('Server connection lost. Reconnecting...');
            }
        });

        socket.on('connect', function () {
            if (!mp._hasConnected) {
                mp._hasConnected = true;
                // Initial connect
                updateStatus('connecting', null);
                if (mpRole === 'host') {
                    socket.emit('create-lobby', { roomId: mpRoom }, function (resp) {
                        if (resp.error) { updateStatus('error', resp.error); return; }
                        window._wowSetSeed(resp.seed);
                        updateStatus('waiting', null);
                    });
                } else {
                    tryJoin();
                }
            } else {
                // Reconnect after disconnect
                if (mpRole === 'host') {
                    socket.emit('create-lobby', { roomId: mpRoom }, function (resp) {
                        if (resp.ok) { window._wowSetSeed(resp.seed); }
                        hideLobby();
                        if (mp._engine) mp._engine.pressedKeys = [];
                    });
                } else {
                    // Client reconnect: retry join, game resumes on success
                    updateStatus('reconnecting', null);
                    joinRetries = 0;
                    mp._forceRetry = function() { joinRetries = 0; tryJoin(); };
                    tryJoin();
                }
            }
        });
    }

    // ── Lobby overlay UI ───────────────────────────────────────────────────
    var _overlay = null;

    function buildOverlay() {
        if (_overlay) return;
        var style = document.createElement('style');
        style.textContent = [
            '#wowMPOverlay{position:fixed;z-index:9999;inset:0;background:#000;display:flex;align-items:center;justify-content:center;font-family:"C64ProRegular",monospace}',
            '#wowMPBox{width:500px;max-width:92vw;border:2px solid #30E6C6;background:#050505;padding:32px;text-align:center;box-sizing:border-box}',
            '#wowMPTitle{font-family:"WizardOfWor",serif;font-size:26px;color:#DFF60A;letter-spacing:2px;margin-bottom:4px}',
            '#wowMPSub{font-size:12px;color:#30E6C6;letter-spacing:4px;margin-bottom:24px}',
            '#wowMPStatus{font-size:13px;color:#FDFEFC;min-height:22px;margin-bottom:14px}',
            '#wowMPInfo{color:#A4A7A2;margin-bottom:14px;font-size:12px}',
            '.wowMPCode{font-size:22px;color:#DFF60A;letter-spacing:4px;margin-bottom:12px}',
            '.wowMPRole{font-size:13px;margin-top:8px}',
            '.wowMPLinkLabel{font-size:10px;color:#70746F;margin-bottom:5px}',
            '.wowMPLinkBox{background:#0d0d0d;border:1px solid #333;padding:8px 10px;font-size:10px;color:#59FE59;word-break:break-all;margin-bottom:10px;user-select:all;cursor:text}',
            '#wowMPActions button{background:#BE1A24;color:#fff;border:none;padding:10px 28px;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:2px;text-transform:uppercase;margin:4px}',
            '#wowMPActions button:hover{background:#FE4A57}',
            '#wowMPActions button.secondary{background:#1c4a1c}',
            '#wowMPActions button.secondary:hover{background:#1FD21E;color:#000}',
            '#wowMPActions a{color:#FE4A57;font-size:12px}'
        ].join('\n');
        document.head.appendChild(style);

        _overlay = document.createElement('div');
        _overlay.id = 'wowMPOverlay';
        _overlay.innerHTML = [
            '<div id="wowMPBox">',
            '  <div id="wowMPTitle">WIZARD OF WOR</div>',
            '  <div id="wowMPSub">MULTIPLAYER</div>',
            '  <div id="wowMPStatus">Initializing...</div>',
            '  <div id="wowMPInfo"></div>',
            '  <div id="wowMPActions"></div>',
            '</div>'
        ].join('');
        document.body.appendChild(_overlay);
    }

    function showLobby() {
        if (_overlay) _overlay.style.display = 'flex';
    }

    function hideLobby() {
        if (_overlay) _overlay.style.display = 'none';
    }

    function el(id) { return document.getElementById(id); }

    function updateStatus(type, msg) {
        if (!_overlay) buildOverlay();
        var st  = el('wowMPStatus');
        var inf = el('wowMPInfo');
        var act = el('wowMPActions');

        if (type === 'connecting') {
            st.textContent = 'Connecting to server...';
            inf.innerHTML = '';
            act.innerHTML = '';
        } else if (type === 'waiting' && mpRole === 'host') {
            var clientLink = window.location.origin + '/index.html?room=' + mpRoom + '&role=client';
            var isLocalhost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            var localhostWarn = isLocalhost
                ? '<div style="color:#FE4A57;font-size:9px;margin-top:4px">&#9888; You are on localhost — replace with your IP/domain for LAN or WAN sharing</div>'
                : '';
            st.textContent = 'Waiting for Blue Worrior to join...';
            inf.innerHTML = [
                '<div class="wowMPCode">ROOM: ' + mpRoom + '</div>',
                '<div class="wowMPRole">You are: <strong style="color:#DFF60A">YELLOW WORRIOR</strong> (host)</div>',
                '<div class="wowMPLinkLabel" style="margin-top:14px">Share this invite link:</div>',
                '<div class="wowMPLinkBox" id="wowMPLink">' + clientLink + '</div>',
                localhostWarn
            ].join('');
            act.innerHTML = '<button onclick="navigator.clipboard.writeText(\'' + clientLink + '\').then(function(){var b=document.getElementById(\'wowMPCopyBtn\');b.textContent=\'COPIED!\';setTimeout(function(){b.textContent=\'COPY LINK\'},2000);})" id="wowMPCopyBtn">COPY LINK</button>';
        } else if (type === 'retrying') {
            st.textContent = msg || 'Retrying...';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div><div class="wowMPRole">You are: <strong style="color:#5F53FE">BLUE WORRIOR</strong></div>';
            act.innerHTML = '';
        } else if (type === 'joined') {
            st.textContent = mp._pendingStart ? 'Loading game...' : 'Joined! Waiting for Yellow Worrior to start...';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div><div class="wowMPRole">You are: <strong style="color:#5F53FE">BLUE WORRIOR</strong></div>';
            // Only show resume button when reconnecting to running game, not on fresh initial join
            act.innerHTML = (mp.gameStarted || mp._pendingStart)
                ? '<button onclick="if(window._wowMP._game){window._wowMP.startGame(window._wowMP.gameStarted?true:false);}else{window._wowMP._pendingStart=true;}">RESUME GAME</button>'
                : '';
        } else if (type === 'ready' && mpRole === 'host') {
            st.textContent = 'Blue Worrior joined!';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div><div class="wowMPRole">You are: <strong style="color:#DFF60A">YELLOW WORRIOR</strong></div>';
            act.innerHTML = '<button onclick="window._wowMP.hostStartGame()">START GAME</button>';
            window._wowMP.hostStartGame = function () {
                act.innerHTML = '<span style="color:#59FE59">Starting...</span>';
                if (mp.socket) mp.socket.emit('game-start');
                mp.startGame();
            };
        } else if (type === 'host-left') {
            st.textContent = 'Host disconnected.';
            inf.innerHTML = '<div style="color:#A4A7A2;font-size:11px;margin-top:8px">Returning to menu in 5 seconds...</div>';
            act.innerHTML = '<a href="index.html">← Main Menu</a>';
            setTimeout(function () { window.location.href = 'index.html'; }, 5000);
        } else if (type === 'reconnecting') {
            st.textContent = 'Connection lost. Reconnecting...';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div>';
            // Manual fallback: if auto-reconnect stalls, player can force-resume
            act.innerHTML = '<button onclick="if(window._wowMP&&window._wowMP.gameStarted){window._wowMP.startGame(true);}else{window._wowMP._forceRetry&&window._wowMP._forceRetry();}">RESUME GAME</button>';
        } else if (type === 'full') {
            st.textContent = 'Game is full — 2/2 players connected.';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div>';
            act.innerHTML = '<button onclick="window._wowMP.joinAsSpectator()">WATCH AS SPECTATOR</button>';
        } else if (type === 'spectator-wait') {
            st.textContent = 'Joined as spectator. Waiting for game to start...';
            inf.innerHTML = '<div class="wowMPCode">ROOM: ' + mpRoom + '</div>' +
                '<div class="wowMPRole" style="color:#30E6C6">SPECTATOR MODE — view only</div>';
            act.innerHTML = '';
        } else if (type === 'error') {
            st.innerHTML = msg || 'Error';
            inf.innerHTML = '';
            act.innerHTML = '<a href="/lobby.html">← Return to Lobby</a>';
        }
    }

    // ── HUD panel (top-left, always visible in-game) ───────────────────────
    function createHUD() {
        if (document.getElementById('wowMPHUD')) return;
        var style = document.createElement('style');
        style.textContent = [
            '#wowMPHUD{position:fixed;z-index:9995;top:5px;left:150px;',
            'background:rgba(0,0,0,0.75);border:1px solid #30E6C6;',
            'padding:5px 10px;font-family:"C64ProRegular",monospace;',
            'font-size:9px;color:#A4A7A2;line-height:1.7;display:none;',
            'pointer-events:none;min-width:130px}',
            '#wowMPHUD .hr{color:#DFF60A;letter-spacing:2px;font-size:8px;margin-bottom:1px}',
            '#wowMPHUD .hp{color:#1FD21E}',
            '#wowMPHUD .hs{color:#30E6C6}'
        ].join('');
        document.head.appendChild(style);

        var hud = document.createElement('div');
        hud.id = 'wowMPHUD';
        hud.innerHTML =
            '<div class="hr">ROOM: ' + mpRoom + '</div>' +
            '<div class="hp" id="wowHUDPlayers">&#9632;&#9632; 2/2 PLAYERS</div>' +
            '<div class="hs" id="wowHUDSpec">&#9675; 0 SPECTATING</div>';
        document.body.appendChild(hud);
    }

    function showHUD() {
        createHUD();
        var h = document.getElementById('wowMPHUD');
        if (h) h.style.display = 'block';
    }

    function updateHUDSpectators(count) {
        createHUD();
        var el = document.getElementById('wowHUDSpec');
        if (el) el.textContent = (count > 0 ? '●' : '○') + ' ' + count + ' SPECTATING';
    }

    // Small in-game notification (non-blocking, fades)
    function showNotification(msg) {
        var n = document.getElementById('wowMPNotif');
        if (!n) {
            n = document.createElement('div');
            n.id = 'wowMPNotif';
            n.style.cssText = 'position:fixed;z-index:9998;top:10px;left:50%;transform:translateX(-50%);' +
                'background:rgba(0,0,0,0.85);border:1px solid #30E6C6;color:#DFF60A;' +
                'font-family:"C64ProRegular",monospace;font-size:11px;padding:6px 16px;' +
                'letter-spacing:2px;pointer-events:none;transition:opacity 0.5s';
            document.body.appendChild(n);
        }
        n.textContent = msg;
        n.style.opacity = '1';
        clearTimeout(n._t);
        n._t = setTimeout(function () { n.style.opacity = '0'; }, 3000);
    }

    // Build overlay immediately
    buildOverlay();
    updateStatus('connecting', null);

})();
