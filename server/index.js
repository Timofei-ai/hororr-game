import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRoom, joinRoom, startRoom, leaveRoom } from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

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

  socket.on('player_move', ({ position, rotationY }) => {
    const found = [...socket.rooms].find((code) => code !== socket.id);
    if (!found) return;
    socket.to(found).emit('player_moved', { id: socket.id, position, rotationY });
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

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
