import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { ROOM_SIZE } from './scene.js';

const MOVE_SPEED = 3.2;
const DAMPING = 8;
const EYE_HEIGHT = 1.6;
const PICKUP_RANGE = 1.8;

export function createPlayer({ camera, domElement, scene, flashlightPickup }) {
  const controls = new PointerLockControls(camera, domElement);
  const playerObject = controls.getObject();
  playerObject.position.set(0, EYE_HEIGHT, ROOM_SIZE.depth / 2 - 2);
  scene.add(playerObject);

  const blocker = document.getElementById('blocker');
  const promptEl = document.getElementById('prompt');

  blocker.addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => blocker.classList.add('hidden'));
  controls.addEventListener('unlock', () => blocker.classList.remove('hidden'));

  const keys = { forward: false, back: false, left: false, right: false };
  const velocity = new THREE.Vector3();

  window.addEventListener('keydown', (e) => setKey(e.code, true));
  window.addEventListener('keyup', (e) => setKey(e.code, false));

  function setKey(code, value) {
    switch (code) {
      case 'KeyW': case 'ArrowUp': keys.forward = value; break;
      case 'KeyS': case 'ArrowDown': keys.back = value; break;
      case 'KeyA': case 'ArrowLeft': keys.left = value; break;
      case 'KeyD': case 'ArrowRight': keys.right = value; break;
    }
    if (value && code === 'KeyE') tryInteract();
  }

  let hasFlashlight = false;
  let flashlightOn = false;
  let spotlight = null;

  function equipFlashlight() {
    hasFlashlight = true;
    flashlightOn = true;
    flashlightPickup.group.visible = false;

    spotlight = new THREE.SpotLight(0xfff2cc, 6, 14, Math.PI / 7, 0.4, 1.5);
    spotlight.position.set(0, 0, 0);
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1);
    camera.add(target);
    spotlight.target = target;
    camera.add(spotlight);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        flashlightOn = !flashlightOn;
        spotlight.visible = flashlightOn;
      }
    });
  }

  function horizontalDistanceToPickup() {
    const dx = playerObject.position.x - flashlightPickup.group.position.x;
    const dz = playerObject.position.z - flashlightPickup.group.position.z;
    return Math.hypot(dx, dz);
  }

  function tryInteract() {
    if (hasFlashlight) return;
    if (horizontalDistanceToPickup() <= PICKUP_RANGE) {
      equipFlashlight();
      promptEl.classList.remove('visible');
    }
  }

  function updatePrompt() {
    if (hasFlashlight) return;
    if (horizontalDistanceToPickup() <= PICKUP_RANGE) {
      promptEl.textContent = 'Нажмите E, чтобы поднять фонарик';
      promptEl.classList.add('visible');
    } else {
      promptEl.classList.remove('visible');
    }
  }

  const halfW = ROOM_SIZE.width / 2 - 0.4;
  const halfD = ROOM_SIZE.depth / 2 - 0.4;

  function update(delta) {
    velocity.x -= velocity.x * DAMPING * delta;
    velocity.z -= velocity.z * DAMPING * delta;

    const moveZ = Number(keys.forward) - Number(keys.back);
    const moveX = Number(keys.right) - Number(keys.left);
    if (moveZ !== 0 || moveX !== 0) {
      const dir = new THREE.Vector3(moveX, 0, -moveZ).normalize();
      velocity.x += dir.x * MOVE_SPEED * DAMPING * delta;
      velocity.z += dir.z * MOVE_SPEED * DAMPING * delta;
    }

    controls.moveRight(velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    playerObject.position.x = THREE.MathUtils.clamp(playerObject.position.x, -halfW, halfW);
    playerObject.position.z = THREE.MathUtils.clamp(playerObject.position.z, -halfD, halfD);
    playerObject.position.y = EYE_HEIGHT;

    updatePrompt();
  }

  return { controls, update };
}
