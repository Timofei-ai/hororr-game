import * as THREE from 'three';

// Одна большая тёмная комната (без внутренних стен — своей системы
// столкновений со стенами пока нет, поэтому лабиринт из коридоров выглядел
// бы как проходимый насквозь "баг"). Переиспользуется для всех уровней —
// меняются только предметы/генераторы/туман/декор.
export const ROOM_SIZE = { width: 22, depth: 30, height: 3.6 };

function createCheckerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const tiles = 8;
  const tileSize = canvas.width / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? '#141414' : '#0a0a0a';
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      // трещины/грязь для атмосферы заброшенности
      if (Math.random() < 0.15) {
        ctx.fillStyle = 'rgba(40, 5, 5, 0.35)';
        ctx.fillRect(
          x * tileSize + Math.random() * tileSize * 0.5,
          y * tileSize + Math.random() * tileSize * 0.5,
          tileSize * 0.3,
          tileSize * 0.15
        );
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(ROOM_SIZE.width / 2, ROOM_SIZE.depth / 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoom() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: createCheckerTexture(),
    roughness: 1
  });

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

// Больничная каталка — просто декорация для атмосферы.
function buildGurney() {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.5 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3a3a2a, roughness: 0.9 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 1.9), padMat);
  top.position.y = 0.85;
  group.add(top);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 1.95), frameMat);
  frame.position.y = 0.8;
  group.add(frame);

  const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.78, 8);
  for (const [x, z] of [[0.3, 0.85], [-0.3, 0.85], [0.3, -0.85], [-0.3, -0.85]]) {
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set(x, 0.4, z);
    group.add(leg);
  }
  return group;
}

// Ржавый шкаф/тумба.
function buildCabinet() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.6, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x2a3228, roughness: 0.85, metalness: 0.2 })
  );
  body.position.y = 0.8;
  group.add(body);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 })
  );
  handle.position.set(0.3, 1.0, 0.27);
  group.add(handle);
  return group;
}

// Опрокинутая инвалидная коляска — просто хлам на полу.
function buildDebris() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9, metalness: 0.3 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.7), mat);
  box.rotation.z = Math.PI / 3;
  box.position.y = 0.2;
  group.add(box);
  return group;
}

const CLUTTER_BUILDERS = { gurney: buildGurney, cabinet: buildCabinet, debris: buildDebris };

// Разбрасывает декоративный хлам по уровню — чисто визуальное, без коллизий
// и без взаимодействия. type: 'gurney' | 'cabinet' | 'debris'.
export function createClutterProp(scene, position, type, rotationY = 0) {
  const build = CLUTTER_BUILDERS[type] || CLUTTER_BUILDERS.debris;
  const group = build();
  group.position.copy(position);
  group.rotation.y = rotationY;
  scene.add(group);
  return group;
}

// Тусклый потолочный светильник — просто для атмосферы и лёгкой заполненности
// пространства (комната больше не полностью чёрная в паре мест).
export function createCeilingLamp(scene, position) {
  const group = new THREE.Group();
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  cord.position.y = 0.3;
  group.add(cord);

  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.3, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x2a2a22, side: THREE.DoubleSide, roughness: 0.7 })
  );
  shade.position.y = -0.02;
  group.add(shade);

  const bulbLight = new THREE.PointLight(0xffcc88, 25, 9, 2);
  bulbLight.position.y = -0.1;
  group.add(bulbLight);

  group.position.copy(position);
  group.position.y = ROOM_SIZE.height - 0.05;
  scene.add(group);
  return group;
}

// Статичное убранство комнаты — не зависит от уровня, расставляется один раз.
export function scatterDecor(scene) {
  const clutterSpots = [
    { type: 'gurney', x: -6, z: -3, rot: 0.3 },
    { type: 'gurney', x: 5, z: 4, rot: -0.6 },
    { type: 'cabinet', x: -9.5, z: -10, rot: Math.PI / 2 },
    { type: 'cabinet', x: 9.5, z: 8, rot: -Math.PI / 2 },
    { type: 'debris', x: 2, z: -7, rot: 0.8 },
    { type: 'debris', x: -3, z: 8, rot: -1.1 }
  ];
  for (const spot of clutterSpots) {
    createClutterProp(scene, new THREE.Vector3(spot.x, 0, spot.z), spot.type, spot.rot);
  }

  const lampSpots = [
    { x: -6, z: -5 },
    { x: 6, z: 0 },
    { x: -4, z: 8 }
  ];
  for (const spot of lampSpots) {
    createCeilingLamp(scene, new THREE.Vector3(spot.x, 0, spot.z));
  }
}
