import * as THREE from 'three';
import { LEVELS } from '../levels.js';
import { ROOM_SIZE, createPickupProp, createGeneratorProp, createExitDoor } from './scene.js';
import { createObjectives } from './objectives.js';
import { showToast } from './toast.js';
import { net } from './net.js';

const ITEM_RANGE = 1.8;
const GENERATOR_RANGE = 2;
const REPAIR_SECONDS = 3;
const DOOR_POSITION = new THREE.Vector3(ROOM_SIZE.width / 2 - 0.05, 1.2, -ROOM_SIZE.depth / 2 + 3);
const DOOR_RANGE = 2;

// Владеет предметами/генераторами/дверью ТЕКУЩЕГО уровня. Цели общие на всю
// команду — счётчики и события сбора/ремонта приходят с сервера, здесь их
// только визуализируем и предлагаем взаимодействие по E.
export function createLevelController({ scene, player, inventory }) {
  const itemMeshes = new Map(); // id -> mesh
  const generators = new Map(); // id -> { prop, position, status, elapsed }
  let exitDoor = null;
  let doorUnlocked = false;
  let objectives = null;

  function clearLevel() {
    for (const [id, mesh] of itemMeshes.entries()) {
      scene.remove(mesh);
      player.unregisterInteractable(`item-${id}`);
    }
    itemMeshes.clear();

    for (const [id, g] of generators.entries()) {
      scene.remove(g.prop.group);
      player.unregisterInteractable(`gen-${id}`);
    }
    generators.clear();

    if (exitDoor) {
      scene.remove(exitDoor.mesh);
      player.unregisterInteractable('exit-door');
      exitDoor = null;
    }
    doorUnlocked = false;
  }

  function buildLevel(levelIndex) {
    clearLevel();
    const config = LEVELS[levelIndex];
    scene.fog.density = config.fogDensity;

    objectives = createObjectives({
      itemsTarget: config.items.length,
      generatorsTarget: config.generators.length,
      onComplete: () => {
        doorUnlocked = true;
        exitDoor.setUnlocked(true);
        showToast('Все цели выполнены! Дверь открыта — подойдите и нажмите E.');
      }
    });

    for (const item of config.items) {
      const position = new THREE.Vector3(item.x, 0, item.z);
      itemMeshes.set(item.id, createPickupProp(scene, position));
      player.registerInteractable(`item-${item.id}`, {
        position,
        range: ITEM_RANGE,
        prompt: 'Нажмите E, чтобы поднять: Предохранитель',
        canInteract: () => itemMeshes.has(item.id),
        onInteract: () => {
          net.collectItem(item.id);
          inventory.addItem({ label: 'Предохранитель', icon: '🔧' });
          const mesh = itemMeshes.get(item.id);
          if (mesh) scene.remove(mesh);
          itemMeshes.delete(item.id);
          player.unregisterInteractable(`item-${item.id}`);
        }
      });
    }

    for (const gen of config.generators) {
      const position = new THREE.Vector3(gen.x, 0, gen.z);
      const prop = createGeneratorProp(scene, position);
      const state = { prop, position, status: 'idle', elapsed: 0 };
      generators.set(gen.id, state);

      player.registerInteractable(`gen-${gen.id}`, {
        position,
        range: GENERATOR_RANGE,
        canInteract: () => state.status !== 'done',
        prompt: () => (state.status === 'repairing'
          ? `Ремонт генератора… ${Math.floor((state.elapsed / REPAIR_SECONDS) * 100)}% (не отходите)`
          : 'Нажмите E, чтобы чинить генератор'),
        onInteract: () => {
          if (state.status === 'idle') {
            state.status = 'repairing';
            state.elapsed = 0;
          }
        }
      });
    }

    exitDoor = createExitDoor(scene, DOOR_POSITION, -Math.PI / 2);
    player.registerInteractable('exit-door', {
      position: DOOR_POSITION,
      range: DOOR_RANGE,
      prompt: 'Нажмите E, чтобы пройти дальше',
      canInteract: () => doorUnlocked,
      onInteract: () => net.useExitDoor().catch(() => {})
    });
  }

  function tick(delta, playerPosition) {
    for (const [id, state] of generators.entries()) {
      if (state.status !== 'repairing') continue;
      const dx = playerPosition.x - state.position.x;
      const dz = playerPosition.z - state.position.z;
      if (Math.hypot(dx, dz) > GENERATOR_RANGE) {
        state.status = 'idle';
        state.elapsed = 0;
        continue;
      }
      state.elapsed += delta;
      if (state.elapsed >= REPAIR_SECONDS) {
        state.status = 'done';
        state.prop.setRepaired(true);
        player.unregisterInteractable(`gen-${id}`);
        net.repairGenerator(id);
      }
    }
  }

  function handleItemCollected({ itemId, collected, objectivesComplete }) {
    const mesh = itemMeshes.get(itemId);
    if (mesh) {
      scene.remove(mesh);
      itemMeshes.delete(itemId);
      player.unregisterInteractable(`item-${itemId}`);
    }
    objectives.setCounts({ items: collected, objectivesComplete });
  }

  function handleGeneratorRepaired({ generatorId, repaired, objectivesComplete }) {
    const state = generators.get(generatorId);
    if (state && state.status !== 'done') {
      state.status = 'done';
      state.prop.setRepaired(true);
      player.unregisterInteractable(`gen-${generatorId}`);
    }
    objectives.setCounts({ generators: repaired, objectivesComplete });
  }

  return { buildLevel, tick, handleItemCollected, handleGeneratorRepaired };
}
