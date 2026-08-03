import { createEntity } from './entity.js';
import { LEVELS } from '../levels.js';

const MAX_PLAYERS = 5;

// Цвет назначается по порядку подключения — так игроков легко различать.
export const PLAYER_COLORS = [
  0xff5555, // красный
  0x55aaff, // голубой
  0x55ff88, // зелёный
  0xffcc44, // жёлтый
  0xcc77ff  // фиолетовый
];

// code -> { hostId, started, entity, players: Map(socketId -> {
//   nickname, color, position, lastPosition, flashlightOn, eliminated
// }) }
const rooms = new Map();

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
    players: [...room.players.entries()].map(([id, p]) => ({ id, nickname: p.nickname, color: p.color })),
    entity: room.started ? { position: room.entity.position, state: room.entity.state } : null,
    level: room.level || 0,
    collectedItems: room.started ? [...room.collectedItems] : [],
    repairedGenerators: room.started ? [...room.repairedGenerators] : [],
    objectivesComplete: room.started ? room.objectivesComplete : false
  };
}

function makePlayer(nickname, color) {
  return {
    nickname, color, position: null, lastPosition: null,
    flashlightOn: false, eliminated: false, hallucinationCooldown: 0, sprinting: false
  };
}

export function createRoom(nickname, socketId) {
  const code = generateCode();
  const room = { hostId: socketId, players: new Map(), started: false, entity: null };
  room.players.set(socketId, makePlayer(nickname, PLAYER_COLORS[0]));
  rooms.set(code, room);
  return serializeRoom(room, code);
}

export function joinRoom(code, nickname, socketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Комната не найдена' };
  if (room.started) return { error: 'Игра в этой комнате уже началась' };
  if (room.players.size >= MAX_PLAYERS) return { error: 'Комната заполнена' };

  room.players.set(socketId, makePlayer(nickname, PLAYER_COLORS[room.players.size % PLAYER_COLORS.length]));
  return { room: serializeRoom(room, code) };
}

export function startRoom(code, socketId) {
  const room = rooms.get(code);
  if (!room) return { error: 'Комната не найдена' };
  if (room.hostId !== socketId) return { error: 'Только хост может начать игру' };
  if (room.players.size < 2) return { error: 'Нужен хотя бы ещё один игрок' };
  room.started = true;
  room.entity = createEntity();
  room.level = 0;
  room.collectedItems = new Set();
  room.repairedGenerators = new Set();
  room.objectivesComplete = false;
  return { room: serializeRoom(room, code) };
}

export function findRoomBySocket(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.players.has(socketId)) return { code, room };
  }
  return null;
}

export function updatePlayerPosition(socketId, position, sprinting) {
  const found = findRoomBySocket(socketId);
  if (!found) return;
  const player = found.room.players.get(socketId);
  player.lastPosition = player.position;
  player.position = position;
  player.sprinting = Boolean(sprinting);
}

export function setPlayerFlashlight(socketId, on) {
  const found = findRoomBySocket(socketId);
  if (!found) return;
  found.room.players.get(socketId).flashlightOn = on;
}

function checkObjectivesComplete(room) {
  const config = LEVELS[room.level];
  if (room.collectedItems.size >= config.items.length && room.repairedGenerators.size >= config.generators.length) {
    room.objectivesComplete = true;
  }
}

export function collectItem(socketId, itemId) {
  const found = findRoomBySocket(socketId);
  if (!found || !found.room.started) return null;
  const { code, room } = found;
  const config = LEVELS[room.level];
  if (!config.items.some((i) => i.id === itemId)) return null;

  room.collectedItems.add(itemId);
  checkObjectivesComplete(room);
  return {
    code,
    itemId,
    collected: room.collectedItems.size,
    itemsTarget: config.items.length,
    objectivesComplete: room.objectivesComplete
  };
}

export function repairGenerator(socketId, generatorId) {
  const found = findRoomBySocket(socketId);
  if (!found || !found.room.started) return null;
  const { code, room } = found;
  const config = LEVELS[room.level];
  if (!config.generators.some((g) => g.id === generatorId)) return null;

  room.repairedGenerators.add(generatorId);
  checkObjectivesComplete(room);
  return {
    code,
    generatorId,
    repaired: room.repairedGenerators.size,
    generatorsTarget: config.generators.length,
    objectivesComplete: room.objectivesComplete
  };
}

// Любой игрок может воспользоваться разблокированной дверью — уровень общий на всю команду.
export function useExitDoor(socketId) {
  const found = findRoomBySocket(socketId);
  if (!found || !found.room.started) return { error: 'Вы не в игре' };
  const { code, room } = found;
  if (!room.objectivesComplete) return { error: 'Цели ещё не выполнены' };

  room.level += 1;
  if (room.level >= LEVELS.length) {
    return { code, won: true };
  }

  room.entity = createEntity();
  room.collectedItems = new Set();
  room.repairedGenerators = new Set();
  room.objectivesComplete = false;
  for (const p of room.players.values()) p.eliminated = false;

  return { code, won: false, level: room.level };
}

export function markPlayerCaught(socketId) {
  const found = findRoomBySocket(socketId);
  if (!found) return null;
  found.room.players.get(socketId).eliminated = true;
  const alive = [...found.room.players.values()].filter((p) => !p.eliminated);
  return { code: found.code, allCaught: alive.length === 0 };
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

export function forEachStartedRoom(callback) {
  for (const [code, room] of rooms.entries()) {
    if (room.started) callback(code, room);
  }
}
