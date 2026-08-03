// ИИ сущности живёт на сервере — это единственный источник правды о том, где
// монстр и кого он поймал. Клиенты только получают его позицию и рисуют.
const WAYPOINTS = [
  { x: -8, y: 0, z: -11 },
  { x: 8, y: 0, z: -11 },
  { x: 8, y: 0, z: 11 },
  { x: -8, y: 0, z: 11 },
  { x: -8, y: 0, z: 0 },
  { x: 8, y: 0, z: 0 },
  { x: 0, y: 0, z: 0 }
];

const PATROL_SPEED = 1.6;
const CHASE_SPEED = 3.6;
const CATCH_RADIUS = 1.3;
const LOSE_CHASE_RADIUS = 13;
const BASE_DETECTION = 5;
const FLASHLIGHT_BONUS = 3;
const MOVING_BONUS = 2;
const SPRINT_BONUS = 4;
const MOVING_THRESHOLD = 0.02; // метров за тик — порог "игрок шевелится"

function pickWaypoint() {
  return WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function moveToward(entity, targetPos, speed, dt) {
  const dx = targetPos.x - entity.position.x;
  const dz = targetPos.z - entity.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.001) return;
  const step = Math.min(d, speed * dt);
  entity.position.x += (dx / d) * step;
  entity.position.z += (dz / d) * step;
}

export function createEntity() {
  return {
    position: { x: 0, y: 0, z: -3 },
    state: 'patrol',
    waypoint: pickWaypoint(),
    targetId: null
  };
}

// players: [{ id, position, flashlightOn, eliminated, moving }]
// speedMultiplier растёт с номером уровня — монстр быстрее на более поздних уровнях.
// Возвращает { caughtId } если кого-то поймали в этом тике, иначе null.
export function tickEntity(entity, players, dt, speedMultiplier = 1) {
  const alive = players.filter((p) => p.position && !p.eliminated && !p.admin);
  const patrolSpeed = PATROL_SPEED * speedMultiplier;
  const chaseSpeed = CHASE_SPEED * speedMultiplier;

  if (entity.state === 'chase') {
    const target = alive.find((p) => p.id === entity.targetId);
    if (!target || distance2D(entity.position, target.position) > LOSE_CHASE_RADIUS) {
      entity.state = 'patrol';
      entity.targetId = null;
      entity.waypoint = pickWaypoint();
    } else {
      moveToward(entity, target.position, chaseSpeed, dt);
      if (distance2D(entity.position, target.position) < CATCH_RADIUS) {
        entity.state = 'patrol';
        entity.targetId = null;
        entity.waypoint = pickWaypoint();
        return { caughtId: target.id };
      }
      return null;
    }
  }

  let detected = null;
  for (const p of alive) {
    let radius = BASE_DETECTION;
    if (p.flashlightOn) radius += FLASHLIGHT_BONUS;
    if (p.sprinting) radius += SPRINT_BONUS;
    else if (p.moving) radius += MOVING_BONUS;
    if (distance2D(entity.position, p.position) <= radius) {
      detected = p;
      break;
    }
  }

  if (detected) {
    entity.state = 'chase';
    entity.targetId = detected.id;
    moveToward(entity, detected.position, chaseSpeed, dt);
    if (distance2D(entity.position, detected.position) < CATCH_RADIUS) {
      entity.state = 'patrol';
      entity.targetId = null;
      entity.waypoint = pickWaypoint();
      return { caughtId: detected.id };
    }
    return null;
  }

  moveToward(entity, entity.waypoint, patrolSpeed, dt);
  if (distance2D(entity.position, entity.waypoint) < 0.3) entity.waypoint = pickWaypoint();
  return null;
}

export { distance2D, MOVING_THRESHOLD };
