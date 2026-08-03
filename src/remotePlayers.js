import * as THREE from 'three';

function colorToCss(colorInt) {
  return `#${colorInt.toString(16).padStart(6, '0')}`;
}

function makeNameSprite(nickname, colorInt) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 30px monospace';
  ctx.fillStyle = colorToCss(colorInt);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nickname, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  material.fog = false; // бирка с ником должна читаться даже в тумане/темноте
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.35, 1);
  sprite.position.y = 2.05;
  return sprite;
}

// Простая низкополигональная фигура человека (голова + торс + руки + ноги)
// вместо капсулы-заглушки — у неё есть силуэт и лёгкая походка при движении.
function buildHumanoid(colorInt) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: colorInt, roughness: 0.75 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.24), material);
  torso.position.y = 1.1;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), material);
  head.position.y = 1.55;
  group.add(head);

  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8);
  const legL = new THREE.Mesh(legGeo, material);
  legL.position.set(-0.12, 0.42, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, material);
  legR.position.set(0.12, 0.42, 0);
  group.add(legR);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8);
  const armL = new THREE.Mesh(armGeo, material);
  armL.position.set(-0.32, 1.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, material);
  armR.position.set(0.32, 1.05, 0);
  group.add(armR);

  return { group, material, legL, legR, armL, armR };
}

// Управляет визуальным представлением ДРУГИХ игроков: фигурка человека + бирка
// с ником, которая всегда развёрнута к камере (THREE.Sprite это делает автоматически).
export function createRemotePlayerManager(scene) {
  const players = new Map();

  function addPlayer(id, nickname, colorInt) {
    if (players.has(id)) return;

    const { group, material, legL, legR, armL, armR } = buildHumanoid(colorInt);
    group.add(makeNameSprite(nickname, colorInt));

    scene.add(group);
    players.set(id, {
      group, material, legL, legR, armL, armR,
      target: group.position.clone(), targetRotY: 0, walkPhase: 0
    });
  }

  function updateTarget(id, position, rotationY) {
    const p = players.get(id);
    if (!p) return;
    // Сервер пересылает позицию камеры (на уровне глаз) — тело рисуем от пола.
    p.target.set(position[0], position[1] - 1.6, position[2]);
    p.targetRotY = rotationY;
  }

  function snapPosition(id, position) {
    const p = players.get(id);
    if (!p) return;
    p.group.position.set(position.x, position.y, position.z);
    p.target.copy(p.group.position);
  }

  function removePlayer(id) {
    const p = players.get(id);
    if (!p) return;
    scene.remove(p.group);
    players.delete(id);
  }

  function setEliminated(id) {
    const p = players.get(id);
    if (!p) return;
    p.material.color.set(0x333333);
  }

  function tick(delta) {
    const lerpFactor = Math.min(1, delta * 10);
    for (const p of players.values()) {
      const prevPos = p.group.position.clone();
      p.group.position.lerp(p.target, lerpFactor);
      p.group.rotation.y += (p.targetRotY - p.group.rotation.y) * lerpFactor;

      // Лёгкая походка: качаем руки/ноги пропорционально скорости смещения.
      const speed = p.group.position.distanceTo(prevPos) / Math.max(delta, 0.0001);
      if (speed > 0.05) {
        p.walkPhase += delta * Math.min(speed, 4) * 6;
        const swing = Math.sin(p.walkPhase) * 0.5;
        p.legL.rotation.x = swing;
        p.legR.rotation.x = -swing;
        p.armL.rotation.x = -swing;
        p.armR.rotation.x = swing;
      } else {
        p.legL.rotation.x *= 0.8;
        p.legR.rotation.x *= 0.8;
        p.armL.rotation.x *= 0.8;
        p.armR.rotation.x *= 0.8;
      }
    }
  }

  return { addPlayer, removePlayer, updateTarget, tick, setEliminated, snapPosition };
}
