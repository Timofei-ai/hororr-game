import * as THREE from 'three';
import { loadMonsterModel, cloneMonsterModel } from './models.js';

const OBJECT_SWAP_DURATION = 3.5;
const PHANTOM_DURATION = 4;
const DISTORTION_DURATION = 2.5;
const IMAGE_FLASH_DURATION = 700;
const BASE_FOV = 75;
// Тот же угол, что и у настоящей сущности (src/entity.js) — иначе призрак
// монстра стоит в неестественной позе вместо того, чтобы "смотреть" на игрока.
const MODEL_FORWARD_OFFSET = Math.PI;

function createPlaceholderMonster() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x0a0000, roughness: 1 })
  );
  body.position.y = 1.1;
  group.add(body);

  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 1.75, 0.28);
  eyeR.position.set(0.1, 1.75, 0.28);
  group.add(eyeL, eyeR);
  return group;
}

// "Подмена объекта": на месте, где ничего нет, на пару секунд появляется
// монстр — берём тот же клон модели, что и настоящая сущность, чтобы жертва
// на миг не могла отличить призрака от реального монстра. Разворачиваем его
// лицом к игроку — иначе фигура стоит в случайной позе и выглядит как баг,
// а не как жуткое видение, уставившееся на вас.
function createFakeMonster(scene, position, viewerPosition) {
  const group = new THREE.Group();
  group.position.set(position.x, 0, position.z);
  const angle = Math.atan2(viewerPosition.x - position.x, viewerPosition.z - position.z) + MODEL_FORWARD_OFFSET;
  group.rotation.y = angle;
  group.add(createPlaceholderMonster());
  scene.add(group);

  loadMonsterModel()
    .then((template) => {
      group.clear();
      group.add(cloneMonsterModel(template));
    })
    .catch(() => {});

  return group;
}

// Персональные искажения реальности: сервер решает, кому и что "мерещится",
// и присылает событие только этому клиенту. Появляются/исчезают мгновенно —
// никаких плавных наплывов, суть эффекта в резкости.
export function createHallucinationSystem({ scene, camera, renderer, remotePlayers, audioListener }) {
  let distortionTimeLeft = 0;
  const soundBuffers = [];
  let flashImages = [];
  const flashOverlay = document.getElementById('hallucination-flash-overlay');

  fetch('/api/hallucination-sounds')
    .then((r) => r.json())
    .then((files) => {
      const loader = new THREE.AudioLoader();
      for (const file of files) {
        loader.load(`/audio/hallucinations/${file}`, (buffer) => soundBuffers.push(buffer));
      }
    })
    .catch(() => {});

  fetch('/api/hallucination-images')
    .then((r) => r.json())
    .then((files) => { flashImages = files; })
    .catch(() => {});

  function playFakeSound() {
    if (soundBuffers.length === 0) return;
    const buffer = soundBuffers[Math.floor(Math.random() * soundBuffers.length)];
    const sound = new THREE.Audio(audioListener);
    sound.setBuffer(buffer);
    sound.setVolume(0.7);
    sound.play();
  }

  function spawnObjectSwap(position) {
    const mesh = createFakeMonster(scene, position, camera.position);
    setTimeout(() => scene.remove(mesh), OBJECT_SWAP_DURATION * 1000);
  }

  function spawnPhantom({ position, nickname, color }) {
    const fakeId = `phantom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    remotePlayers.addPlayer(fakeId, nickname, color);
    remotePlayers.snapPosition(fakeId, position);
    setTimeout(() => remotePlayers.removePlayer(fakeId), PHANTOM_DURATION * 1000);
  }

  function triggerDistortion() {
    distortionTimeLeft = DISTORTION_DURATION;
    renderer.domElement.classList.add('distortion-active');
  }

  // Доля секунды жуткого/странного изображения на весь экран — мгновенно,
  // с коротким звуком в пару (из public/audio/hallucinations/), но без
  // тряски экрана (это не джампскейр, а более "тихий" вид галлюцинации).
  // Если своих картинок в public/hallucinations/images/ ещё нет — просто
  // ничего не показываем в этот раз (как и с fake-sound без своих звуков).
  function spawnImageFlash() {
    if (flashImages.length === 0 || !flashOverlay) return;
    const img = document.createElement('img');
    img.src = `/hallucinations/images/${flashImages[Math.floor(Math.random() * flashImages.length)]}`;
    img.style.cssText = 'width:100%; height:100%; object-fit: cover;';
    flashOverlay.innerHTML = '';
    flashOverlay.appendChild(img);
    flashOverlay.classList.add('visible');
    playFakeSound();
    setTimeout(() => {
      flashOverlay.classList.remove('visible');
      flashOverlay.innerHTML = '';
    }, IMAGE_FLASH_DURATION);
  }

  function handle(payload) {
    switch (payload.type) {
      case 'object-swap': spawnObjectSwap(payload.position); break;
      case 'phantom': spawnPhantom(payload); break;
      case 'distortion': triggerDistortion(); break;
      case 'fake-sound': playFakeSound(); break;
      case 'image-flash': spawnImageFlash(); break;
    }
  }

  function tick(delta) {
    if (distortionTimeLeft <= 0) return;
    distortionTimeLeft -= delta;
    if (distortionTimeLeft <= 0) {
      camera.fov = BASE_FOV;
      camera.updateProjectionMatrix();
      renderer.domElement.classList.remove('distortion-active');
      return;
    }
    camera.fov = BASE_FOV + Math.sin(performance.now() * 0.01) * 8;
    camera.updateProjectionMatrix();
  }

  return { handle, tick };
}
