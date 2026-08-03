import * as THREE from 'three';
import { createFlashlightPickup } from './scene.js';

const PICKUP_RANGE = 1.8;

export function createFlashlightSystem({ scene, camera, player, inventory, position, onChange }) {
  const pickup = createFlashlightPickup(scene, position);
  let hasFlashlight = false;
  let flashlightOn = false;
  let spotlight = null;

  function notify() {
    if (onChange) onChange(hasFlashlight && flashlightOn);
  }

  function equip() {
    hasFlashlight = true;
    flashlightOn = true;
    pickup.group.visible = false;
    inventory.addItem({ label: 'Фонарик', icon: '🔦' });

    spotlight = new THREE.SpotLight(0xfff2cc, 120, 14, Math.PI / 7, 0.4, 1.5);
    spotlight.position.set(0, 0, 0);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1);
    camera.add(target);
    spotlight.target = target;
    camera.add(spotlight);
    notify();
  }

  player.registerInteractable('flashlight-table', {
    position,
    range: PICKUP_RANGE,
    prompt: 'Нажмите E, чтобы поднять фонарик',
    canInteract: () => !hasFlashlight,
    onInteract: () => equip()
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && hasFlashlight) {
      flashlightOn = !flashlightOn;
      spotlight.visible = flashlightOn;
      notify();
    }
  });

  return { hasFlashlight: () => hasFlashlight };
}
