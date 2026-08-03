import * as THREE from 'three';
import { LEVELS } from '../levels.js';
import { createRoom, ROOM_SIZE, scatterDecor } from './scene.js';
import { createPlayer } from './player.js';
import { createRemotePlayerManager } from './remotePlayers.js';
import { createHud } from './hud.js';
import { net } from './net.js';
import { createFlashlightSystem } from './flashlight.js';
import { createInventory } from './inventory.js';
import { createLevelController } from './level.js';
import { showToast } from './toast.js';
import { createAudioListener, startAmbientAudio } from './audio.js';
import { createEntityRenderer } from './entity.js';
import { createHallucinationSystem } from './hallucinations.js';

const MOVE_SEND_INTERVAL = 1 / 20; // 20 обновлений позиции в секунду достаточно для плавности
const EYE_HEIGHT = 1.6;
const SPAWN = new THREE.Vector3(0, EYE_HEIGHT, ROOM_SIZE.depth / 2 - 2);

export function startGame(session) {
  const app = document.getElementById('app');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  app.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

  const scene = createRoom();
  scatterDecor(scene).catch((err) => console.warn('[decor] не удалось загрузить часть моделей:', err));

  const player = createPlayer({
    camera,
    domElement: renderer.domElement,
    scene,
    roomHalfExtents: { width: ROOM_SIZE.width / 2 - 0.4, depth: ROOM_SIZE.depth / 2 - 0.4 },
    spawn: SPAWN.clone()
  });
  document.getElementById('blocker').classList.remove('hidden');
  const audioListener = createAudioListener(camera);
  player.controls.addEventListener('lock', () => startAmbientAudio(audioListener), { once: true });

  const inventory = createInventory();

  const adminBadge = document.getElementById('admin-badge');
  let fogDensityBeforeFly = scene.fog.density;
  player.onFlyModeChange((flying) => {
    net.setAdminMode(flying);
    adminBadge.classList.toggle('visible', flying);
    if (flying) {
      fogDensityBeforeFly = scene.fog.density;
      scene.fog.density = 0.01; // в полёте туман почти не мешает осматривать уровень издалека/сверху
    } else {
      scene.fog.density = fogDensityBeforeFly;
    }
    showToast(
      flying ? 'Админ-режим: полёт включён, монстр вас не видит' : 'Админ-режим выключен',
      3500
    );
  });

  createFlashlightSystem({
    scene, camera, player, inventory,
    position: new THREE.Vector3(0, 0, -ROOM_SIZE.depth / 2 + 1.5),
    onChange: (isOn) => net.sendFlashlightState(isOn)
  });

  const levelController = createLevelController({ scene, player, inventory });
  levelController.buildLevel(session.level || 0);

  const remotePlayers = createRemotePlayerManager(scene);
  for (const p of session.players) {
    if (p.id === session.selfId) continue;
    remotePlayers.addPlayer(p.id, p.nickname, p.color);
  }

  const hud = createHud(session.players, session.selfId);
  const entity = createEntityRenderer(scene);
  const hallucinations = createHallucinationSystem({ scene, camera, renderer, remotePlayers, audioListener });

  net.onPlayerMoved(({ id, position, rotationY }) => {
    remotePlayers.updateTarget(id, position, rotationY);
  });
  net.onPlayerLeft(({ id }) => {
    remotePlayers.removePlayer(id);
  });
  net.onEntityUpdate((payload) => entity.setState(payload));
  net.onHallucination((payload) => hallucinations.handle(payload));
  net.onItemCollected((payload) => levelController.handleItemCollected(payload));
  net.onGeneratorRepaired((payload) => levelController.handleGeneratorRepaired(payload));
  net.onPlayerCaught(({ id }) => {
    hud.setEliminated(id, true);
    if (id === session.selfId) {
      player.setFrozen(true);
      document.getElementById('catch-overlay').classList.remove('hidden');
    } else {
      remotePlayers.setEliminated(id);
    }
  });
  net.onGameOver(() => {
    document.getElementById('catch-message').textContent = 'Раунд окончен: все игроки пойманы.';
    showToast('Все игроки пойманы. Раунд окончен.', 8000);
  });
  net.onLevelChanged(({ level }) => {
    player.setFrozen(false);
    document.getElementById('catch-overlay').classList.add('hidden');
    player.getPosition().copy(SPAWN);
    levelController.buildLevel(level);
    showToast(`Уровень ${level + 1}: ${LEVELS[level].name}`, 5000);
  });
  net.onGameWon(() => {
    player.setFrozen(true);
    showToast('ПОБЕДА! Вы прошли все уровни и выбрались из больницы.', 10000);
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
    entity.tick(delta);
    hallucinations.tick(delta);
    levelController.tick(delta, player.getPosition());

    sendTimer += delta;
    if (sendTimer >= MOVE_SEND_INTERVAL) {
      sendTimer = 0;
      net.sendMove(camera.position.toArray(), camera.rotation.y, player.isSprinting());
    }

    renderer.render(scene, camera);
  }
  animate();
}
