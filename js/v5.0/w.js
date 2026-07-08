(function() {
    function I(a, c, f, d) {
        this.owner = a;
        this.x = c;
        this.y = f;
        this.d = d;
        this.bh = this.bw = this.row = this.col = 0;
        "up" == this.d || "down" == this.d ? (this.col = this.owner.col,
        this.bw = 2,
        this.bh = 8) : (this.row = this.owner.row,
        this.bw = 8,
        this.bh = 2);
        this.animationRoutine = function() {
            var g = m.sprite.bullets;
            g = "player" == this.owner.type ? g.player : g.monster;
            g = 0 == this.col ? g.h : g.v;
            l(g.x, g.y, g.w, g.h, this.x, this.y)
        }
        ;
        this.scanRoutine = function() {
            if ("shooted" == this.owner.status || "died" == this.owner.status)
                this.owner.bullet = !1;
            else {
                if ("player" == this.owner.type) {
                    for (var g = !1, h = 0; h < e.monsters.length; h++) {
                        var k = e.monsters[h];
                        "alive" == k.status && y(k.x, k.y, 18, 18, this.x, this.y, this.bw, this.bh) && (k.status = "shooted",
                        g = !0,
                        k = m.scoring[k.type],
                        e.doubleScoreNow && (k *= 2),
                        this.owner.score += k)
                    }
                    if (g) {
                        b.audio.stop("Fire");
                        this.owner.bullet = !1;
                        return
                    }
                    if ((h = 1 == this.owner.num ? e.players[0].bullet : e.players[1].bullet) && y(h.x, h.y, h.bw, h.bh, this.x, this.y, this.bw, this.bh)) {
                        this.owner.bullet = !1;
                        h.owner.bullet = !1;
                        return
                    }
                    h = 1 == this.owner.num ? e.players[0] : e.players[1];
                    if ("alive" == h.status && y(h.x, h.y, 18, 18, this.x, this.y, this.bw, this.bh)) {
                        k = m.scoring.worrior;
                        e.doubleScoreNow && (k *= 2);
                        this.owner.score += k;
                        h.status = "dead";
                        h.bullet = !1;
                        b.audio.stop("Fire");
                        this.owner.bullet = !1;
                        "WIZARD OF WOR" == e.radarText ? (e.radarText = "ESCAPED",
                        e.monsters[e.monsters.length - 1].status = "died",
                        r("WizardEscape"),
                        e.frameCounters.wizardEscaped = u(4.4),
                        e.closeTeleport(0)) : r("Death");
                        return
                    }
                } else {
                    g = !1;
                    for (h = 0; 2 > h; h++)
                        "alive" == e.players[h].status && y(e.players[h].x, e.players[h].y, 18, 18, this.x, this.y, this.bw, this.bh) && (g = !0,
                        e.players[h].status = "dead",
                        e.players[h].bullet = !1,
                        "wizardOfWor" == this.owner.type && (e.radarText = "ESCAPED",
                        this.owner.status = "died",
                        r("WizardEscape"),
                        e.frameCounters.wizardEscaped = u(4.4),
                        e.players[h].lives--));
                    if (g) {
                        "wizardOfWor" != this.owner.type && "worluk" != this.owner.type && r("Death");
                        this.owner.bullet = !1;
                        return
                    }
                }
                if ("player" == this.owner.type) {
                    if (b.scanFrameCounter % 2)
                        return
                } else if (b.scanFrameCounter % 4)
                    return;
                switch (this.d) {
                case "up":
                    this.y -= 8;
                    break;
                case "right":
                    this.x += 8;
                    break;
                case "down":
                    this.y += 8;
                    break;
                case "left":
                    this.x -= 8
                }
                if (2 > this.y || 134 < this.y || 34 > this.x || 285 < this.x)
                    this.owner.bullet = !1;
                else
                    for (h = 0; h < e.innerWalls.length; h++)
                        if (g = e.innerWalls[h],
                        g.col == this.col && y(this.x, this.y, 2, 8, g.x, g.y, g.w, g.h) || g.row == this.row && y(this.x, this.y, 8, 2, g.x, g.y, g.w, g.h)) {
                            this.owner.bullet = !1;
                            break
                        }
            }
        }
    }
    function B(a, c) {
        this.type = a;
        this.status = "alive";
        if (!c) {
            var f = e.getFreeCoordinate();
            this.col = f.col;
            this.row = f.row
        }
        this.d = "up";
        this.visible = !0;
        this.animationSequence = 0;
        this.bullet = !1;
        this.frameCounters = {
            shooted: 0
        };
        this.path = {
            primary: "up",
            secondary: "right",
            len: 0,
            steps: 0,
            inMoving: !1,
            inMovingPixels: 0,
            diagonal: !1
        };
        this.calcPositionByCoordinates = function() {
            this.x = 34 + 24 * (this.col - 1);
            this.y = 3 + 24 * (this.row - 1)
        }
        ;
        this.calcPositionByCoordinates();
        this.getCol = function() {
            var d = this.getLine();
            return "both" == d || "col" == d ? (this.x - 34) / 24 + 1 : Math.round((this.x - 34) / 24) + 1
        }
        ;
        this.getRow = function() {
            var d = this.getLine();
            return "both" == d || "row" == d ? (this.y - 3) / 24 + 1 : Math.round((this.y - 3) / 24) + 1
        }
        ;
        this.getLine = function() {
            var d = 0 === (this.x - 34) % 24
              , g = 0 === (this.y - 3) % 24;
            if (d && g)
                return "both";
            if (!d && g)
                return "row";
            if (d && !g)
                return "col"
        }
        ;
        this.canHide = function() {
            if ("alive" != this.status || "burwor" == this.type || "worluk" == this.type || "wizardOfWor" == this.type)
                return !1;
            for (var d = 0; 2 > d; d++)
                if ("out" != e.players[d].status && (e.players[d].x - 24 < this.x && e.players[d].x + 24 > this.x || e.players[d].y - 24 < this.y && e.players[d].y + 24 > this.y))
                    return !1;
            return !0
        }
        ;
        this.generatePath = function() {
            this.path.primary = m.directions[w(4) - 1];
            this.path.secondary = "up" == this.path.primary || "down" == this.path.primary ? ["left", "right"][w(2) - 1] : ["up", "down"][w(2) - 1];
            this.path.len = w(14) + 2;
            this.path.steps = 0;
            this.path.inMoving = !1;
            this.path.inMovingPixels = 0;
            this.path.diagonal = 1 != w(6 < e.level ? 4 : 3) ? !0 : !1;
            this.visible && this.canHide() && 1 == w(10) && (this.visible = !1)
        }
        ;
        this.animationRoutine = function() {
            if ("died" == this.status || "escaped" == this.status || !this.visible || "dungeon" != e.scene)
                return !1;
            var d = 0;
            11 < this.animationSequence ? d = 1 : 3 < this.animationSequence && 8 > this.animationSequence && (d = 2);
            d = "shooted" == this.status ? m.sprite.hit[Math.floor(b.animationFrameCounter % 48 / 3)] : "worluk" == this.type ? m.sprite[this.type][d] : m.sprite[this.type][this.d][d];
            l(d.x, d.y, 18, 18, this.x, this.y)
        }
        ;
        this.scanRoutine = function() {
            if ("died" != this.status)
                if ("shooted" == this.status)
                    this.frameCounters.shooted++,
                    1 == this.frameCounters.shooted && (this.visible = !0,
                    this.bullet = !1,
                    "worluk" == this.type || "wizardOfWor" == this.type ? (b.audio.stop("Worluk"),
                    this.frameCounters.shooted = 999) : r("Shooted")),
                    this.frameCounters.shooted >= u(.8) && e.killMonster(this);
                else if ("escaped" == this.status)
                    this.status = "died";
                else if ("alive" == this.status) {
                    if ("wizardOfWor" == this.type && 3 <= this.path.steps && 1 == w(14)) {
                        var d = e.getFreeCoordinate();
                        this.col = d.col;
                        this.row = d.row;
                        this.calcPositionByCoordinates();
                        this.path.inMoving = !1;
                        this.path.steps = 0;
                        this.path.len = 0
                    }
                    this.path.steps >= this.path.len && this.generatePath();
                    d = this.col;
                    var g = this.row
                      , h = this.col
                      , k = this.row;
                    if (!this.path.inMoving) {
                        this.path.inMoving = !0;
                        this.path.inMovingPixels = 0;
                        if (this.path.diagonal) {
                            var n = this.path.primary;
                            this.path.primary = this.path.secondary;
                            this.path.secondary = n
                        }
                        switch (this.path.primary) {
                        case "up":
                            k = g - 1;
                            break;
                        case "right":
                            h = d + 1;
                            break;
                        case "down":
                            k = g + 1;
                            break;
                        case "left":
                            h = d - 1
                        }
                        e.innerWallCollision(d, g, this.path.primary) && (k = g,
                        h = d);
                        if (1 > h || 11 < h)
                            h = d;
                        if (1 > k || 6 < k)
                            k = g;
                        if (k == g && h == d) {
                            switch (this.path.secondary) {
                            case "up":
                                k = g - 1;
                                break;
                            case "right":
                                h = d + 1;
                                break;
                            case "down":
                                k = g + 1;
                                break;
                            case "left":
                                h = d - 1
                            }
                            e.innerWallCollision(d, g, this.path.secondary) && (k = g,
                            h = d);
                            if (1 > h || 11 < h)
                                h = d;
                            if (1 > k || 6 < k)
                                k = g;
                            k == g && h == d ? (this.path.inMoving = !1,
                            this.path.steps = 0,
                            this.path.len = 0) : this.d = this.path.secondary
                        } else
                            this.d = this.path.primary;
                        !this.bullet && this.visible && this.path.inMoving && "worluk" != this.type && ("wizardOfWor" == this.type && 1 == w(4) || 1 == w(15)) && (r("EnemyFire"),
                        d = "wizardOfWor" == this.type ? ["up", "right", "down", "left"][w(4) - 1] : this.d,
                        this.bullet = new I(this,"left" == d ? this.x : this.x + 9,"up" == d ? this.y : this.y + 9,d))
                    }
                    if (this.path.inMoving) {
                        d = 0;
                        1 == e.speed ? 4 == b.scanFrameCounter % 5 && (d = 1) : 2 == e.speed ? 3 == b.scanFrameCounter % 4 && (d = 1) : 3 == e.speed ? 2 == b.scanFrameCounter % 3 && (d = 1) : 4 == e.speed ? 1 == b.scanFrameCounter % 2 && (d = 1) : 5 == e.speed ? 0 < b.scanFrameCounter % 3 && (d = 1) : 6 == e.speed ? 0 < b.scanFrameCounter % 4 && (d = 1) : 7 == e.speed ? d = 1 : 8 == e.speed ? (d = 1,
                        4 == b.scanFrameCounter % 5 && (d = 2)) : 9 == e.speed ? (d = 1,
                        3 == b.scanFrameCounter % 4 && (d = 2)) : 10 == e.speed ? (d = 1,
                        2 == b.scanFrameCounter % 3 && (d = 2)) : 11 == e.speed ? (d = 1,
                        1 == b.scanFrameCounter % 2 && (d = 2)) : 12 == e.speed ? (d = 1,
                        0 < b.scanFrameCounter % 3 && (d = 2)) : 13 == e.speed ? (d = 1,
                        0 < b.scanFrameCounter % 4 && (d = 2)) : 14 == e.speed ? d = 2 : 15 == e.speed ? (d = 2,
                        4 == b.scanFrameCounter % 5 && (d = 3)) : 16 == e.speed && (d = 2,
                        2 == b.scanFrameCounter % 3 && (d = 3));
                        if (!d)
                            return;
                        14 > e.speed ? this.animationSequence++ : this.animationSequence += 2;
                        15 <= this.animationSequence && (this.animationSequence -= 15);
                        24 < this.path.inMovingPixels + d && (d -= this.path.inMovingPixels + d - 24);
                        this.path.inMovingPixels += d;
                        "up" == this.d && (this.y -= d);
                        "right" == this.d && (this.x += d);
                        "down" == this.d && (this.y += d);
                        "left" == this.d && (this.x -= d);
                        if (24 == this.path.inMovingPixels) {
                            d = this.getLine();
                            if ("both" == d || "row" == d)
                                this.row = this.getRow();
                            if ("both" == d || "col" == d)
                                this.col = this.getCol();
                            this.path.steps++;
                            this.path.inMoving = !1;
                            3 != this.row || 1 != this.col && 11 != this.col || "open" != e.teleportStatus || ("worluk" == this.type ? (this.status = "escaped",
                            e.doubleScoreNext = !1,
                            b.audio.stop("Worluk"),
                            r("WorlukEscape"),
                            e.radarText = "ESCAPED",
                            this.radarTextColor = 7,
                            e.closeTeleport(0),
                            e.frameCounters.worlukEscaped = u(1.8)) : 1 == w(2) && (this.col = 11 == this.col ? 1 : 11,
                            this.calcPositionByCoordinates(),
                            this.path.inMoving = !1,
                            this.path.steps = 0,
                            this.path.len = 0,
                            "wizardOfWor" !== this.type && e.closeTeleport(13),
                            r("Teleport")))
                        }
                    }
                    this.visible || this.canHide() || (r("Visible"),
                    this.visible = !0)
                }
        }
    }
    function M(a) {
        this.type = "player";
        this.num = a;
        this.score = 0;
        this.lives = 3;
        this.status = "wait";
        this.col = 1 == a ? 1 : 11;
        this.row = 6;
        this.d = 1 == a ? "right" : "left";
        this.animationSequence = 4;
        this.bullet = !1;
        this.frameCounters = {
            justShoot: 0,
            entering: 0,
            dead: 0
        };
        this.calcPositionByCoordinates = function() {
            this.x = 24 * (this.col - 1) + 34;
            this.y = 147
        }
        ;
        this.calcPositionByCoordinates();
        this.getCol = function() {
            var c = this.getLine();
            return "both" == c || "col" == c ? (this.x - 34) / 24 + 1 : Math.round((this.x - 34) / 24) + 1
        }
        ;
        this.getRow = function() {
            var c = this.getLine();
            return "both" == c || "row" == c ? (this.y - 3) / 24 + 1 : Math.round((this.y - 3) / 24) + 1
        }
        ;
        this.getLine = function() {
            var c = 0 === (this.x - 34) % 24
              , f = 0 === (this.y - 3) % 24;
            if (c && f)
                return "both";
            if (!c && f)
                return "row";
            if (c && !f)
                return "col"
        }
        ;
        this.goToStartPosition = function() {
            this.status = "wait";
            this.col = 1 == this.num ? 1 : 11;
            this.row = 6;
            this.calcPositionByCoordinates();
            this.d = 1 == this.num ? "right" : "left";
            this.animationSequence = 4;
            this.frameCounters = {
                justShoot: 0,
                entering: u(10),
                dead: 0
            };
            this.bullet = !1
        }
        ;
        this.animationRoutine = function() {
            if ("dungeon" == e.scene) {
                var c = 0;
                11 < this.animationSequence ? c = 1 : 3 < this.animationSequence && 8 > this.animationSequence && (c = 2);
                if ("wait" == this.status || "out" == this.status || 0 < e.frameCounters.wizardEscaped)
                    return !1;
                if ("dead" == this.status)
                    var f = this.frameCounters.dead < u(1.1) ? "left" == this.d || "right" == this.d ? m.sprite.players[10 < this.frameCounters.dead % 20 ? 0 : 1][this.d][c] : 10 < this.frameCounters.dead % 20 ? m.sprite.players[this.num][this.d][c] : m.sprite.players[this.num].death[this.d][c] : m.sprite.hit[Math.floor(b.animationFrameCounter % 48 / 3)];
                else
                    f = m.sprite.players[this.num],
                    f = 0 < this.frameCounters.justShoot ? f.shoot[this.d] : f[this.d][c];
                l(f.x, f.y, 18, 18, this.x, this.y)
            }
        }
        ;
        this.scanRoutine = function() {
            if ("out" == this.status)
                return !1;
            if ("dead" == this.status)
                this.frameCounters.dead++,
                this.frameCounters.dead > u(2) ? (this.lives--,
                1 > this.lives ? (this.status = "out",
                "out" == e.players[0].status && "out" == e.players[1].status && e.gameOver()) : this.goToStartPosition()) : e.afterWorluk() && this.frameCounters.dead >= u(.8) && (this.frameCounters.dead = u(2));
            else if ("wait" == this.status) {
                this.frameCounters.entering--;
                var c = !0 === J(this.num).up;
                if (c || this.frameCounters.entering <= u(1))
                    this.frameCounters.entering = 0,
                    this.status = "enter",
                    r("Enter")
            } else if ("enter" == this.status)
                --this.y,
                "both" == this.getLine() && 6 == this.getRow() && (this.status = "alive");
            else if ("alive" == this.status) {
                var f = J(this.num);
                c = !0 === f.up;
                var d = !0 === f.down
                  , g = !0 === f.right
                  , h = !0 === f.left;
                f = !0 === f.fire;
                for (var k = 0; k < e.monsters.length; k++) {
                    var n = e.monsters[k];
                    if ("alive" == n.status && y(n.x + 3, n.y + 3, 12, 12, this.x + 3, this.y + 3, 12, 12)) {
                        "wizardOfWor" == n.type ? (e.radarText = "ESCAPED",
                        n.status = "died",
                        r("WizardEscape"),
                        e.frameCounters.wizardEscaped = u(4.4),
                        this.lives--,
                        e.closeTeleport(0)) : (this.status = "dead",
                        r("Death"));
                        this.bullet = !1;
                        return
                    }
                }
                if (0 < this.frameCounters.justShoot)
                    this.frameCounters.justShoot--;
                else {
                    k = this.getLine();
                    n = !1;
                    c ? n = "up" : d ? n = "down" : g ? n = "right" : h && (n = "left");
                    if (n) {
                        if ("open" == e.teleportStatus && "both" == k && 3 == this.row) {
                            if (274 <= this.x && ("right" == n || "down" == n && "right" == this.d && e.innerWallCollision(this.col, this.row, "down"))) {
                                this.d = "right";
                                this.col = 1;
                                this.x = 34;
                                r("Teleport");
                                e.afterWorluk() || e.closeTeleport(13);
                                return
                            }
                            if (34 >= this.x && ("left" == n || "down" == n && "left" == this.d && e.innerWallCollision(this.col, this.row, "down"))) {
                                this.d = "left";
                                this.col = 11;
                                this.x = 274;
                                r("Teleport");
                                e.afterWorluk() || e.closeTeleport(13);
                                return
                            }
                        }
                        "both" == k ? "up" == n && !e.innerWallCollision(this.col, this.row, "up") && 3 < this.y ? this.d = "up" : "right" == n && !e.innerWallCollision(this.col, this.row, "right") && 274 > this.x ? this.d = "right" : "down" == n && !e.innerWallCollision(this.col, this.row, "down") && 123 > this.y ? this.d = "down" : "left" == n && !e.innerWallCollision(this.col, this.row, "left") && 34 < this.x && (this.d = "left") : "up" == this.d && "down" == n ? this.d = "down" : "down" == this.d && "up" == n ? this.d = "up" : "right" == this.d && "left" == n ? this.d = "left" : "left" == this.d && "right" == n && (this.d = "right");
                        c = !0;
                        "up" == this.d && (!e.innerWallCollision(this.col, this.row, "up") || "both" !== k) && 3 < this.y ? --this.y : "right" == this.d && (!e.innerWallCollision(this.col, this.row, "right") || "both" !== k) && 274 > this.x ? this.x += 1 : "down" == this.d && (!e.innerWallCollision(this.col, this.row, "down") || "both" !== k) && 123 > this.y ? this.y += 1 : "left" == this.d && (!e.innerWallCollision(this.col, this.row, "left") || "both" !== k) && 34 < this.x ? --this.x : c = !1;
                        if (c) {
                            k = this.getLine();
                            if ("both" == k || "col" == k)
                                this.col = this.getCol();
                            if ("both" == k || "row" == k)
                                this.row = this.getRow();
                            this.animationSequence++;
                            15 < this.animationSequence && (this.animationSequence = 0)
                        }
                    }
                    if (f && !this.bullet) {
                        c = !1;
                        if ("up" == this.d && ("both" !== k || !e.innerWallCollision(this.col, this.row, "up")) && 3 < this.y) {
                            c = this.x + 7;
                            var A = this.y + 8
                        } else
                            "right" == this.d && ("both" !== k || !e.innerWallCollision(this.col, this.row, "right")) && 274 > this.x ? (c = this.x + 9,
                            A = this.y + 8) : "down" == this.d && ("both" !== k || !e.innerWallCollision(this.col, this.row, "down")) && 123 > this.y ? (c = this.x + 7,
                            A = this.y + 3) : "left" == this.d && ("both" !== k || !e.innerWallCollision(this.col, this.row, "left")) && 34 < this.x && (c = this.x + 8,
                            A = this.y + 8);
                        c && (b.audio.stop("Fire"),
                        r("Fire"),
                        this.bullet = new I(this,c,A,this.d),
                        this.frameCounters.justShoot = 5,
                        G("fire", this.num))
                    }
                }
            }
        }
    }
    function N() {
        this.scene = "title";
        this.restartLoopSounds = this.paused = !1;
        this.level = 0;
        this.speedSoundTempo = this.speed = 1;
        this.numOfPlayers = 2;
        this.doubleScoreNext = this.doubleScoreNow = !1;
        this.killedThorwors = this.killedBurwors = this.killedMonsters = 0;
        this.afterLastThorwor = !1;
        this.wallsH = [];
        this.wallsV = [];
        this.wallType = "blue";
        this.teleportStatus = "open";
        this.dungeonType = "easy";
        this.dungeonNumber = -1;
        this.innerWalls = [];
        this.radarText = "RADAR";
        this.radarTextColor = 2;
        this.players = [];
        this.monsters = [];
        this.borderColor = 0;
        this.frameCounters = {
            dungeon: 0,
            title: 0,
            getReady: 0,
            doubleScore: 0,
            teleport: 0,
            teleportOpenDelay: 0,
            worlukDeathAnimation: 0,
            worlukEscaped: 0,
            wizardDeathAnimation: 0,
            wizardEscaped: 0,
            gameOver: 0
        };
        this.animateSkip = {
            title: !1,
            enemyRoster: !1,
            getReady: !1,
            doubleScore: !1,
            gameOver: !1
        };
        this.togglePause = function(a) {
            (this.paused = "undefined" == typeof a ? !this.paused : a) ? b.audio.stopAllSound(!0) : this.restartLoopSounds = !0
        }
        ;
        this.resetAnimateSkips = function() {
            for (var a in e.animateSkip)
                e.animateSkip[a] = !1
        }
        ;
        this.resetGame = function() {
            e.players[0] && (e.players[0].score = 0);
            e.players[1] && (e.players[1].score = 0);
            b.audio.stopAllSound();
            z(0);
            e.resetAnimateSkips();
            e.frameCounters.title = 0;
            e.scene = "title"
        }
        ;
        this.startNewGame = function(a) {
            D.setToggler("small");
            this.level = 0;
            this.speedSoundTempo = this.speed = 1;
            this.numOfPlayers = a;
            this.doubleScoreNext = this.doubleScoreNow = !1;
            this.dungeonType = "easy";
            this.dungeonNumber = -1;
            this.players = [];
            for (var c = 0; 2 > c; c++)
                this.players[c] = new M(c);
            1 == a && (this.players[1].status = "out",
            this.players[1].lives = 0);
            for (c in this.frameCounters)
                this.frameCounters[c] = 0;
            this.scene = "getReady";
            z(0)
        }
        ;
        this.nextDungeon = function() {
            this.level++;
            this.dungeonType = 7 >= this.level ? "easy" : "hard";
            if (4 == this.level || 13 <= this.level && 0 == (this.level - 13) % 6)
                this.dungeonType = "fix";
            if ("easy" == this.dungeonType) {
                do
                    var a = w(12) - 1;
                while (a == this.dungeonNumber)
            } else if ("hard" == this.dungeonType) {
                do
                    a = w(8) - 1;
                while (a == this.dungeonNumber)
            } else
                "fix" == this.dungeonType && (a = 4 == this.level ? 0 : 1);
            this.dungeonNumber = a;
            this.speed = this.level;
            12 < this.speed && (this.speed = 12);
            this.speedSoundTempo = Math.round(this.speed / 2);
            7 < this.speedSoundTempo && (this.speedSoundTempo = 7);
            r("Speed" + this.speedSoundTempo, !0);
            this.parseDungeon();
            this.killedThorwors = this.killedBurwors = this.killedMonsters = 0;
            this.afterLastThorwor = !1;
            this.monsters = [];
            for (a = 0; 6 > a; a++)
                this.monsters[a] = new B("burwor");
            this.doubleScoreNow = this.doubleScoreNext ? !0 : !1;
            this.doubleScoreNext = !1;
            for (a = 0; 2 > a; a++)
                "out" != e.players[a].status && e.players[a].goToStartPosition();
            1 == this.level ? this.radarText = "RADAR" : 4 == this.level ? this.radarText = "THE ARENA" : 13 == this.level ? this.radarText = "THE PIT" : (this.radarText = "DUNGEON  ",
            10 > this.level && (this.radarText += " "),
            this.radarText += this.level.toString());
            this.radarTextColor = 2;
            this.openTeleport();
            this.wallType = "blue";
            this.frameCounters.dungeon = 0;
            this.scene = "dungeon"
        }
        ;
        this.parseDungeon = function() {
            var a = m.dungeons[this.dungeonType][this.dungeonNumber].split("|");
            this.wallsH = a[0].split(",");
            this.wallsV = a[1].split(",");
            this.innerWalls = [];
            for (a = 0; this.wallsH[a]; a++) {
                var c = this.wallsH[a].split("x")
                  , f = c[0];
                c = c[1];
                this.innerWalls.push({
                    type: "h",
                    col: f,
                    row: c,
                    x: 31 + 24 * (f - 1),
                    y: 24 * c - 2,
                    w: 24,
                    h: 4
                })
            }
            for (a = 0; this.wallsV[a]; a++)
                c = this.wallsV[a].split("x"),
                f = c[0],
                c = c[1],
                this.innerWalls.push({
                    type: "v",
                    col: f,
                    row: c,
                    x: 29 + 24 * f,
                    y: 24 * (c - 1),
                    w: 4,
                    h: 24
                })
        }
        ;
        this.innerWallCollision = function(a, c, f) {
            for (var d = 0; d < this.innerWalls.length; d++) {
                var g = this.innerWalls[d];
                if ("up" == f && "h" == g.type && a == g.col && c - 1 == g.row || "down" == f && "h" == g.type && a == g.col && c == g.row || "right" == f && "v" == g.type && c == g.row && a == g.col || "left" == f && "v" == g.type && c == g.row && a - 1 == g.col)
                    return !0
            }
            return !1
        }
        ;
        this.getFreeCoordinate = function() {
            do {
                var a = w(11)
                  , c = w(6)
                  , f = !0;
                if (1 == a && 2 == c || 1 == a && 3 == c || 2 == a && 3 == c || 1 == a && 4 == c || 11 == a && 2 == c || 11 == a && 3 == c || 10 == a && 3 == c || 11 == a && 4 == c)
                    f = !1;
                if (f)
                    for (var d = 0; 2 > d; d++)
                        if ("alive" == this.players[d].status) {
                            var g = this.players[d];
                            if (g.col == a || g.row == c || a == g.col - 1 && c == g.row - 1 || a == g.col + 1 && c == g.row - 1 || a == g.col - 1 && c == g.row + 1 || a == g.col + 1 && c == g.row + 1)
                                f = !1
                        }
            } while (!f);
            return {
                col: a,
                row: c
            }
        }
        ;
        this.displayScore = function(a, c) {
            1 == a ? (t(239, 168, 80, 8, 7),
            t(239, 192, 80, 8, !1),
            t(239, 176, 8, 16, !1),
            t(311, 176, 8, 16, !1),
            v(H(c, 38), 0, 189, 7)) : 2 == a && (t(7, 168, 80, 8, 6),
            t(7, 192, 80, 8, !1),
            t(7, 176, 8, 16, !1),
            t(79, 176, 8, 16, !1),
            v(H(c, 9), 0, 189, 6))
        }
        ;
        this.killMonster = function(a) {
            this.killedMonsters++;
            a.status = "died";
            0 == this.killedMonsters % 4 && this.speedUp();
            "burwor" == a.type ? (this.killedBurwors++,
            this.killedBurwors >= 7 - this.level && e.monsters.push(new B("garwor"))) : "garwor" == a.type ? e.monsters.push(new B("thorwor")) : "thorwor" == a.type ? (this.killedThorwors++,
            a = 6,
            6 > this.level && (a = 6 - (6 - this.level)),
            this.killedThorwors >= a && (this.afterLastThorwor = !0,
            1 == this.level ? this.endDungeon() : (this.closeTeleport(5),
            e.monsters.push(new B("worluk")),
            this.radarText = " WORLUK",
            this.radarTextColor = 7,
            this.speed = 14,
            this.wallType = "worluk",
            b.audio.stopAllSound(),
            r("Worluk", !0)))) : "worluk" == a.type ? (this.doubleScoreNext = !0,
            this.radarText = "DOUBLE  SCORE",
            this.radarTextColor = 7,
            b.audio.stop("Worluk"),
            r("WorlukDeath"),
            this.wizardOfWor() || (this.wallType = "red",
            this.frameCounters.worlukDeathAnimation = u(4.4),
            this.closeTeleport(0))) : "wizardOfWor" == a.type && (this.doubleScoreNext = !0,
            this.radarText = "DOUBLE  SCORE",
            this.radarTextColor = 7,
            this.wallType = "wizardOfWor",
            r("WizardDeath"),
            this.frameCounters.wizardDeathAnimation = u(5))
        }
        ;
        this.closeTeleport = function(a) {
            this.teleportStatus = "close";
            this.frameCounters.teleport = 0;
            this.frameCounters.teleportOpenDelay = u(a)
        }
        ;
        this.openTeleport = function() {
            this.teleportStatus = "open";
            this.frameCounters.teleport = 0;
            this.frameCounters.teleportOpenDelay = 0
        }
        ;
        this.afterWorluk = function() {
            for (var a = 0; a < this.monsters.length; a++)
                if ("worluk" == this.monsters[a].type)
                    return !0;
            return !1
        }
        ;
        this.wizardOfWor = function() {
            return 1 == w(7) ? (this.speed = 12,
            this.wallType = "blue",
            this.openTeleport(),
            this.radarText = "WIZARD OF WOR",
            this.radarTextColor = 7,
            e.monsters.push(new B("wizardOfWor")),
            !0) : !1
        }
        ;
        this.endDungeon = function(a) {
            b.audio.stopAllSound();
            6 < this.level && (this.radarText = "WORLORD");
            this.frameCounters.getReady = 0;
            this.scene = "getReady"
        }
        ;
        this.subscribeToToplist = function(a) {
            if (!a)
                return !1;
            for (i = 5; 1 <= i; i--)
                if (p = b.options.highScores[i - 1],
                a >= p)
                    b.options.highScores[i] = p,
                    1 == i && (b.options.highScores[0] = a);
                else {
                    b.options.highScores[i] = a;
                    break
                }
            b.options.highScores[5] = null;
            b.options.highScores.pop();
            localStorage.setItem("highScores", b.options.highScores.join(","))
        }
        ;
        this.refreshPressedKeysByGamepad = function() {
            if (navigator.getGamepads) {
                var a = 0;
                "gamepad" == b.options.yellowControl && a++;
                "gamepad" == b.options.blueControl && a++;
                if (a)
                    for (var c = 0; c < a; c++) {
                        var f = navigator.getGamepads()[c];
                        if (void 0 !== f && null !== f) {
                            var d = f.buttons
                              , g = f.axes;
                            f = !1;
                            1 == a ? "gamepad" == b.options.yellowControl ? f = "keyboardWasd" == b.options.blueControl ? m.keys[0] : m.keys[1] : "gamepad" == b.options.blueControl && (f = "keyboardWasd" == b.options.yellowControl ? m.keys[0] : m.keys[1]) : 2 == a && (f = m.keys[c]);
                            var h = d && (d[0].pressed || d[1].pressed || d[2].pressed || d[3].pressed);
                            h && "hold" !== b.pressedKeys[f.fire] ? b.pressedKeys[f.fire] = !0 : h || (b.pressedKeys[f.fire] = !1);
                            (h = d && d[12] && d[12].pressed || g && -.5 > g[1]) && "hold" !== b.pressedKeys[f.up] ? b.pressedKeys[f.up] = !0 : h || (b.pressedKeys[f.up] = !1);
                            (h = d && d[13] && d[13].pressed || g && .5 < g[1]) && "hold" !== b.pressedKeys[f.down] ? b.pressedKeys[f.down] = !0 : h || (b.pressedKeys[f.down] = !1);
                            (h = d && d[14] && d[14].pressed || g && -.5 > g[0]) && "hold" !== b.pressedKeys[f.left] ? b.pressedKeys[f.left] = !0 : h || (b.pressedKeys[f.left] = !1);
                            (d = d && d[15] && d[15].pressed || g && .5 < g[0]) && "hold" !== b.pressedKeys[f.right] ? b.pressedKeys[f.right] = !0 : d || (b.pressedKeys[f.right] = !1)
                        }
                    }
            }
        }
        ;
        this.animationRoutine = function() {
            "title" == this.scene ? this.animateTitle() : "enemyRoster" == this.scene ? this.animateEnemyRoster() : "getReady" == this.scene ? this.animateGetReady() : "doubleScore" == this.scene ? this.animateDoubleScore() : "dungeon" == this.scene ? this.animateDungeon() : "gameOver" == this.scene && this.animateGameOver();
            "none" != b.options.visualFilter && e.visualFilter()
        }
        ;
        this.scanRoutine = function() {
            !0 === this.restartLoopSounds && (this.restartLoopSounds = !1,
            "dungeon" == this.scene && (!1 === this.afterLastThorwor ? r("Speed" + this.speedSoundTempo, !0) : "worluk" == this.wallType && r("Worluk", !0)));
            "title" == this.scene || "enemyRoster" == this.scene ? this.scanTitle() : "getReady" == this.scene ? this.scanGetReady() : "doubleScore" == this.scene ? this.scanDoubleScore() : "dungeon" == this.scene ? this.scanDungeon() : "gameOver" == this.scene && this.scanGameOver()
        }
        ;
        this.animateTitle = function() {
            if (!this.animateSkip.title) {
                this.animateSkip.title = !0;
                E();
                v("WIZARD OF WOR  REMAKE", 79, 29, 14);
                v("1 ONE PLAYER", 112, 172, 7);
                v("2 LOCAL MULTI", 108, 184, 14);
                v("3 ONLINE MULTI", 104, 196, 10);
                v("HIGH SCORES", 119, 61, 10);
                for (var a = 0; 5 > a; a++)
                    v(H(b.options.highScores[a], 23), 0, 85 + 16 * a, 14);
                this.displayScore(1, e.players[0] ? e.players[0].score : 0);
                this.displayScore(2, e.players[1] ? e.players[1].score : 0)
            }
        }
        ;
        this.animateEnemyRoster = function() {
            if (!e.animateSkip.enemyRoster) {
                E();
                v("BURWOR      100  POINTS", 71, 21, 14);
                v("WORRIOR     1000  POINTS", 63, 93, 14);
                v("GARWOR      200  POINTS", 71, 45, 7);
                v("WORRIOR     1000  POINTS", 63, 117, 7);
                v("WIZARD OF WOR     2500  POINTS", 15, 181, 7);
                v("THORWOR      500  POINTS", 63, 69, 10);
                v("WORLUK     1000  POINTS", 71, 141, 10);
                v("DOUBLE SCORE", 159, 157, 10);
                var a = m.sprite.burwor.left[2];
                l(a.x, a.y, 18, 18, 130, 6);
                a = m.sprite.garwor.left[0];
                l(a.x, a.y, 18, 18, 129, 30);
                a = m.sprite.thorwor.left[0];
                l(a.x, a.y, 18, 18, 130, 54);
                a = m.sprite.enemyRosterPlayer2;
                l(a.x, a.y, 18, 18, 130, 78);
                a = m.sprite.players[0].left[2];
                l(a.x, a.y, 18, 18, 130, 102);
                a = m.sprite.worluk[0];
                l(a.x, a.y, 18, 18, 129, 126);
                a = m.sprite.wizardOfWor.left[2];
                l(a.x, a.y, 18, 18, 130, 166)
            }
        }
        ;
        this.animateGetReady = function() {
            if (!this.animateSkip.getReady) {
                this.animateSkip.getReady = !0;
                0 == e.level ? E() : this.animateDungeon();
                C(0);
                for (var a = 0; 3 > a; a++)
                    t(31 + 32 * a, 48, 24, 40, !1);
                for (a = 0; 5 > a; a++)
                    t(143 + 32 * a, 48, 24, 40, !1);
                a = m.sprite.texts.get;
                l(a.x, a.y, a.w, a.h, 31, 50);
                a = m.sprite.texts.ready;
                l(a.x, a.y, a.w, a.h, 143, 50);
                this.frameCounters.getReady >= u(1.2) && (t(135, 96, 24, 40, !1),
                t(167, 96, 24, 40, !1),
                a = m.sprite.texts.go,
                l(a.x, a.y, a.w, a.h, 135, 98))
            }
        }
        ;
        this.animateGameOver = function() {
            if (!this.animateSkip.gameOver) {
                this.animateSkip.gameOver = !0;
                this.animateDungeon();
                C(0);
                for (var a = 0; 4 > a; a++)
                    t(23 + 32 * a, 56, 24, 40, !1);
                for (a = 0; 4 > a; a++)
                    t(191 + 32 * a, 56, 24, 40, !1);
                a = m.sprite.texts.game;
                l(a.x, a.y, a.w, a.h, 23, 58);
                a = m.sprite.texts.over;
                l(a.x, a.y, a.w, a.h, 191, 58)
            }
        }
        ;
        this.animateDoubleScore = function() {
            if (!this.animateSkip.doubleScore) {
                this.animateSkip.doubleScore = !0;
                E();
                if (this.doubleScoreNext) {
                    var a = m.sprite.texts["double"];
                    l(a.x, a.y, a.w, a.h, 71, 2);
                    a = m.sprite.texts.score;
                    l(a.x, a.y, a.w, a.h, 87, 50);
                    a = m.sprite.texts.dungeon;
                    l(a.x, a.y, a.w, a.h, 55, 98)
                }
                if (3 == this.level || 12 == this.level)
                    v("BONUS  PLAYER", 110, 173, 7),
                    "out" != e.players[0].status && (a = m.sprite.players[0].left[2],
                    l(a.x, a.y, 18, 18, 235, 164)),
                    "out" != e.players[1].status && (a = m.sprite.players[1].right[2],
                    l(a.x, a.y, 18, 18, 73, 164))
            }
        }
        ;
        this.animateDungeon = function() {
            t(0, 0, 320, 200, this.borderColor);
            if (!("wizardOfWor" == this.wallType && 30 < b.animationFrameCounter % 40)) {
                var a = m.sprite.walls[this.wallType]
                  , c = 0;
                if ("worluk" != this.wallType || !(0 < this.frameCounters.worlukEscaped || "gameOver" == this.scene)) {
                    var f = b.animationFrameCounter % 6;
                    3 < f ? c = 2 : 1 < f && (c = 1)
                }
                f = void 0 === a.h.length ? a.h : a.h[c];
                a = void 0 === a.v.length ? a.v : a.v[c];
                l(a.x, a.y, 4, 24, 29, 0);
                l(a.x, a.y, 4, 24, 29, 24);
                l(a.x, a.y, 4, 24, 29, 72);
                l(a.x, a.y, 4, 24, 29, 96);
                l(a.x, a.y, 4, 24, 29, 120);
                l(a.x, a.y, 4, 24, 293, 0);
                l(a.x, a.y, 4, 24, 293, 24);
                l(a.x, a.y, 4, 24, 293, 72);
                l(a.x, a.y, 4, 24, 293, 96);
                l(a.x, a.y, 4, 24, 293, 120);
                for (c = 0; 11 > c; c++)
                    l(f.x, f.y, 24, 2, 29 + 24 * c, 0);
                for (c = 0; 11 > c; c++)
                    l(f.x, f.y, 24, 2, 29 + 24 * c, 142);
                for (c = 0; this.innerWalls[c]; c++) {
                    var d = this.innerWalls[c];
                    "h" == d.type ? l(f.x, f.y, 24, 4, d.x, d.y) : "v" == d.type && l(a.x, a.y, 4, 24, d.x, d.y)
                }
                l(f.x, f.y, 24, 4, 8, 46);
                l(f.x, f.y, 24, 4, 8, 70);
                l(f.x, f.y, 24, 4, 295, 46);
                l(f.x, f.y, 24, 4, 295, 70);
                if ("close" == this.teleportStatus)
                    c = m.sprite.teleport.wallClose,
                    l(c.x, c.y, c.w, c.h, 27, 50),
                    l(c.x, c.y, c.w, c.h, 299, 50);
                else {
                    c = m.sprite.teleport.wallOpen;
                    d = m.sprite.teleport.arrows.left;
                    var g = m.sprite.teleport.arrows.right;
                    l(c.x, c.y, c.w, c.h, 27, 50);
                    l(d.x, d.y, d.w, d.h, 7, 56);
                    l(c.x, c.y, c.w, c.h, 299, 50);
                    l(g.x, g.y, g.w, g.h, 311, 56)
                }
                t(27, 49, 2, 1, this.borderColor);
                t(299, 49, 2, 1, !1);
                t(27, 70, 2, 1, !1);
                t(299, 70, 2, 1, !1);
                l(a.x, a.y, 2, 24, 269, 144);
                l(a.x, a.y, 2, 24, 295, 144);
                "wait" != this.players[0].status && "enter" != this.players[0].status || t(271, 142, 22, 2, !1);
                l(a.x, a.y, 2, 24, 29, 144);
                l(a.x, a.y, 2, 24, 55, 144);
                "wait" != this.players[1].status && "enter" != this.players[1].status || t(33, 142, 22, 2, !1);
                d = m.sprite.players[0].left[2];
                (1 < this.players[0].lives || 1 == this.players[0].lives && "wait" == this.players[0].status) && l(d.x, d.y, 18, 18, 274, 147);
                g = this.players[0].lives - 1;
                "wait" != this.players[0].status && g--;
                for (c = 0; c < g; c++)
                    l(d.x, d.y, 18, 18, 301, 147 - 24 * c);
                d = m.sprite.players[1].right[2];
                (1 < this.players[1].lives || 1 == this.players[1].lives && "wait" == this.players[1].status) && l(d.x, d.y, 18, 18, 34, 147);
                g = this.players[1].lives - 1;
                "wait" != this.players[1].status && g--;
                for (c = 0; c < g; c++)
                    l(d.x, d.y, 18, 18, 7, 147 - 24 * c);
                "wait" == this.players[0].status && (c = Math.floor(this.players[0].frameCounters.entering / b.scanFPS),
                9 > c && 0 < c && v(c, 247, 165, 7));
                "wait" == this.players[1].status && (c = Math.floor(this.players[1].frameCounters.entering / b.scanFPS),
                9 > c && 0 < c && v(c, 71, 165, 6));
                this.players[0].animationRoutine();
                this.players[1].animationRoutine();
                this.players[0].bullet && this.players[0].bullet.animationRoutine();
                this.players[1].bullet && this.players[1].bullet.animationRoutine();
                for (c = 0; c < this.monsters.length; c++)
                    this.monsters[c].bullet && this.monsters[c].bullet.animationRoutine();
                for (c = 0; c < this.monsters.length; c++)
                    this.monsters[c].animationRoutine();
                l(a.x, a.y, 2, 24, 117, 152);
                l(a.x, a.y, 2, 24, 117, 176);
                l(a.x, a.y, 2, 24, 207, 152);
                l(a.x, a.y, 2, 24, 207, 176);
                l(f.x, f.y, 24, 2, 119, 150);
                l(f.x, f.y, 24, 2, 143, 150);
                l(f.x, f.y, 24, 2, 167, 150);
                l(f.x, f.y, 24, 2, 183, 150);
                v(this.radarText, 160 - 8 * Math.floor(this.radarText.length / 2), 152, this.radarTextColor, "c64", this.borderColor);
                t(119, 152, 88, 48, this.borderColor);
                for (c = 0; c < this.monsters.length; c++)
                    if (f = this.monsters[c],
                    "died" != f.status) {
                        if ("alive" == f.status)
                            if ("burwor" == f.type)
                                var h = 6;
                            else if ("garwor" == f.type)
                                h = 7;
                            else if ("thorwor" == f.type)
                                h = 2;
                            else
                                continue;
                        else if ("shooted" == f.status)
                            switch (w(4)) {
                            case 1:
                                h = 1;
                                break;
                            case 2:
                                h = 4;
                                break;
                            case 3:
                                h = 13;
                                break;
                            case 4:
                                h = 15
                            }
                        t(120 + 8 * (f.getCol() - 1), 153 + 8 * (f.getRow() - 1), 6, 6, h)
                    }
                e.displayScore(1, e.players[0].score);
                e.displayScore(2, e.players[1].score)
            }
        }
        ;
        this.scanTitle = function() {
            e.frameCounters.title++;
            e.frameCounters.title > u(13) ? (e.frameCounters.title = 0,
            e.animateSkip.title = !1,
            e.scene = "title") : e.frameCounters.title == u(7) && (e.scene = "enemyRoster",
            e.animateSkip.enemyRoster = !1);
            !0 === b.pressedKeys[m.keys[0].fire] && e.startNewGame(1);
            !0 === b.pressedKeys[m.keys[1].fire] && e.startNewGame(2);
            !0 === b.pressedKeys[49] ? (G(49),
            e.startNewGame(1)) : !0 === b.pressedKeys[50] ? (G(50),
            e.startNewGame(2)) : !0 === b.pressedKeys[51] && (G(51),
            window.location.href = "lobby.html")
        }
        ;
        this.scanGetReady = function() {
            this.frameCounters.getReady++;
            1 == this.frameCounters.getReady ? (this.animateSkip.getReady = !1,
            r("GetReady")) : this.frameCounters.getReady == u(1.2) ? this.animateSkip.getReady = !1 : this.frameCounters.getReady > u(4) && (this.frameCounters.doubleScore = 0,
            this.scene = "doubleScore")
        }
        ;
        this.scanGameOver = function() {
            this.frameCounters.gameOver++;
            1 == this.frameCounters.gameOver && (this.animateSkip.gameOver = !1,
            0 < e.players[0].score && this.subscribeToToplist(e.players[0].score),
            1 < this.numOfPlayers && 0 < e.players[1].score && this.subscribeToToplist(e.players[1].score));
            this.frameCounters.gameOver >= u(8) && (this.frameCounters.title = 0,
            this.animateSkip.title = !1,
            this.animateSkip.enemyRoster = !1,
            e.scene = "title",
            D.setToggler("full"))
        }
        ;
        this.scanDoubleScore = function() {
		this.frameCounters.doubleScore++;
		if (1 == this.frameCounters.doubleScore) {
			this.animateSkip.doubleScore = !1;
        
			// Csak akkor ellenőrizzük a 3-as osztót, ha a szint nagyobb mint 0
			// Így a 0. szinten (induláskor) úgy viselkedik, mint egy sima pálya
			if (!this.doubleScoreNext && (this.level === 0 || this.level % 3 !== 0)) {
				this.frameCounters.doubleScore = 0;
				this.nextDungeon();
				return;
			}
			
			this.doubleScoreNext && r("Doublescore");
			
			// Csak a 0-nál nagyobb, 3-mal osztható szinteken ad életet (3, 6, 9...)
			if (this.level > 0 && this.level % 3 === 0) {
				"out" != this.players[0].status && e.players[0].lives++;
				"out" != this.players[1].status && e.players[1].lives++;
			}
		}
		this.frameCounters.doubleScore >= u(4.9) && (this.frameCounters.doubleScore = 0,
		this.nextDungeon());
	}
        ;
        this.speedUp = function() {
            if (!(this.afterLastThorwor || 16 <= this.speed)) {
                this.speed++;
                var a = Math.round(this.speed / 2);
                7 < a && (a = 7);
                a != this.speedSoundTempo && (b.audio.stop("Speed" + this.speedSoundTempo),
                this.speedSoundTempo = a,
                r("Speed" + a, !0))
            }
        }
        ;
        this.gameOver = function() {
            b.audio.stopAllSound();
            r("GameOver");
            this.frameCounters.gameOver = 0;
            this.scene = "gameOver"
        }
        ;
        this.scanDungeon = function() {
            this.frameCounters.dungeon++;
            if (0 < this.frameCounters.worlukDeathAnimation)
                if (this.frameCounters.worlukDeathAnimation--,
                0 >= this.frameCounters.worlukDeathAnimation)
                    this.wallType = "blue",
                    z(0),
                    this.endDungeon();
                else {
                    var a = this.frameCounters.worlukDeathAnimation % 16
                      , c = 0;
                    11 < a ? c = 6 : 7 < a ? c = 0 : 3 < a && (c = 2);
                    z(c)
                }
            else if (0 < this.frameCounters.worlukEscaped)
                this.frameCounters.worlukEscaped--,
                0 >= this.frameCounters.worlukEscaped && ("dead" == this.players[0].status && this.players[0].lives--,
                "dead" == this.players[1].status && this.players[1].lives--,
                1 > this.players[0].lives && (this.players[0].status = "out"),
                1 > this.players[1].lives && (this.players[1].status = "out"),
                "out" == this.players[0].status && "out" == this.players[1].status ? (this.wallType = "red",
                z(0),
                this.gameOver()) : (this.wallType = "blue",
                ("alive" != this.players[0].status && "alive" != this.players[1].status || !this.wizardOfWor()) && this.endDungeon()));
            else if (0 < this.frameCounters.wizardEscaped)
                this.frameCounters.wizardEscaped--,
                0 >= this.frameCounters.wizardEscaped ? (this.players[0].lives || (this.players[0].status = "out"),
                this.players[1].lives || (this.players[1].status = "out"),
                "out" == this.players[0].status && "out" == this.players[1].status ? (this.wallType = "red",
                z(0),
                this.gameOver()) : (this.wallType = "blue",
                this.endDungeon())) : (a = this.frameCounters.wizardEscaped % 16,
                c = 0,
                11 < a ? c = 6 : 7 < a ? c = 0 : 3 < a && (c = 2),
                this.wallType = "red",
                z(c));
            else if (0 < this.frameCounters.wizardDeathAnimation)
                this.frameCounters.wizardDeathAnimation--,
                0 >= this.frameCounters.wizardDeathAnimation && (this.wallType = "blue",
                this.endDungeon());
            else {
                0 == this.frameCounters.dungeon % u(25) && this.speedUp();
                for (a = 0; a < this.monsters.length; a++)
                    this.monsters[a].scanRoutine();
                this.players[0].scanRoutine();
                this.players[1].scanRoutine();
                this.players[0].bullet && this.players[0].bullet.scanRoutine();
                this.players[1].bullet && this.players[1].bullet.scanRoutine();
                for (a = 0; a < this.monsters.length; a++)
                    this.monsters[a].bullet && this.monsters[a].bullet.scanRoutine();
                0 < this.frameCounters.teleportOpenDelay && (this.frameCounters.teleport++,
                this.frameCounters.teleport >= this.frameCounters.teleportOpenDelay && this.openTeleport())
            }
        }
        ;
        this.clearVisualFilter = function() {
            b.visualFilterContext.clearRect(0, 0, b.visualFilter.width, b.visualFilter.height)
        }
        ;
        this.visualFilter = function() {
            e.clearVisualFilter();
            "scanlines" == b.options.visualFilter ? e.visualFilterHorizontalLines() : "bwTv" == b.options.visualFilter ? (e.visualFilterHorizontalLines(),
            b.visualFilterContext.globalAlpha = .5,
            e.visualFilterNoise(),
            b.visualFilterContext.globalAlpha = 1) : "colorTv" == b.options.visualFilter ? (b.visualFilterContext.globalAlpha = .5,
            e.visualFilterNoise(),
            b.visualFilterContext.globalAlpha = 1) : "greenC64monitor" == b.options.visualFilter && e.visualFilterHorizontalLines()
        }
        ;
        this.visualFilterHorizontalLines = function() {
            b.visualFilterContext.fillStyle = "#" + m.colors[b.options.palette][0];
            for (var a = 0; a < b.visualFilter.height; a += 3)
                b.visualFilterContext.fillRect(0, a, b.visualFilter.width, 1)
        }
        ;
        this.visualFilterNoise = function() {
            for (var a = -Math.floor(120 * Math.random()), c = -Math.floor(120 * Math.random()); c < b.visualFilter.height; c += 384)
                for (var f = a; f < b.visualFilter.width; f += 384)
                    b.visualFilterContext.drawImage(q("crtNoise"), 0, 0, 128, 128, f, c, 384, 384)
        }
    }
    function O() {
        this.init = function() {
            this.audioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new this.audioContext;
            this.neededResources = "Speed1.ogg Speed2.ogg Speed3.ogg Speed4.ogg Speed5.ogg Speed6.ogg Speed7.ogg Death.ogg Doublescore.ogg EnemyFire.ogg Fire.ogg Enter.ogg GameOver.ogg GetReady.ogg Shooted.ogg Teleport.ogg Visible.ogg Worluk.ogg WorlukDeath.ogg WorlukEscape.ogg WizardDeath.ogg WizardEscape.ogg".split(" ");
            this.sounds = {};
            this.queue = [];
            this.activeSounds = []
        }
        ;
        this.request = function(a) {
            for (var c = 0; c < this.queue.length; c++)
                if (this.queue[c].name == a.name)
                    return;
            this.queue.push(a);
            return !0
        }
        ;
        this.playQueue = function() {
            for (var a = 0; a < this.queue.length; a++) {
                var c = this.queue[a];
                if (c.name) {
                    void 0 === c.loop && (c.loop = !1);
                    var f = this.play(c.name, c.loop);
                    f && this.activeSounds.push({
                        name: c.name,
                        bufferSource: f
                    })
                }
            }
            this.queue = []
        }
        ;
        this.stop = function(a) {
            for (var c = 0; c < this.activeSounds.length; c++)
                0 === this.activeSounds[c].name.indexOf(a) && (this.activeSounds[c].bufferSource.stop(0),
                this.activeSounds[c].name = "_stopped")
        }
        ;
        this.stopAllSound = function(a) {
            for (a = 0; a < this.activeSounds.length; a++)
                "_stopped" != this.activeSounds[a].name && this.activeSounds[a].bufferSource.stop(0);
            this.queue = [];
            this.activeSounds = []
        }
        ;
        this.loadAudioResource = function(a) {
            var c = this.neededResources[a]
              , f = c.split(".")[0]
              , d = new XMLHttpRequest;
            d.open("GET", "audio/v2.0/" + c, !0);
            d.responseType = "arraybuffer";
            d.onload = function() {
                b.audio.context.decodeAudioData(d.response, function(g) {
                    b.audio.sounds[f] = g;
                    a + 1 < b.audio.neededResources.length && b.audio.loadAudioResource(a + 1);
                    b.loadedResourcesCount++
                }, function(g) {})
            }
            ;
            d.send()
        }
        ;
        this.play = function(a, c) {
            if ("off" == b.options.sound)
                return !1;
            c = c ? !0 : !1;
            var f = this.context.createBufferSource();
            f.buffer = this.sounds[a];
            f.loop = c;
            f.connect(this.context.destination);
            f.start(this.context.currentTime, 0);
            return f
        }
    }
    var m = {
        colors: {
            grayscale: "000000 FFFFFF 424242 969696 545454 757575 353535 B8B8B8 545454 353535 757575 444444 6C6C6C B8B8B8 6C6C6C 959595".split(" "),
            vice: "000000 FFFFFF 68372b 70a4b2 6f3d86 588d43 352879 b8c76f 6f4f25 433900 9a6759 444444 6c6c6c 9ad284 6c5eb5 959595".split(" "),
            green: "010201 2cdd42 0d4114 1c8e2a 105018 167022 0a310f 22ad34 105018 0b3510 167022 0d4214 15671f 22ad34 14661f 1c8f2b".split(" "),
            "default": "000000 FDFEFC BE1A24 30E6C6 B41AE2 1FD21E 211BAE DFF60A B84104 6A3304 FE4A57 424540 70746F 59FE59 5F53FE A4A7A2".split(" ")
        },
        dungeons: {
            easy: "1x3,4x3,8x3,11x3,3x4,9x4,5x5,7x5|1x2,2x2,3x2,4x2,5x2,6x2,7x2,8x2,9x2,10x2,3x3,5x3,6x3,8x3,2x4,9x4,1x5,3x5,5x5,6x5,8x5,10x5,2x6,9x6 2x1,3x1,6x1,9x1,10x1,2x2,4x2,6x2,8x2,10x2,1x3,5x3,7x3,11x3,2x4,10x4,3x5,9x5|4x2,7x2,3x3,8x3,2x4,4x4,7x4,9x4,1x5,3x5,5x5,6x5,8x5,10x5,4x6,7x6 2x1,3x1,9x1,10x1,3x2,4x2,8x2,9x2,1x3,5x3,7x3,11x3,5x4,6x4,7x4,5x5,7x5|4x1,7x1,1x2,5x2,6x2,10x2,2x3,9x3,2x4,3x4,8x4,9x4,1x5,10x5,3x6,8x6 2x1,5x1,7x1,10x1,2x2,10x2,1x3,3x3,9x3,11x3,2x4,4x4,8x4,10x4,2x5,3x5,9x5,10x5|3x1,8x1,3x3,4x3,5x3,6x3,7x3,8x3,2x4,4x4,7x4,9x4,3x5,5x5,6x5,8x5,4x6,7x6 2x1,5x1,7x1,10x1,2x2,3x2,6x2,9x2,10x2,1x3,11x3,2x4,10x4,2x5,5x5,7x5,10x5|3x1,8x1,4x2,7x2,2x4,3x4,4x4,5x4,6x4,7x4,8x4,9x4,4x5,7x5,3x6,8x6 2x1,5x1,7x1,10x1,3x2,5x2,7x2,9x2,1x3,11x3,2x4,10x4,2x5,4x5,8x5,10x5|3x1,8x1,1x2,10x2,2x3,5x3,6x3,9x3,3x4,4x4,5x4,6x4,7x4,8x4,4x5,7x5,5x6,6x6 2x1,5x1,7x1,10x1,3x2,6x2,9x2,1x3,6x3,11x3,2x4,5x4,7x4,10x4,2x5,6x5,10x5|1x2,4x2,7x2,10x2,2x3,9x3,3x4,4x4,7x4,8x4,3x5,8x5,4x6,7x6 2x1,5x1,7x1,10x1,4x2,5x2,7x2,8x2,4x3,8x3,2x4,5x4,7x4,10x4,3x5,9x5|3x1,8x1,1x2,10x2,2x3,5x3,6x3,9x3,2x4,3x4,8x4,9x4,1x5,5x5,6x5,10x5,4x6,7x6 2x1,6x1,10x1,2x2,5x2,7x2,10x2,1x3,6x3,11x3,2x4,3x4,6x4,9x4,10x4,2x5,6x5,10x5|3x1,8x1,3x2,4x2,7x2,8x2,2x3,9x3,3x4,4x4,7x4,8x4,4x6,7x6 4x1,6x1,8x1,3x2,6x2,9x2,1x3,6x3,11x3,5x5,7x5|2x1,9x1,1x2,3x2,8x2,10x2,4x3,7x3,2x4,3x4,4x4,7x4,8x4,9x4,1x5,2x5,5x5,6x5,9x5,10x5,3x6,8x6 4x1,6x1,8x1,4x2,6x2,8x2,1x3,5x3,7x3,11x3,3x4,6x4,9x4,5x5,7x5|2x1,9x1,1x2,10x2,2x3,4x3,7x3,9x3,2x4,4x4,7x4,9x4,1x5,10x5,3x6,8x6 4x1,6x1,8x1,5x2,7x2,1x3,2x3,4x3,8x3,10x3,11x3,3x4,4x4,8x4,9x4,6x5|2x1,9x1,1x2,3x2,8x2,10x2,2x3,3x3,5x3,6x3,8x3,9x3,5x4,6x4,1x5,10x5,2x6,4x6,7x6,9x6".split(" "),
            hard: "2x1,5x1,7x1,10x1,3x2,6x2,9x2,4x3,8x3,5x4,7x4|2x2,9x2,3x3,8x3,4x4,7x4,2x5,5x5,6x5,9x5 2x1,6x1,10x1,3x2,6x2,9x2,4x3,8x3,3x4,6x4,9x4,2x5,6x5,10x5|4x2,7x2,1x3,10x3,1x4,10x4,4x5,7x5 2x1,10x1,3x2,5x2,7x2,9x2,3x4,5x4,7x4,9x4,2x5,10x5|2x2,5x2,6x2,9x2,3x3,4x3,7x3,8x3,3x4,4x4,7x4,8x4,2x5,5x5,6x5,9x5 2x1,10x1,4x2,5x2,7x2,8x2,2x3,10x3,3x4,4x4,8x4,9x4|2x2,5x2,6x2,9x2,2x3,3x3,8x3,9x3,4x4,7x4,2x5,9x5 2x2,4x2,8x2,10x2,2x4,4x4,8x4,10x4|1x2,4x2,7x2,10x2,2x3,5x3,6x3,9x3,3x4,5x4,6x4,8x4,1x5,4x5,7x5,10x5 5x1,7x1,2x2,3x2,9x2,10x2,4x3,5x3,7x3,8x3,2x4,10x4,3x5,4x5,8x5,9x5|2x2,5x2,6x2,9x2,2x3,4x3,7x3,9x3,1x4,4x4,7x4,10x4,2x5,9x5 5x1,7x1,4x2,8x2,3x3,9x3,2x4,5x4,7x4,10x4,4x5,8x5|4x2,7x2,3x3,8x3,2x4,5x4,6x4,9x4,4x5,7x5 |1x2,3x2,4x2,7x2,8x2,10x2,1x3,2x3,4x3,5x3,6x3,7x3,9x3,10x3,2x4,3x4,5x4,6x4,8x4,9x4,3x5,4x5,7x5,8x5".split(" "),
            fix: ["2x1,4x1,5x1,7x1,8x1,10x1,2x2,3x2,9x2,10x2,2x3,10x3,3x4,5x4,6x4,7x4,9x4,6x5|3x2,8x2,2x4,9x4,1x5,10x5,2x6,4x6,7x6,9x6", "|"]
        },
        sprite: {
            burwor: {
                up: [{
                    x: 126,
                    y: 0
                }, {
                    x: 108,
                    y: 0
                }, {
                    x: 144,
                    y: 0
                }],
                right: [{
                    x: 72,
                    y: 0
                }, {
                    x: 54,
                    y: 0
                }, {
                    x: 90,
                    y: 0
                }],
                down: [{
                    x: 180,
                    y: 0
                }, {
                    x: 162,
                    y: 0
                }, {
                    x: 198,
                    y: 0
                }],
                left: [{
                    x: 18,
                    y: 0
                }, {
                    x: 0,
                    y: 0
                }, {
                    x: 36,
                    y: 0
                }]
            },
            garwor: {
                up: [{
                    x: 126,
                    y: 18
                }, {
                    x: 108,
                    y: 18
                }, {
                    x: 144,
                    y: 18
                }],
                right: [{
                    x: 72,
                    y: 18
                }, {
                    x: 54,
                    y: 18
                }, {
                    x: 90,
                    y: 18
                }],
                down: [{
                    x: 180,
                    y: 18
                }, {
                    x: 162,
                    y: 18
                }, {
                    x: 198,
                    y: 18
                }],
                left: [{
                    x: 18,
                    y: 18
                }, {
                    x: 0,
                    y: 18
                }, {
                    x: 36,
                    y: 18
                }]
            },
            thorwor: {
                up: [{
                    x: 108,
                    y: 36
                }, {
                    x: 126,
                    y: 36
                }, {
                    x: 144,
                    y: 36
                }],
                right: [{
                    x: 54,
                    y: 36
                }, {
                    x: 72,
                    y: 36
                }, {
                    x: 90,
                    y: 36
                }],
                down: [{
                    x: 162,
                    y: 36
                }, {
                    x: 180,
                    y: 36
                }, {
                    x: 198,
                    y: 36
                }],
                left: [{
                    x: 0,
                    y: 36
                }, {
                    x: 18,
                    y: 36
                }, {
                    x: 36,
                    y: 36
                }]
            },
            worluk: [{
                x: 0,
                y: 108
            }, {
                x: 18,
                y: 108
            }, {
                x: 36,
                y: 108
            }],
            wizardOfWor: {
                up: [{
                    x: 108,
                    y: 90
                }, {
                    x: 126,
                    y: 90
                }, {
                    x: 144,
                    y: 90
                }],
                right: [{
                    x: 54,
                    y: 90
                }, {
                    x: 72,
                    y: 90
                }, {
                    x: 90,
                    y: 90
                }],
                down: [{
                    x: 162,
                    y: 90
                }, {
                    x: 180,
                    y: 90
                }, {
                    x: 198,
                    y: 90
                }],
                left: [{
                    x: 0,
                    y: 90
                }, {
                    x: 18,
                    y: 90
                }, {
                    x: 36,
                    y: 90
                }]
            },
            players: [{
                up: [{
                    x: 108,
                    y: 54
                }, {
                    x: 126,
                    y: 54
                }, {
                    x: 144,
                    y: 54
                }],
                right: [{
                    x: 54,
                    y: 54
                }, {
                    x: 72,
                    y: 54
                }, {
                    x: 90,
                    y: 54
                }],
                down: [{
                    x: 162,
                    y: 54
                }, {
                    x: 180,
                    y: 54
                }, {
                    x: 198,
                    y: 54
                }],
                left: [{
                    x: 0,
                    y: 54
                }, {
                    x: 18,
                    y: 54
                }, {
                    x: 36,
                    y: 54
                }],
                shoot: {
                    up: {
                        x: 90,
                        y: 108
                    },
                    right: {
                        x: 72,
                        y: 108
                    },
                    down: {
                        x: 108,
                        y: 108
                    },
                    left: {
                        x: 54,
                        y: 108
                    }
                },
                death: {
                    up: [{
                        x: 0,
                        y: 152
                    }, {
                        x: 18,
                        y: 152
                    }, {
                        x: 36,
                        y: 152
                    }],
                    down: [{
                        x: 54,
                        y: 152
                    }, {
                        x: 72,
                        y: 152
                    }, {
                        x: 90,
                        y: 152
                    }]
                }
            }, {
                up: [{
                    x: 108,
                    y: 72
                }, {
                    x: 126,
                    y: 72
                }, {
                    x: 144,
                    y: 72
                }],
                right: [{
                    x: 54,
                    y: 72
                }, {
                    x: 72,
                    y: 72
                }, {
                    x: 90,
                    y: 72
                }],
                down: [{
                    x: 162,
                    y: 72
                }, {
                    x: 180,
                    y: 72
                }, {
                    x: 198,
                    y: 72
                }],
                left: [{
                    x: 0,
                    y: 72
                }, {
                    x: 18,
                    y: 72
                }, {
                    x: 36,
                    y: 72
                }],
                shoot: {
                    up: {
                        x: 162,
                        y: 108
                    },
                    right: {
                        x: 144,
                        y: 108
                    },
                    down: {
                        x: 180,
                        y: 108
                    },
                    left: {
                        x: 126,
                        y: 108
                    }
                },
                death: {
                    up: [{
                        x: 108,
                        y: 152
                    }, {
                        x: 126,
                        y: 152
                    }, {
                        x: 144,
                        y: 152
                    }],
                    down: [{
                        x: 162,
                        y: 152
                    }, {
                        x: 180,
                        y: 152
                    }, {
                        x: 198,
                        y: 152
                    }]
                }
            }],
            hit: [{
                x: 0,
                y: 126
            }, {
                x: 106,
                y: 126
            }, {
                x: 142,
                y: 126
            }, {
                x: 178,
                y: 126
            }, {
                x: 18,
                y: 126
            }, {
                x: 124,
                y: 126
            }, {
                x: 160,
                y: 126
            }, {
                x: 196,
                y: 126
            }, {
                x: 0,
                y: 126
            }, {
                x: 106,
                y: 126
            }, {
                x: 142,
                y: 126
            }, {
                x: 178,
                y: 126
            }, {
                x: 18,
                y: 126
            }, {
                x: 124,
                y: 126
            }, {
                x: 160,
                y: 126
            }, {
                x: 196,
                y: 126
            }],
            texts: {
                get: {
                    x: 0,
                    y: 170,
                    w: 88,
                    h: 37
                },
                ready: {
                    x: 88,
                    y: 170,
                    w: 152,
                    h: 37
                },
                go: {
                    x: 0,
                    y: 207,
                    w: 56,
                    h: 37
                },
                "double": {
                    x: 0,
                    y: 244,
                    w: 184,
                    h: 37
                },
                score: {
                    x: 56,
                    y: 207,
                    w: 152,
                    h: 37
                },
                dungeon: {
                    x: 0,
                    y: 281,
                    w: 216,
                    h: 37
                },
                game: {
                    x: 0,
                    y: 318,
                    w: 128,
                    h: 37
                },
                over: {
                    x: 128,
                    y: 318,
                    w: 120,
                    h: 37
                }
            },
            enemyRosterPlayer2: {
                x: 198,
                y: 108
            },
            walls: {
                blue: {
                    h: {
                        x: 36,
                        y: 126
                    },
                    v: {
                        x: 60,
                        y: 126
                    }
                },
                red: {
                    h: {
                        x: 36,
                        y: 132
                    },
                    v: {
                        x: 74,
                        y: 126
                    }
                },
                worluk: {
                    h: [{
                        x: 36,
                        y: 136
                    }, {
                        x: 36,
                        y: 140
                    }, {
                        x: 0,
                        y: 144
                    }],
                    v: [{
                        x: 66,
                        y: 126
                    }, {
                        x: 70,
                        y: 126
                    }, {
                        x: 214,
                        y: 126
                    }]
                },
                wizardOfWor: {
                    h: [{
                        x: 36,
                        y: 144
                    }, {
                        x: 36,
                        y: 148
                    }, {
                        x: 0,
                        y: 148
                    }],
                    v: [{
                        x: 78,
                        y: 126
                    }, {
                        x: 82,
                        y: 126
                    }, {
                        x: 218,
                        y: 126
                    }]
                }
            },
            teleport: {
                wallOpen: {
                    x: 86,
                    y: 127,
                    w: 2,
                    h: 20
                },
                wallClose: {
                    x: 88,
                    y: 127,
                    w: 2,
                    h: 20
                },
                arrows: {
                    left: {
                        x: 90,
                        y: 126,
                        w: 8,
                        h: 8
                    },
                    right: {
                        x: 98,
                        y: 126,
                        w: 8,
                        h: 8
                    }
                }
            },
            bullets: {
                player: {
                    h: {
                        x: 90,
                        y: 134,
                        w: 8,
                        h: 2
                    },
                    v: {
                        x: 90,
                        y: 136,
                        w: 2,
                        h: 8
                    }
                },
                monster: {
                    h: {
                        x: 98,
                        y: 134,
                        w: 8,
                        h: 2
                    },
                    v: {
                        x: 92,
                        y: 136,
                        w: 2,
                        h: 8
                    }
                }
            }
        },
        scoring: {
            burwor: 100,
            garwor: 200,
            thorwor: 500,
            worluk: 1E3,
            worrior: 1E3,
            wizardOfWor: 2500
        },
        keys: [{
            up: 38,
            right: 39,
            down: 40,
            left: 37,
            fire: 17
        }, {
            up: 87,
            right: 68,
            down: 83,
            left: 65,
            fire: 16
        }],
        directions: ["up", "right", "down", "left"]
    }, q = function(a) {
        return document.querySelector("#" + a)
    }, x = function(a, c) {
        Array.prototype.slice.call(document.querySelectorAll(a)).map(c)
    }, F = function(a) {
        q(a).classList.remove("hide")
    }, w = function(a) {
        return Math.floor(Math.random() * a) + 1
    }, y = function(a, c, f, d, g, h, k, n) {
        return a + f < g || a > g + k || c + d < h || c > h + n ? !1 : !0
    }, G = function(a, c) {
        if ("number" === typeof a)
            b.pressedKeys[a] = "hold";
        else {
            var f = K(c), d;
            for (d in m.keys[c])
                d == a && (b.pressedKeys[m.keys[f][d]] = "hold")
        }
    }, J = function(a) {
        a = K(a);
        return {
            up: b.pressedKeys[m.keys[a].up],
            down: b.pressedKeys[m.keys[a].down],
            left: b.pressedKeys[m.keys[a].left],
            right: b.pressedKeys[m.keys[a].right],
            fire: b.pressedKeys[m.keys[a].fire]
        }
    }, K = function(a) {
        if (0 == a && "keyboardArrows" == b.options.yellowControl)
            return 0;
        if (0 == a && "keyboardWasd" == b.options.yellowControl)
            return 1;
        if (1 == a && "keyboardArrows" == b.options.blueControl)
            return 0;
        if (1 == a && "keyboardWasd" == b.options.blueControl)
            return 1;
        if (0 != a || "gamepad" != b.options.yellowControl || "keyboardWasd" != b.options.blueControl && "gamepad" != b.options.blueControl) {
            if (0 == a && "gamepad" == b.options.yellowControl && "keyboardArrows" == b.options.blueControl || 1 == a && "gamepad" == b.options.blueControl && ("keyboardArrows" == b.options.yellowControl || "gamepad" == b.options.yellowControl))
                return 1;
            if (1 == a && "gamepad" == b.options.blueControl && "keyboardWasd" == b.options.yellowControl)
                return 0
        } else
            return 0
    }, z = function(a) {
        e.borderColor != a && (e.borderColor = a,
        q("border").style.background = "#" + m.colors[b.options.palette][a])
    }, L = 16, C = function(a) {
        L != a && (L = a,
        b.canvas.fillStyle = "#" + m.colors[b.options.palette][a])
    }, t = function(a, c, f, d, g) {
        !1 !== g && C(g);
        b.canvas.fillRect(a * b.scale, c * b.scale, f * b.scale, d * b.scale)
    }, l = function(a, c, f, d, g, h) {
        b.canvas.drawImage(b.sprite, a, c, f, d, g * b.scale, h * b.scale, f * b.scale, d * b.scale)
    }, E = function(a) {
        t(0, 0, 320, 200, void 0 === a ? 0 : a)
    }, v = function(a, c, f, d, g, h) {
        a = "" + a;
        b.canvas.font = "c64" == g ? "25px C64ProRegular" : "46px WizardOfWor";
        if (void 0 !== h)
            for (C(h),
            h = 0; h < a.length; h++) {
                var k = a[h];
                " " != k && b.canvas.fillRect(c * b.scale + 8 * h * b.scale - 3, f * b.scale, 25, -(8 * b.scale))
            }
        C(d);
        for (h = 0; h < a.length; h++)
            k = a[h],
            " " != k && b.canvas.fillText(k, c * b.scale + 8 * h * b.scale + ("I" == k && "c64" == g ? b.scale : 0), f * b.scale)
    }, H = function(a, c) {
        a = a.toString();
        if (0 >= c - a.length)
            return a.split("").slice(0, c).join("");
        do
            a = " " + a;
        while (c > a.length);
        return a
    }, r = function(a, c) {
        b.audio.request({
            name: a,
            loop: void 0 === c ? !1 : c
        })
    }, u = function(a) {
        return Math.round(b.scanFPS * a)
    }, D = function() {
        q("menuOverlay").onclick = function() {
            q("menu").classList.contains("opened") && c()
        }
        ;
        q("menuToggler").onclick = function() {
            a()
        }
        ;
        x("#menu .l1", function(h) {
            h.onclick = function(k) {
                k.target.classList.contains("l1") && (k = this.querySelector(".items")) && (k.style.height = k.scrollHeight + "px",
                k.classList.toggle("closed"),
                f(k))
            }
        });
        q("menu .back").onclick = function() {
            c()
        }
        ;
        var a = function() {
            e.togglePause(!0);
            F("menuOverlay");
            q("menuToggler").classList.add("hide");
            q("menu").classList.add("opened");
            q("body").classList.add("menu");
            setTimeout(function() {
                window.onresize()
            }, 220)
        }
          , c = function() {
            f();
            q("menu").classList.remove("opened");
            q("body").classList.remove("menu");
            F("menuToggler");
            q("menuOverlay").classList.add("hide");
            e.togglePause(!1);
            setTimeout(function() {
                window.onresize()
            }, 220)
        }
          , f = function(h) {
            x("#menu .l1 .items", function(k) {
                h && h === k || k.classList.add("closed")
            })
        }
          , d = function() {
            x("#menu .items > div", function(n) {
                n.classList.remove("active")
            });
            for (var h = ["visualFilter", "sound", "yellowControl", "blueControl"], k = 0; k < h.length; k++)
                q(h[k] + 'Select div[data-value="' + b.options[h[k]] + '"]').classList.add("active")
        }
          , g = function(h) {
            return h.getAttribute("data-value") || ""
        };
        q("toggleFullscreen").onclick = function() {
            var h = window.document
              , k = h.documentElement
              , n = k.requestFullscreen || k.mozRequestFullScreen || k.webkitRequestFullScreen || k.msRequestFullscreen
              , A = h.exitFullscreen || h.mozCancelFullScreen || h.webkitExitFullscreen || h.msExitFullscreen;
            h.fullscreenElement || h.mozFullScreenElement || h.webkitFullscreenElement || h.msFullscreenElement ? A.call(h) : n.call(k)
        }
        ;
        x("#visualFilterSelect > div", function(h) {
            h.onclick = function() {
                var k = g(this);
                b.options.visualFilter = k;
                localStorage.setItem("visualFilter", k);
                d();
                b.applyVisualFilter();
                "none" == k && e.clearVisualFilter();
                e.resetAnimateSkips();
                e.animationRoutine()
            }
        });
        x("#soundSelect > div", function(h) {
            h.onclick = function() {
                var k = g(this);
                "off" == k ? b.audio.stopAllSound(!0) : b.audio.queue = [];
                b.options.sound = k;
                localStorage.setItem("sound", k);
                d()
            }
        });
        x("#yellowControlSelect > div", function(h) {
            h.onclick = function() {
                var k = g(this);
                b.options.yellowControl = k;
                localStorage.setItem("yellowControl", k);
                d();
                "keyboardArrows" == b.options.yellowControl && "keyboardArrows" == b.options.blueControl ? q('blueControlSelect > div[data-value="keyboardWasd"]').click() : "keyboardWasd" == b.options.yellowControl && "keyboardWasd" == b.options.blueControl && q('blueControlSelect > div[data-value="keyboardArrows"]').click()
            }
        });
        x("#blueControlSelect > div", function(h) {
            h.onclick = function() {
                var k = g(this);
                b.options.blueControl = k;
                localStorage.setItem("blueControl", k);
                d();
                "keyboardArrows" == b.options.blueControl && "keyboardArrows" == b.options.yellowControl ? q('yellowControlSelect > div[data-value="keyboardWasd"]').click() : "keyboardWasd" == b.options.blueControl && "keyboardWasd" == b.options.yellowControl && q('yellowControlSelect > div[data-value="keyboardArrows"]').click()
            }
        });
        return {
            refreshActiveOptions: d,
            isVisible: function() {
                return q("menu").classList.contains("opened")
            },
            setToggler: function(h) {
                "small" === h ? q("menuToggler").classList.add("small") : "full" === h && q("menuToggler").classList.remove("small")
            }
        }
    }(), e, b = new function() {
        this.options = {};
        this.pressedKeys = [];
        this.loadResourcesInterval = this.enableKeys = !1;
        this.neededResourcesCount = 1;
        this.loadedResourcesCount = 0;
        this.spriteImage = new Image;
        this.spriteWidth = 248;
        this.spriteHeight = 355;
        this.scale = 3;
        this.init = function() {
            x(".j", function(c) {
                c.remove()
            });
            var a = !0;
            
            navigator.onLine || (a = !1);
            a ? b.checkSystemRequirements(function() {
                b.audio = new O;
                b.audio.init();
                b.neededResourcesCount += b.audio.neededResources.length;
                b.setOptions();
                b.loadResources(function() {
                    D.refreshActiveOptions();
                    F("menuToggler");
                    b.initKeyHandling();
                    e = new N;
                    b.initEngine();
                    b.applyVisualFilter();
                    F("screen");
                    window._wowEngine = b;
                    window._wowGame = e;
                    window._wowNewBullet  = function(owner, x, y, d) { return new I(owner, x, y, d); };
                    window._wowNewMonster = function(type) { return new B(type); };
                    if (window._wowReady) window._wowReady(b, e)
                })
            }, function() {
                document.location = "/unsupported-browser.html"
            }) : document.location = ""
        }
        ;
        this.checkSystemRequirements = function(a, c) {
            var f = !0;
            !1 === (window.AudioContext || window.webkitAudioContext || !1) && (f = !1);
            window.animFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
            window.animFrame || (f = !1);
            f ? a() : c()
        }
        ;
        this.setOptions = function() {
            "4.0" !== localStorage.getItem("ver") && (localStorage.removeItem("palette"),
            localStorage.setItem("ver", "4.0"));
            b.options = {
                visualFilter: localStorage.getItem("visualFilter") || "scanlines",
                palette: localStorage.getItem("palette") || "default",
                sound: localStorage.getItem("sound") || "on",
                yellowControl: localStorage.getItem("yellowControl") || "keyboardArrows",
                blueControl: localStorage.getItem("blueControl") || "keyboardWasd",
                highScores: localStorage.getItem("highScores") || "0,0,0,0,0"
            };
            var a = b.options.highScores.split(",");
            b.options.highScores = [];
            for (var c = 0; c < a.length; c++)
                b.options.highScores[c] = +a[c]
        }
        ;
        this.loadResources = function(a) {
            b.loadResourcesInterval = setInterval(function() {
                b.loadedResourcesCount == b.neededResourcesCount && (clearInterval(b.loadResourcesInterval),
                a())
            }, 100);
            b.spriteImage.src = "images/v3.0/sprite.png";
            b.spriteImage.onload = function() {
                b.originalSprite = document.createElement("canvas");
                b.originalSprite.width = b.spriteWidth;
                b.originalSprite.height = b.spriteHeight;
                b.originalSpriteContext = b.originalSprite.getContext("2d");
                b.originalSpriteContext.drawImage(b.spriteImage, 0, 0);
                b.originalSpriteImageData = b.originalSpriteContext.getImageData(0, 0, b.spriteWidth, b.spriteHeight);
                b.changeGameSpriteColors();
                b.loadedResourcesCount++
            }
            ;
            b.audio.loadAudioResource(0)
        }
        ;
        this.initKeyHandling = function() {
            document.onkeydown = function(a) {
                var c = a.which;
                27 == c && e.resetGame();
                b.enableKeys || a.preventDefault();
                16 == c && 1 < a.location ? c = 0 : 17 == c && 2 > a.location && (c = 0);
                13 == c && (c = 17);
                if (!1 === b.pressedKeys[c] || void 0 === b.pressedKeys[c])
                    b.pressedKeys[c] = !0
            }
            ;
            document.onkeyup = function(a) {
                var c = a.which;
                b.enableKeys || a.preventDefault();
                16 == c && 1 < a.location ? c = 0 : 17 == c && 2 > a.location && (c = 0);
                13 == c && (c = 17);
                b.pressedKeys[c] = !1
            }
            ;
            window.onblur = function() {
                for (var a = 0; a < b.pressedKeys.length; a++)
                    if (!0 === b.pressedKeys[a] || "hold" === b.pressedKeys[a])
                        b.pressedKeys[a] = !1
            }
        }
        ;
        this.initEngine = function() {
            b.canvasElement = q("screen");
            b.canvas = b.canvasElement.getContext("2d");
            b.canvas.imageSmoothingEnabled = !1;
            b.canvas.mozImageSmoothingEnabled = !1;
            b.visualFilter = q("visualFilterLayer");
            b.visualFilterContext = b.visualFilter.getContext("2d");
            b.visualFilterContext.imageSmoothingEnabled = !1;
            b.visualFilterContext.mozImageSmoothingEnabled = !1;
            document.addEventListener("visibilitychange", function(a) {
                document.hidden ? e.togglePause(!0) : D.isVisible() || e.togglePause(!1)
            });
            window.onresize = function() {
                b.fullWidth = q("border").offsetWidth;
                b.fullHeight = q("border").offsetHeight;
                var a = 0;
                b.fullWidth > 320 * b.scale && b.fullHeight > 200 * b.scale && (a = 100,
                b.fullWidth -= a,
                b.fullHeight -= a);
                var c = Math.min(b.fullWidth / b.canvasElement.width, b.fullHeight / b.canvasElement.height);
                b.canvasElement.style.transform = "scale(" + c + ")";
                b.canvasElement.style.webkitTransform = "scale(" + c + ")";
                var f = Math.round((b.fullWidth - 320 * b.scale * c) / 2) + a / 2;
                b.canvasElement.style.margin = Math.round((b.fullHeight - 200 * b.scale * c) / 2) + a / 2 + "px " + f + "px 0px " + f + "px";
                b.visualFilter.width = window.innerWidth;
                b.visualFilter.height = window.innerHeight
            }
            ;
            window.onresize();
            b.scanFPS = 50;
            b.scanFrameTime = 1E3 / b.scanFPS;
            b.animationFrameCounter = 0;
            b.scanFrameCounter = 0;
            b.animation();
            b.startScan()
        }
        ;
        this.changeGameSpriteColors = function(a) {
            a || (a = b.options.palette);
            if (!m.colors[a]) { a = "default"; b.options.palette = "default"; localStorage.setItem("palette", "default") }
            var c = document.createElement("canvas");
            c.width = b.spriteWidth;
            c.height = b.spriteHeight;
            var f = c.getContext("2d");
            f.drawImage(b.spriteImage, 0, 0);
            for (var d = f.getImageData(0, 0, b.spriteWidth, b.spriteHeight), g = 0; g < b.originalSpriteImageData.data.length; g += 4)
                if (0 === b.originalSpriteImageData.data[g + 3])
                    d.data[g] = 0,
                    d.data[g + 1] = 0,
                    d.data[g + 2] = 0,
                    d.data[g + 3] = 0;
                else {
                    var h = m.colors[a][b.originalSpriteImageData.data[g]];
                    d.data[g] = parseInt(h[0] + h[1], 16);
                    d.data[g + 1] = parseInt(h[2] + h[3], 16);
                    d.data[g + 2] = parseInt(h[4] + h[5], 16);
                    d.data[g + 3] = 255
                }
            f.putImageData(d, 0, 0);
            b.makeSpriteImageBitmap(c)
        }
        ;
        this.makeSpriteImageBitmap = function(a) {
            b.sprite = a;
            "function" === typeof window.createImageBitmap && Promise.all([createImageBitmap(a, 0, 0, b.spriteWidth, b.spriteHeight)]).then(function(c) {
                b.sprite = c[0]
            })
        }
        ;
        this.applyVisualFilter = function() {
            var a = b.options.visualFilter;
            "none" == a ? (b.vfImageRendering("pixelated"),
            b.vfFilter("blur(0px)"),
            b.options.palette = "default") : "scanlines" == a ? (b.vfImageRendering("pixelated"),
            b.vfFilter("blur(0px)"),
            b.options.palette = "default") : "bwTv" == a ? (b.vfImageRendering("initial"),
            b.vfFilter("blur(1.5px) brightness(2.5)"),
            b.options.palette = "grayscale") : "colorTv" == a ? (b.vfImageRendering("initial"),
            b.vfFilter("contrast(1.7) brightness(1.5) saturate(0.8) blur(1.5px)"),
            b.options.palette = "vice") : "greenC64monitor" == a && (b.vfImageRendering("initial"),
            b.vfFilter("brightness(1.3) blur(1px)"),
            b.options.palette = "green");
            localStorage.setItem("palette", b.options.palette);
            b.changeGameSpriteColors();
            q("border").style.background = "#" + m.colors[b.options.palette][e.borderColor]
        }
        ;
        this.vfImageRendering = function(a) {
            b.canvasElement.style.imageRendering = a;
            b.visualFilter.style.imageRendering = a
        }
        ;
        this.vfFilter = function(a) {
            q("border").style.webkitFilter = a;
            q("border").style.filter = a
        }
        ;
        this.animation = function() {
            window.animFrame(function() {
                e.paused || b.animationRoutine();
                b.animation()
            })
        }
        ;
        this.startScan = function() {
            setInterval(function() {
                e.paused || b.scanRoutine()
            }, b.scanFrameTime)
        }
        ;
        this.animationRoutine = function() {
            b.animationFrameCounter++;
            e.animationRoutine()
        }
        ;
        this.scanRoutine = function() {
            e.refreshPressedKeysByGamepad();
            b.scanFrameCounter++;
            e.scanRoutine();
            b.audio.playQueue()
        }
    }
    ;
    b.init()
}
)();
