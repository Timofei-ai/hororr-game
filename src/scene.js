import * as THREE from 'three';

// Комната Stage 1: просто закрытая коробка с туманом, чтобы было тесно и темно.
export const ROOM_SIZE = { width: 14, depth: 20, height: 3.5 };

export function createRoom() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.09);

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
export function createFlashlightPickup(scene) {
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

  group.position.set(0, 0, -ROOM_SIZE.depth / 2 + 1.5);
  scene.add(group);

  return { group, flashlightMesh: flashlight };
}
