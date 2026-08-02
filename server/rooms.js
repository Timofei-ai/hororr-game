const MAX_PLAYERS = 5;

// Цвет назначается по порядку подключения — так игроков легко различать.
export const PLAYER_COLORS = [
  0xff5555, // красный
  0x55aaff, // голубой
  0x55ff88, // зелёный
  0xffcc44, // жёлтый
  0xcc77ff  // фиолетовый
];

const rooms = new Map(); // code -> { hostId, players: Map(socketId -> {nickname, color}), started }

function generateCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms.has(code));
  return code;
}

function serializeRoom(room, code) {
  return {
    code,
    hostId: room.hostId,
    started: room.started,
    players: [...room.players.entries()].map(([id, p]) => ({ id, nickname: p.nickname, color: p.color }))
  };
}

export function createRoom(nickname, socketId) {
  const code = generateCode();
  const room = { hostId: socketId, players: new Map(), started: false };
  room.players.set(socketId, { nickname, color: PLAYER_COLORS[0] });
  rooms.set(code, room);
  return serializeRoom(room, code);
}

export function joinRoom(code, nickname, socketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Комната не найдена' };
  if (room.started) return { error: 'Игра в этой комнате уже началась' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Комната заполнена' };

  room.players.set(socketId, { nickname, color: PLAYER_COLORS[room.players.size % PLAYER_COLORS.length] });
  return { room: serializeRoom(room, code) };
}

export function startRoom(code, socketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Комната не найдена' };
  if (room.hostId !== socketId) return { error: 'Только хост может начать игру' };
  if (room.players.size < 2) return { error: 'Нужен хотя бы ещё один игрок' };
  room.started = true;
  return { room: serializeRoom(room, code) };
}

export function findRoomBySocket(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.players.has(socketId)) return { code, room };
  }
  return null;
}

export function leaveRoom(socketId) {
  const found = findRoomBySocket(socketId);
  if (!found) return null;
  const { code, room } = found;
  room.players.delete(socketId);

  if (room.players.size === 0) {
    rooms.delete(code);
    return { code, room: null };
  }
  if (room.hostId === socketId) {
    room.hostId = room.players.keys().next().value;
  }
  return { code, room: serializeRoom(room, code) };
}

export function getRoom(code) {
  const room = rooms.get(code);
  return room ? serializeRoom(room, code) : null;
}
