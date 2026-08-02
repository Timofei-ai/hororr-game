import { createGeneratorProp } from './scene.js';

const RANGE = 2;
const REPAIR_SECONDS = 3;

// Генератор: пока чинишь (несколько секунд стоя на месте), игрок уязвим —
// если отойти дальше радиуса, ремонт сбрасывается и надо начинать заново.
export function createGeneratorRepair({ scene, player, objectives, position, id }) {
  const prop = createGeneratorProp(scene, position);
  let state = 'idle'; // idle | repairing | done
  let elapsed = 0;

  player.registerInteractable(id, {
    position,
    range: RANGE,
    canInteract: () => state !== 'done',
    prompt: () => {
      if (state === 'repairing') {
        const pct = Math.floor((elapsed / REPAIR_SECONDS) * 100);
        return `Ремонт генератора… ${pct}% (не отходите)`;
      }
      return 'Нажмите E, чтобы чинить генератор';
    },
    onInteract: () => {
      if (state === 'idle') {
        state = 'repairing';
        elapsed = 0;
      }
    }
  });

  function tick(delta, playerPosition) {
    if (state !== 'repairing') return;

    const dx = playerPosition.x - position.x;
    const dz = playerPosition.z - position.z;
    if (Math.hypot(dx, dz) > RANGE) {
      state = 'idle';
      elapsed = 0;
      return;
    }

    elapsed += delta;
    if (elapsed >= REPAIR_SECONDS) {
      state = 'done';
      prop.setRepaired(true);
      player.unregisterInteractable(id);
      objectives.activateGenerator();
    }
  }

  return { tick };
}
