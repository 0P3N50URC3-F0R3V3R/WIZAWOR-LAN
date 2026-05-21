const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e6
});

app.use(express.static(path.join(__dirname)));

// lobbies: roomId -> { host, client, spectators[], seed, started }
const lobbies = new Map();

// pending: roomId -> [socket, ...] waiting for host
const pending = new Map();

function spectatorCount(lobby) {
    return lobby.spectators.length;
}

function broadcastSpectatorUpdate(lobby) {
    const count = spectatorCount(lobby);
    lobby.host.emit('spectator-update', { count });
    if (lobby.client) lobby.client.emit('spectator-update', { count });
    lobby.spectators.forEach(s => s.emit('spectator-update', { count }));
}

io.on('connection', (socket) => {
    let currentRoom = null;
    let currentRole = null;

    // ── Host creates lobby ────────────────────────────────────────────────────
    socket.on('create-lobby', (data, callback) => {
        const roomId = data.roomId;
        if (lobbies.has(roomId)) { callback({ error: 'Room already exists' }); return; }
        const seed = Math.floor(Math.random() * 0xFFFFFF) + 1;
        lobbies.set(roomId, { host: socket, client: null, spectators: [], seed, started: false });
        currentRoom = roomId;
        currentRole = 'host';
        socket.join(roomId);
        console.log(`[${roomId}] Host connected`);
        callback({ ok: true, seed });

        if (pending.has(roomId)) {
            const waiters = pending.get(roomId);
            pending.delete(roomId);
            waiters.forEach(({ ws, cb }) => {
                const lobby = lobbies.get(roomId);
                if (lobby && !lobby.client) {
                    lobby.client = ws;
                    ws.join(roomId);
                    lobby.host.emit('player-joined');
                    cb({ ok: true, seed: lobby.seed, started: lobby.started, spectatorCount: spectatorCount(lobby) });
                    console.log(`[${roomId}] Pending client connected`);
                } else {
                    cb({ full: true, seed: lobby.seed, started: lobby.started, spectatorCount: spectatorCount(lobby) });
                }
            });
        }
    });

    // ── Client joins as player ────────────────────────────────────────────────
    socket.on('join-lobby', (data, callback) => {
        const roomId = data.roomId;
        const lobby = lobbies.get(roomId);

        if (!lobby) {
            if (!pending.has(roomId)) pending.set(roomId, []);
            pending.get(roomId).push({ ws: socket, cb: callback });
            console.log(`[${roomId}] Client queued`);
            setTimeout(() => {
                if (pending.has(roomId)) {
                    const waiters = pending.get(roomId);
                    const idx = waiters.findIndex(w => w.ws === socket);
                    if (idx !== -1) { waiters.splice(idx, 1); callback({ error: 'Room not found (timeout)' }); }
                    if (waiters.length === 0) pending.delete(roomId);
                }
            }, 30000);
            return;
        }

        if (lobby.client) {
            // Player slot taken — caller may join as spectator instead
            callback({ full: true, seed: lobby.seed, started: lobby.started, spectatorCount: spectatorCount(lobby) });
            return;
        }

        lobby.client = socket;
        currentRoom = roomId;
        currentRole = 'client';
        socket.join(roomId);
        lobby.host.emit('player-joined');
        console.log(`[${roomId}] Client connected`);
        callback({ ok: true, seed: lobby.seed, started: lobby.started, spectatorCount: spectatorCount(lobby) });
    });

    // ── Spectator joins ───────────────────────────────────────────────────────
    socket.on('join-spectator', (data, callback) => {
        const roomId = data.roomId;
        const lobby = lobbies.get(roomId);
        if (!lobby) { callback({ error: 'Room not found' }); return; }

        lobby.spectators.push(socket);
        currentRoom = roomId;
        currentRole = 'spectator';
        socket.join(roomId);
        broadcastSpectatorUpdate(lobby);
        console.log(`[${roomId}] Spectator joined (${spectatorCount(lobby)} total)`);
        callback({ ok: true, seed: lobby.seed, started: lobby.started });
    });

    // ── Game start ────────────────────────────────────────────────────────────
    socket.on('game-start', (data) => {
        if (currentRoom && currentRole === 'host') {
            const lobby = lobbies.get(currentRoom);
            if (lobby) {
                lobby.started = true;
                socket.to(currentRoom).emit('game-start', data || {});
                console.log(`[${currentRoom}] Game started`);
            }
        }
    });

    // ── Input relay ───────────────────────────────────────────────────────────
    socket.on('p1-input', (data) => {
        if (currentRoom && currentRole === 'host') {
            const lobby = lobbies.get(currentRoom);
            if (lobby && lobby.client) lobby.client.emit('p1-input', data);
        }
    });

    socket.on('p2-input', (data) => {
        if (currentRoom && currentRole === 'client') {
            const lobby = lobbies.get(currentRoom);
            if (lobby && lobby.host) lobby.host.emit('p2-input', data);
        }
    });

    // ── State relay (host → client + all spectators) ──────────────────────────
    socket.on('pos-sync', (data) => {
        if (currentRoom && currentRole === 'host') {
            const lobby = lobbies.get(currentRoom);
            if (!lobby) return;
            if (lobby.client) lobby.client.emit('pos-sync', data);
            lobby.spectators.forEach(s => s.emit('pos-sync', data));
        }
    });

    socket.on('game-state', (data) => {
        if (currentRoom && currentRole === 'host') {
            const lobby = lobbies.get(currentRoom);
            if (!lobby) return;
            if (lobby.client) lobby.client.emit('game-state', data);
            lobby.spectators.forEach(s => s.emit('game-state', data));
        }
    });

    socket.on('snd', (data) => {
        if (currentRoom && currentRole === 'host') {
            const lobby = lobbies.get(currentRoom);
            if (!lobby) return;
            if (lobby.client) lobby.client.emit('snd', data);
            lobby.spectators.forEach(s => s.emit('snd', data));
        }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        if (!currentRoom) return;
        const lobby = lobbies.get(currentRoom);
        if (!lobby) return;

        if (currentRole === 'spectator') {
            const idx = lobby.spectators.indexOf(socket);
            if (idx !== -1) lobby.spectators.splice(idx, 1);
            broadcastSpectatorUpdate(lobby);
            console.log(`[${currentRoom}] Spectator left (${spectatorCount(lobby)} remaining)`);
        } else {
            socket.to(currentRoom).emit('player-left', { role: currentRole });
            if (currentRole === 'host') {
                lobbies.delete(currentRoom);
                console.log(`[${currentRoom}] Host left - lobby closed`);
            } else {
                lobby.client = null;
                console.log(`[${currentRoom}] Client left`);
            }
        }

        if (pending.has(currentRoom)) {
            const waiters = pending.get(currentRoom).filter(w => w.ws !== socket);
            if (waiters.length === 0) pending.delete(currentRoom);
            else pending.set(currentRoom, waiters);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Wizard of Wor multiplayer server → http://localhost:${PORT}`);
    console.log(`Lobby page → http://localhost:${PORT}/lobby.html`);
});
