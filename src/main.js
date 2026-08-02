import * as THREE from 'three';
import { createRoom, createFlashlightPickup } from './scene.js';
import { createPlayer } from './player.js';

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
app.prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

const scene = createRoom();
const flashlightPickup = createFlashlightPickup(scene);
const player = createPlayer({ camera, domElement: renderer.domElement, scene, flashlightPickup });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  player.update(delta);
  renderer.render(scene, camera);
}
animate();
