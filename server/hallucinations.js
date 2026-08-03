import { distance2D } from './entity.js';

const TYPES = ['object-swap', 'fake-sound', 'distortion', 'phantom'];

const BASE_CHANCE_PER_TICK = 0.003; // при тике 100мс — в среднем раз в ~33с
const ALONE_MULTIPLIER = 4;
const ENTITY_NEAR_MULTIPLIER = 2.5;
const ALONE_RADIUS = 10;
const ENTITY_NEAR_RADIUS = 8;
const COOLDOWN_MS = 6000;

function randomNearby(pos) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 2 + Math.random() * 2;
  return { x: pos.x + Math.cos(angle) * dist, y: 0, z: pos.z + Math.sin(angle) * dist };
}

function buildPayload(type, player, others) {
  if (type === 'phantom') {
    if (others.length === 0) return buildPayload('object-swap', player, others);
    const [, teammate] = others[Math.floor(Math.random() * others.length)];
    return { type, position: randomNearby(player.position), nickname: teammate.nickname, color: teammate.color };
  }
  if (type === 'object-swap') return { type, position: randomNearby(player.position) };
  return { type }; // distortion / fake-sound не требуют параметров
}

// Каждый тик решаем, у кого из живых игроков "срывает" реальность — персонально,
// сервер отправляет событие только этому одному сокету. chanceMultiplier растёт
// с номером уровня — чем дальше, тем чаще накрывает.
export function tickHallucinations(io, room, dtMs, chanceMultiplier = 1) {
  const alive = [...room.players.entries()].filter(([, p]) => !p.eliminated && p.position);

  for (const [id, p] of alive) {
    p.hallucinationCooldown = (p.hallucinationCooldown || 0) - dtMs;
    if (p.hallucinationCooldown > 0) continue;

    const others = alive.filter(([oid]) => oid !== id);
    const isAlone = others.every(([, o]) => distance2D(p.position, o.position) > ALONE_RADIUS);
    const entityNear = room.entity && distance2D(p.position, room.entity.position) <= ENTITY_NEAR_RADIUS;

    let chance = BASE_CHANCE_PER_TICK * chanceMultiplier;
    if (isAlone) chance *= ALONE_MULTIPLIER;
    if (entityNear) chance *= ENTITY_NEAR_MULTIPLIER;

    if (Math.random() < chance) {
      p.hallucinationCooldown = COOLDOWN_MS;
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      io.to(id).emit('hallucination', buildPayload(type, p, others));
    }
  }
}
