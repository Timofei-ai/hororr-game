import * as THREE from 'three';

const SCARE_DURATION_MS = 450;
// Встроенные заглушки на случай, если папка public/jumpscares/ пустая —
// чтобы Stage 6 всё равно можно было проверить без своих картинок.
const FALLBACK_EMOJIS = ['👹', '💀'];

// Джампскейр — резкий полноэкранный "укол": картинка/заглушка возникает
// МГНОВЕННО (без плавного появления), экран трясёт, играет громкий звук.
// Картинки и звуки подтягиваются из public/jumpscares(/sounds) — если
// пользователь туда что-то положит, оно тут же начнёт использоваться, без
// пересборки (см. README).
export function createJumpscareSystem({ audioListener }) {
  const overlay = document.getElementById('jumpscare-overlay');
  const app = document.getElementById('app');
  const soundBuffers = [];
  let images = [];
  let shakeTimeout = null;
  let hideTimeout = null;

  fetch('/api/jumpscares')
    .then((r) => r.json())
    .then(({ images: imgs, sounds }) => {
      images = imgs || [];
      const loader = new THREE.AudioLoader();
      for (const file of sounds || []) {
        loader.load(`/jumpscares/sounds/${file}`, (buffer) => soundBuffers.push(buffer));
      }
    })
    .catch(() => {});

  function playSound() {
    if (soundBuffers.length === 0) return;
    const buffer = soundBuffers[Math.floor(Math.random() * soundBuffers.length)];
    const sound = new THREE.Audio(audioListener);
    sound.setBuffer(buffer);
    sound.setVolume(1);
    sound.play();
  }

  function buildContent() {
    if (images.length > 0) {
      const img = document.createElement('img');
      img.src = `/jumpscares/${images[Math.floor(Math.random() * images.length)]}`;
      img.style.cssText = 'width:100%; height:100%; object-fit: cover;';
      return img;
    }
    const div = document.createElement('div');
    div.textContent = FALLBACK_EMOJIS[Math.floor(Math.random() * FALLBACK_EMOJIS.length)];
    div.style.cssText = 'width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:38vh; background:#7a0000;';
    return div;
  }

  function trigger() {
    clearTimeout(shakeTimeout);
    clearTimeout(hideTimeout);

    overlay.innerHTML = '';
    overlay.appendChild(buildContent());
    overlay.classList.add('visible');
    app.classList.add('screen-shake');
    playSound();

    hideTimeout = setTimeout(() => {
      overlay.classList.remove('visible');
      overlay.innerHTML = '';
    }, SCARE_DURATION_MS);
    shakeTimeout = setTimeout(() => app.classList.remove('screen-shake'), 500);
  }

  return { trigger };
}
