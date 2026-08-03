import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createInteractionManager } from './interactionManager.js';

const MOVE_SPEED = 3.2;
const SPRINT_MULTIPLIER = 1.7;
const FLY_SPEED = 7;
const DAMPING = 8;
const EYE_HEIGHT = 1.6;
const FLY_MIN_Y = 0.3;
const FLY_MAX_Y = 6;

export function createPlayer({ camera, domElement, scene, roomHalfExtents, spawn }) {
  const controls = new PointerLockControls(camera, domElement);
  const playerObject = controls.getObject();
  playerObject.position.copy(spawn);
  scene.add(playerObject);

  const blocker = document.getElementById('blocker');
  blocker.addEventListener('click', () => controls.lock());
  controls.addEventListener('lock', () => blocker.classList.add('hidden'));
  controls.addEventListener('unlock', () => blocker.classList.remove('hidden'));

  const interactions = createInteractionManager(playerObject);

  const keys = { forward: false, back: false, left: false, right: false, sprint: false, up: false, down: false };
  const velocity = new THREE.Vector3();

  let flyMode = false;
  const flyModeListeners = [];
  function toggleFlyMode() {
    flyMode = !flyMode;
    velocity.set(0, 0, 0);
    for (const cb of flyModeListeners) cb(flyMode);
  }

  window.addEventListener('keydown', (e) => setKey(e.code, true));
  window.addEventListener('keyup', (e) => setKey(e.code, false));

  function setKey(code, value) {
    switch (code) {
      case 'KeyW': case 'ArrowUp': keys.forward = value; break;
      case 'KeyS': case 'ArrowDown': keys.back = value; break;
      case 'KeyA': case 'ArrowLeft': keys.left = value; break;
      case 'KeyD': case 'ArrowRight': keys.right = value; break;
      case 'ControlLeft': case 'ControlRight': keys.sprint = value; break;
      case 'Space': keys.up = value; break;
      case 'ShiftLeft': case 'ShiftRight': keys.down = value; break;
    }
    if (value && code === 'KeyE') interactions.interact();
    if (value && code === 'Backquote') toggleFlyMode();
  }

  const halfW = roomHalfExtents.width;
  const halfD = roomHalfExtents.depth;
  // В режиме полёта границы шире (можно вылететь за стены и осмотреть уровень снаружи/сверху).
  const flyHalfW = halfW + 15;
  const flyHalfD = halfD + 15;

  let frozen = false;
  function setFrozen(value) {
    frozen = value;
    if (frozen) controls.unlock();
  }

  function update(delta) {
    if (frozen) return;

    velocity.x -= velocity.x * DAMPING * delta;
    velocity.z -= velocity.z * DAMPING * delta;
    velocity.y -= velocity.y * DAMPING * delta;

    const moveZ = Number(keys.forward) - Number(keys.back);
    const moveX = Number(keys.right) - Number(keys.left);
    if (moveZ !== 0 || moveX !== 0) {
      const dir = new THREE.Vector3(moveX, 0, -moveZ).normalize();
      const speed = (flyMode ? FLY_SPEED : MOVE_SPEED) * (keys.sprint ? SPRINT_MULTIPLIER : 1);
      velocity.x += dir.x * speed * DAMPING * delta;
      velocity.z += dir.z * speed * DAMPING * delta;
    }

    if (flyMode) {
      const moveY = Number(keys.up) - Number(keys.down);
      if (moveY !== 0) velocity.y += moveY * FLY_SPEED * DAMPING * delta;
    }

    controls.moveRight(velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    if (flyMode) {
      playerObject.position.y += velocity.y * delta;
      playerObject.position.x = THREE.MathUtils.clamp(playerObject.position.x, -flyHalfW, flyHalfW);
      playerObject.position.z = THREE.MathUtils.clamp(playerObject.position.z, -flyHalfD, flyHalfD);
      playerObject.position.y = THREE.MathUtils.clamp(playerObject.position.y, FLY_MIN_Y, FLY_MAX_Y);
    } else {
      playerObject.position.x = THREE.MathUtils.clamp(playerObject.position.x, -halfW, halfW);
      playerObject.position.z = THREE.MathUtils.clamp(playerObject.position.z, -halfD, halfD);
      playerObject.position.y = EYE_HEIGHT;
    }

    interactions.update();
  }

  return {
    controls,
    update,
    getPosition: () => playerObject.position,
    isSprinting: () => keys.sprint,
    isFlying: () => flyMode,
    onFlyModeChange: (cb) => flyModeListeners.push(cb),
    registerInteractable: interactions.register,
    unregisterInteractable: interactions.unregister,
    setFrozen
  };
}
