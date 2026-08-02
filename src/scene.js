import * as THREE from 'three';

// Уровень Stage 3: одна большая тёмная комната (без внутренних стен — своей
// системы столкновений со стенами пока нет, поэтому лабиринт из коридоров
// выглядел бы как проходимый насквозь "баг"). Здесь пока важнее инвентарь и
// цели, чем архитектура — разветвлённая карта появится, когда будет реальная
// физика столкновений.
export const ROOM_SIZE = { width: 16, depth: 22, height: 3.5 };

export function createRoom() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 1 });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.width, ROOM_SIZE.depth),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE.width, ROOM_SIZE.depth),
    wallMaterial
  );
  ceiling.position.y = ROOM_SIZE.height;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const wallDefs = [
    { w: ROOM_SIZE.width, pos: [0, ROOM_SIZE.height / 2, -ROOM_SIZE.depth / 2], rotY: 0 },
    { w: ROOM_SIZE.width, pos: [0, ROOM_SIZE.height / 2, ROOM_SIZE.depth / 2], rotY: Math.PI },
    { w: ROOM_SIZE.depth, pos: [-ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0], rotY: Math.PI / 2 },
    { w: ROOM_SIZE.depth, pos: [ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0], rotY: -Math.PI / 2 }
  ];
  for (const def of wallDefs) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(def.w, ROOM_SIZE.height), wallMaterial);
    wall.position.set(...def.pos);
    wall.rotation.y = def.rotY;
    scene.add(wall);
  }

  // Едва заметный общий свет — без фонарика почти ничего не видно.
  const ambient = new THREE.AmbientLight(0x1a1a22, 0.15);
  scene.add(ambient);

  return scene;
}

// Стол со стартовым фонариком у одной из стен.
export function createFlashlightPickup(scene, position) {
  const group = new THREE.Group();

  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
  );
  tableTop.position.y = 0.9;
  group.add(tableTop);

  const legGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a1d12 });
  const legOffsets = [
    [0.5, 0.45, 0.25],
    [-0.5, 0.45, 0.25],
    [0.5, 0.45, -0.25],
    [-0.5, 0.45, -0.25]
  ];
  for (const [x, y, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    group.add(leg);
  }

  const flashlight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4 })
  );
  flashlight.rotation.z = Math.PI / 2;
  flashlight.position.set(0, 0.95, 0);
  group.add(flashlight);

  group.position.copy(position);
  scene.add(group);

  return { group, flashlightMesh: flashlight };
}

// Небольшой светящийся предмет-цель (например, предохранитель) для подбора.
export function createPickupProp(scene, position) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22, 0),
    new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0x553300, emissiveIntensity: 0.6 })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.5;
  scene.add(mesh);
  return mesh;
}

// Генератор с индикатором состояния (красный = не починен, зелёный = починен).
export function createGeneratorProp(scene, position) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.1, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.3 })
  );
  body.position.y = 0.55;
  group.add(body);

  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 1 })
  );
  indicator.position.set(0, 1.0, 0.36);
  group.add(indicator);

  group.position.copy(position);
  scene.add(group);

  return {
    group,
    setRepaired(repaired) {
      indicator.material.color.set(repaired ? 0x33ff66 : 0xff3333);
      indicator.material.emissive.set(repaired ? 0x00ff33 : 0xff0000);
    }
  };
}

// Дверь выхода — пока чисто визуальный индикатор прогресса целей
// (физически проходу не мешает: коллизий со стенами/дверьми ещё нет).
export function createExitDoor(scene, position, facingRotationY) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x881111, emissive: 0x330000, side: THREE.DoubleSide })
  );
  mesh.position.copy(position);
  mesh.rotation.y = facingRotationY;
  scene.add(mesh);

  return {
    mesh,
    setUnlocked(unlocked) {
      mesh.material.color.set(unlocked ? 0x11aa44 : 0x881111);
      mesh.material.emissive.set(unlocked ? 0x004411 : 0x330000);
    }
  };
}
