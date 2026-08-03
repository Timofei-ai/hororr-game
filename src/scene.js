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

  // Общий фоновый свет — тускло для атмосферы хоррора, но не полностью
  // чёрный: без фонарика должны быть видны силуэты стен/мебели вблизи.
  const ambient = new THREE.AmbientLight(0x3a3a45, 0.45);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x33384a, 0x0a0a0a, 0.35);
  scene.add(hemi);

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

// Небольшой предмет-цель (например, предохранитель) для подбора. Специально
// без свечения — его не должно быть видно в темноте без фонарика, чтобы
// предметы приходилось реально искать, а не идти на маячок.
export function createPickupProp(scene, position) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0x8a7a4a, roughness: 0.6, metalness: 0.4 })
  );
  mesh.position.copy(position);
  mesh.position.y = 0.5;
  scene.add(mesh);
  return mesh;
}

// Генератор — без светящегося индикатора (его тоже нужно искать в темноте).
// Статус "починен" виден только вблизи, под фонариком, по цвету корпуса.
export function createGeneratorProp(scene, position) {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), bodyMaterial);
  body.position.y = 0.55;
  group.add(body);

  group.position.copy(position);
  scene.add(group);

  return {
    group,
    setRepaired(repaired) {
      bodyMaterial.color.set(repaired ? 0x2a4a33 : 0x333333);
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

// Статичное убранство комнаты — не зависит от уровня, расставляется один раз
// из настоящих моделей (см. src/props.js) поверх процедурных потолочных ламп.
export async function scatterDecor(scene) {
  const { spawnProp } = await import('./props.js');

  // Мебель расставлена не вразнобой, а логическими зонами — как будто это
  // реально разные помещения одного отделения больницы, даже без внутренних стен.
  const propSpots = [
    // Зона ожидания (у южного входа, где игроки появляются)
    { name: 'wheelchair', x: -9, z: 11, rot: 1.2 },
    { name: 'wheelchair', x: -7.3, z: 12.2, rot: 0.7 },
    { name: 'gurney', x: -8.6, z: 13.4, rot: 0.3 },
    { name: 'crutchIvDrip', x: -6.4, z: 10.8, rot: 0.5 },

    // Операционная (центр зала)
    { name: 'surgerySet', x: 0, z: 5, rot: 0 },
    { name: 'gurney', x: 1.8, z: 5.6, rot: -0.4 },
    { name: 'crutchIvDrip', x: -1.8, z: 5.4, rot: 0.6 },

    // Морг (западный угол, ближе к дверям)
    { name: 'morgueCabinet', x: -9.7, z: 2, rot: Math.PI / 2 },
    { name: 'morgueCabinet', x: -9.7, z: 4.5, rot: Math.PI / 2 },
    { name: 'corpse', x: -8.7, z: 1.2, rot: 2.0 },
    { name: 'doubleDoors', x: -10.85, z: -1, rot: Math.PI / 2 },

    // Архив / кабинет персонала (восточная сторона)
    { name: 'hospitalCupboard', x: 9.7, z: -3, rot: -Math.PI / 2 },
    { name: 'hospitalCupboard', x: 9.7, z: -0.5, rot: -Math.PI / 2 },
    { name: 'papers', x: 8.4, z: -3.8, rot: 0.4 },
    { name: 'papers', x: 8.6, z: -1.2, rot: -0.8 },
    { name: 'papers', x: 9.2, z: -5.5, rot: 1.5 },

    // Переполненный коридор ближе к выходу (север)
    { name: 'gurney', x: 7, z: -11, rot: -0.6 },
    { name: 'wheelchair', x: 5.5, z: -10, rot: 1.0 },
    { name: 'crutchIvDrip', x: 6.5, z: -8, rot: -0.3 }
  ];
  await Promise.all(
    propSpots.map((spot) => spawnProp(scene, spot.name, new THREE.Vector3(spot.x, 0, spot.z), spot.rot))
  );

  const lampSpots = [
    { x: -8, z: 11 },  // зона ожидания
    { x: 0, z: 2 },    // операционная
    { x: -9, z: 2 },   // морг
    { x: 8, z: -3 },   // архив
    { x: 4, z: -9 }    // коридор к выходу
  ];
  for (const spot of lampSpots) {
    createCeilingLamp(scene, new THREE.Vector3(spot.x, 0, spot.z));
  }
}
