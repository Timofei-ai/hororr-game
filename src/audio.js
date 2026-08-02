import * as THREE from 'three';

export function createAudioListener(camera) {
  const listener = new THREE.AudioListener();
  camera.add(listener);
  return listener;
}

// Фоновый эмбиент по кругу. Если файла ещё нет в public/audio/ambient/ —
// просто тихо пропускаем, игра не ломается.
export function startAmbientAudio(listener) {
  const sound = new THREE.Audio(listener);
  const loader = new THREE.AudioLoader();
  loader.load(
    '/audio/ambient/ambient_ethereal.wav',
    (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.4);
      sound.play();
    },
    undefined,
    () => console.warn('[audio] нет файла public/audio/ambient/ambient_ethereal.wav — фон пропущен')
  );

  return sound;
}
