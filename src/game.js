import * as THREE from 'three';
import { createRoom, createFlashlightPickup } from './scene.js';
import { createPlayer } from './player.js';
import { createRemotePlayerManager } from './remotePlayers.js';
import { createHud } from './hud.js';
import { net } from './net.js';

const MOVE_SEND_INTERVAL = 1 / 20; // 20 обновлений позиции в секунду достаточно для плавности

export function startGame(session) {
  const app = document.getElementById('app');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.prepend(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

  const scene = createRoom();
  const flashlightPickup = createFlashlightPickup(scene);
  const player = createPlayer({ camera, domElement: renderer.domElement, scene, flashlightPickup });
  document.getElementById('blocker').classList.remove('hidden');

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

    sendTimer += delta;
    if (sendTimer >= MOVE_SEND_INTERVAL) {
      sendTimer = 0;
      net.sendMove(camera.position.toArray(), camera.rotation.y);
    }

    renderer.render(scene, camera);
  }
  animate();
}
