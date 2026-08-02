import { createPickupProp } from './scene.js';

const PICKUP_RANGE = 1.8;

// Регистрирует предмет для подбора (например, предохранитель): подбирается
// мгновенно по E, пропадает со сцены и уходит в инвентарь + прогресс целей.
export function createItemPickup({ scene, player, inventory, objectives, position, id, label, icon }) {
  const mesh = createPickupProp(scene, position);
  let collected = false;

  player.registerInteractable(id, {
    position,
    range: PICKUP_RANGE,
    prompt: `Нажмите E, чтобы поднять: ${label}`,
    canInteract: () => !collected,
    onInteract: () => {
      collected = true;
      scene.remove(mesh);
      player.unregisterInteractable(id);
      inventory.addItem({ label, icon });
      objectives.collectItem();
    }
  });
}
