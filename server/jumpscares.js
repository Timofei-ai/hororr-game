import { distance2D } from './entity.js';

// Джампскейры — редкое, "громкое" событие в отличие от частых тихих
// галлюцинаций. Держим их пореже (см. PROMPT.md: "keep them spaced out so
// they stay effective"), но чаще на поздних уровнях и когда рядом монстр
// или игрок один — то есть в моменты, когда тревога и так на пике.
const BASE_CHANCE_PER_TICK = 0.0004; // при тике 100мс — в среднем раз в ~4 минуты на 1 уровне
const ALONE_MULTIPLIER = 3;
const ENTITY_NEAR_MULTIPLIER = 3;
const ALONE_RADIUS = 10;
const ENTITY_NEAR_RADIUS = 7;
const COOLDOWN_MS = 25000; // не чаще раза в 25 секунд на одного игрока

// Каждый тик решаем, кому из живых игроков резко "прилетает" джампскейр —
// событие отправляется только этому одному сокету. jumpscareMultiplier
// растёт с номером уровня (см. levels.js).
export function tickJumpscares(io, room, dtMs, jumpscareMultiplier = 1) {
  const alive = [...room.players.entries()].filter(([, p]) => !p.eliminated && p.position && !p.admin);

  for (const [id, p] of alive) {
    p.jumpscareCooldown = (p.jumpscareCooldown || 0) - dtMs;
    if (p.jumpscareCooldown > 0) continue;

    const others = alive.filter(([oid]) => oid !== id);
    const isAlone = others.every(([, o]) => distance2D(p.position, o.position) > ALONE_RADIUS);
    const entityNear = room.entity && distance2D(p.position, room.entity.position) <= ENTITY_NEAR_RADIUS;

    let chance = BASE_CHANCE_PER_TICK * jumpscareMultiplier;
    if (isAlone) chance *= ALONE_MULTIPLIER;
    if (entityNear) chance *= ENTITY_NEAR_MULTIPLIER;

    if (Math.random() < chance) {
      p.jumpscareCooldown = COOLDOWN_MS;
      io.to(id).emit('jumpscare', { reason: 'ambient' });
    }
  }
}
