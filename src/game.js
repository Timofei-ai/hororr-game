import * as THREE from 'three';
import { createRoom, ROOM_SIZE, createExitDoor } from './scene.js';
import { createPlayer } from './player.js';
import { createRemotePlayerManager } from './remotePlayers.js';
import { createHud } from './hud.js';
import { net } from './net.js';
import { createFlashlightSystem } from './flashlight.js';
import { createInventory } from './inventory.js';
import { createObjectives } from './objectives.js';
import { createItemPickup } from './pickups.js';
import { createGeneratorRepair } from './generators.js';
import { showToast } from './toast.js';
import { startAmbientAudio } from './audio.js';

const MOVE_SEND_INTERVAL = 1 / 20; // 20 обновлений позиции в секунду достаточно для плавности
const EYE_HEIGHT = 1.6;

export function startGame(session) {
  const app = document.getElementById('app');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

  const scene = createRoom();

  const player = createPlayer({
    camera,
    domElement: renderer.domElement,
    scene,
    roomHalfExtents: { width: ROOM_SIZE.width / 2 - 0.4, depth: ROOM_SIZE.depth / 2 - 0.4 },
    spawn: new THREE.Vector3(0, EYE_HEIGHT, ROOM_SIZE.depth / 2 - 2)
  });
  document.getElementById('blocker').classList.remove('hidden');
  player.controls.addEventListener('lock', () => startAmbientAudio(camera), { once: true });

  const inventory = createInventory();
  const objectives = createObjectives({
    itemsTarget: 3,
    generatorsTarget: 2,
    onComplete: () => {
      exitDoor.setUnlocked(true);
      showToast('Все цели выполнены! Дверь открыта.');
    }
  });

  createFlashlightSystem({
    scene, camera, player, inventory,
    position: new THREE.Vector3(0, 0, -ROOM_SIZE.depth / 2 + 1.5)
  });

  const itemPositions = [
    new THREE.Vector3(-4, 0, -4),
    new THREE.Vector3(4, 0, 0),
    new THREE.Vector3(-3, 0, 5)
  ];
  itemPositions.forEach((position, i) => {
    createItemPickup({
      scene, player, inventory, objectives, position,
      id: `fuse-${i}`, label: 'Предохранитель', icon: '🔧'
    });
  });

  const generatorPositions = [
    new THREE.Vector3(5, 0, -5),
    new THREE.Vector3(-5, 0, 3)
  ];
  const generatorTickers = generatorPositions.map((position, i) =>
    createGeneratorRepair({ scene, player, objectives, position, id: `generator-${i}` })
  );

  const exitDoor = createExitDoor(
    scene,
    new THREE.Vector3(ROOM_SIZE.width / 2 - 0.05, 1.2, -ROOM_SIZE.depth / 2 + 3),
    -Math.PI / 2
  );

  const remotePlayers = createRemotePlayerManager(scene);
  for (const p of session.players) {
    if (p.id === session.selfId) continue;
    remotePlayers.addPlayer(p.id, p.nickname, p.color);
  }

  createHud(session.players, session.selfId);

  net.onPlayerMoved(({ id, position, rotationY }) => {
    remotePlayers.updateTarget(id, position, rotationY);
  });
  net.onPlayerLeft(({ id }) => {
    remotePlayers.removePlayer(id);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let sendTimer = 0;

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    player.update(delta);
    remotePlayers.tick(delta);
    for (const gen of generatorTickers) gen.tick(delta, player.getPosition());

    sendTimer += delta;
    if (sendTimer >= MOVE_SEND_INTERVAL) {
      sendTimer = 0;
      net.sendMove(camera.position.toArray(), camera.rotation.y);
    }

    renderer.render(scene, camera);
  }
  animate();
}
