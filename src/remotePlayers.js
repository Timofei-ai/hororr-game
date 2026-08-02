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

// Управляет визуальным представлением ДРУГИХ игроков: капсула + бирка с ником,
// которая всегда развёрнута к камере (THREE.Sprite это делает автоматически).
export function createRemotePlayerManager(scene) {
  const players = new Map();

  function addPlayer(id, nickname, colorInt) {
    if (players.has(id)) return;

    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 1.1, 4, 8),
      new THREE.MeshStandardMaterial({ color: colorInt, roughness: 0.7 })
    );
    body.position.y = 0.95;
    group.add(body);
    group.add(makeNameSprite(nickname, colorInt));

    scene.add(group);
    players.set(id, { group, target: group.position.clone(), targetRotY: 0 });
  }

  function updateTarget(id, position, rotationY) {
    const p = players.get(id);
    if (!p) return;
    // Сервер пересылает позицию камеры (на уровне глаз) — тело рисуем от пола.
    p.target.set(position[0], position[1] - 1.6, position[2]);
    p.targetRotY = rotationY;
  }

  function removePlayer(id) {
    const p = players.get(id);
    if (!p) return;
    scene.remove(p.group);
    players.delete(id);
  }

  function tick(delta) {
    const lerpFactor = Math.min(1, delta * 10);
    for (const p of players.values()) {
      p.group.position.lerp(p.target, lerpFactor);
      p.group.rotation.y += (p.targetRotY - p.group.rotation.y) * lerpFactor;
    }
  }

  return { addPlayer, removePlayer, updateTarget, tick };
}
