import * as THREE from 'three';
import { loadMonsterModel, cloneMonsterModel } from './models.js';

// Крутим модель так, чтобы она "смотрела" в сторону движения. Если ваша
// модель после подстановки повёрнута не туда — поправьте этот угол (в радианах).
const MODEL_FORWARD_OFFSET = Math.PI;

function createPlaceholder() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 1.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 })
  );
  body.position.y = 1.1;
  group.add(body);

  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.1, 1.75, 0.28);
  eyeR.position.set(0.1, 1.75, 0.28);
  group.add(eyeL, eyeR);
  return group;
}

// Тёмный силуэт монстра — почти не виден без света. Позиция приходит с
// сервера, здесь только интерполяция и разворот по направлению движения.
export function createEntityRenderer(scene) {
  const group = new THREE.Group();
  group.visible = false;
  group.add(createPlaceholder());
  scene.add(group);

  loadMonsterModel()
    .then((template) => {
      group.clear();
      group.add(cloneMonsterModel(template));
    })
    .catch(() => {}); // модель не загрузилась — остаёмся с силуэтом-заглушкой

  const target = new THREE.Vector3();
  let hasTarget = false;

  function setState({ position }) {
    if (!hasTarget) {
      group.position.set(position.x, 0, position.z);
      hasTarget = true;
    }
    target.set(position.x, 0, position.z);
    group.visible = true;
  }

  function tick(delta) {
    if (!hasTarget) return;

    const dx = target.x - group.position.x;
    const dz = target.z - group.position.z;
    if (Math.hypot(dx, dz) > 0.02) {
      const angle = Math.atan2(dx, dz) + MODEL_FORWARD_OFFSET;
      let diff = angle - group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // кратчайший поворот
      group.rotation.y += diff * Math.min(1, delta * 6);
    }

    group.position.lerp(target, Math.min(1, delta * 6));
  }

  return { setState, tick };
}
