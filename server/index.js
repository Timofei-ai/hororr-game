import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import {
  createRoom, joinRoom, startRoom, leaveRoom,
  updatePlayerPosition, setPlayerFlashlight, setPlayerAdmin, markPlayerCaught, forEachStartedRoom,
  collectItem, repairGenerator, useExitDoor
} from './rooms.js';
import { tickEntity, distance2D, MOVING_THRESHOLD } from './entity.js';
import { tickHallucinations } from './hallucinations.js';
import { tickJumpscares } from './jumpscares.js';
import { LEVELS } from '../levels.js';

const ENTITY_TICK_MS = 100;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

function listPublicMedia(relDir) {
  const dir = path.join(__dirname, '..', 'public', relDir);
  try {
    return readdirSync(dir).filter((f) => /\.(mp3|wav|png|jpg|jpeg)$/i.test(f));
  } catch {
    return [];
  }
}

// Отдаёт список файлов, которые реально лежат в public/... — так клиент
// подхватывает любые файлы, добавленные пользователем, без переименования.
app.get('/api/hallucination-sounds', (req, res) => res.json(listPublicMedia('audio/hallucinations')));

// Джампскейры (Stage 6): картинки + звуки берутся из public/jumpscares —
// пользователь может подкидывать свои файлы без переименования и пересборки.
app.get('/api/jumpscares', (req, res) => {
  res.json({
    images: listPublicMedia('jumpscares').filter((f) => /\.(png|jpe?g)$/i.test(f)),
    sounds: listPublicMedia('jumpscares/sounds').filter((f) => /\.(mp3|wav)$/i.test(f))
  });
});

// В продакшене отдаём собранный клиент (npm run build -> dist/).
// В разработке фронтом занимается Vite (npm run dev:client) на другом порту.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

function sanitizeNickname(raw) {
  return String(raw || '').trim().slice(0, 16) || 'Игрок';
}

io.on('connection', (socket) => {
  console.log(`[server] player connected: ${socket.id}`);

  socket.on('create_room', ({ nickname }, ack) => {
    const room = createRoom(sanitizeNickname(nickname), socket.id);
    socket.join(room.code);
    ack({ ok: true, selfId: socket.id, ...room });
  });

  socket.on('join_room', ({ code, nickname }, ack) => {
    const result = joinRoom(String(code || '').trim(), sanitizeNickname(nickname), socket.id);
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    socket.join(result.room.code);
    ack({ ok: true, selfId: socket.id, ...result.room });
    socket.to(result.room.code).emit('lobby_update', result.room);
  });

  socket.on('start_game', (_data, ack) => {
    const found = [...socket.rooms].find((code) => code !== socket.id);
    const result = found ? startRoom(found, socket.id) : { error: 'Вы не в комнате' };
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    ack({ ok: true });
    io.to(result.room.code).emit('game_started', result.room);
  });

  socket.on('player_move', ({ position, rotationY, sprinting }) => {
    const found = [...socket.rooms].find((code) => code !== socket.id);
    if (!found) return;
    updatePlayerPosition(socket.id, { x: position[0], y: position[1], z: position[2] }, sprinting);
    socket.to(found).emit('player_moved', { id: socket.id, position, rotationY });
  });

  socket.on('flashlight_state', ({ on }) => {
    setPlayerFlashlight(socket.id, Boolean(on));
  });

  socket.on('set_admin_mode', ({ on }) => {
    setPlayerAdmin(socket.id, Boolean(on));
  });

  socket.on('collect_item', ({ itemId }) => {
    const result = collectItem(socket.id, itemId);
    if (result) io.to(result.code).emit('item_collected', result);
  });

  socket.on('repair_generator', ({ generatorId }) => {
    const result = repairGenerator(socket.id, generatorId);
    if (result) io.to(result.code).emit('generator_repaired', result);
  });

  socket.on('use_exit_door', (_data, ack) => {
    const result = useExitDoor(socket.id);
    if (result.error) {
      ack({ ok: false, error: result.error });
      return;
    }
    ack({ ok: true });
    if (result.won) io.to(result.code).emit('game_won', {});
    else io.to(result.code).emit('level_changed', { level: result.level });
  });

  socket.on('disconnect', () => {
    console.log(`[server] player disconnected: ${socket.id}`);
    const result = leaveRoom(socket.id);
    if (!result) return;
    if (result.room) {
      io.to(result.code).emit('lobby_update', result.room);
      io.to(result.code).emit('player_left', { id: socket.id });
    }
  });
});

setInterval(() => {
  const dt = ENTITY_TICK_MS / 1000;
  forEachStartedRoom((code, room) => {
    const players = [...room.players.entries()].map(([id, p]) => ({
      id,
      position: p.position,
      flashlightOn: p.flashlightOn,
      eliminated: p.eliminated,
      moving: p.position && p.lastPosition ? distance2D(p.position, p.lastPosition) > MOVING_THRESHOLD : false,
      sprinting: p.sprinting,
      admin: p.admin
    }));

    const config = LEVELS[room.level] || LEVELS[0];
    const result = tickEntity(room.entity, players, dt, config.entitySpeedMultiplier);
    io.to(code).emit('entity_update', { position: room.entity.position, state: room.entity.state });

    if (result?.caughtId) {
      const caught = markPlayerCaught(result.caughtId);
      io.to(code).emit('player_caught', { id: result.caughtId });
      io.to(result.caughtId).emit('jumpscare', { reason: 'caught' });
      if (caught?.allCaught) io.to(code).emit('game_over', { result: 'lose' });
    }

    tickHallucinations(io, room, ENTITY_TICK_MS, config.hallucinationMultiplier);
    tickJumpscares(io, room, ENTITY_TICK_MS, config.jumpscareMultiplier);
  });
}, ENTITY_TICK_MS);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
