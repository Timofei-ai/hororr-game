import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Скелет сети — используется начиная со Stage 2 (лобби и синхронизация игроков).
io.on('connection', (socket) => {
  console.log(`[server] player connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[server] player disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
