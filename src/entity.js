import * as THREE from 'three';

// Тёмный силуэт монстра — почти не виден без света, выдают только
// светящиеся глаза. Позиция приходит с сервера, здесь только интерполяция.
export function createEntityRenderer(scene) {
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

  group.visible = false;
  scene.add(group);

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
    group.position.lerp(target, Math.min(1, delta * 6));
  }

  return { setState, tick };
}
