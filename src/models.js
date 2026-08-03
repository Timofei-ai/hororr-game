import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

const cache = new Map(); // url -> Promise<anchor group>

// Универсальная загрузка .glb с нормализацией: убираем ненужные узлы (например,
// подставку для витрины Sketchfab), поворачиваем, если модель экспортирована
// с "неправильной" осью "вверх", масштабируем под нужный размер и ставим на пол.
// options:
//   stripNodes  — имена узлов, которые нужно удалить (декоративные подставки)
//   preRotation — {x,y,z} радианы, применяются ДО расчёта габаритов (фикс оси)
//   targetSize  — целевой размер в метрах
//   sizeAxis    — какое измерение габаритов подгонять под targetSize: 'x'|'y'|'z'|'max'
export function loadModel(url, options = {}) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((resolve, reject) => {
      loader.load(url, (gltf) => resolve(normalizeModel(gltf.scene, options)), undefined, reject);
    }));
  }
  return cache.get(url);
}

function normalizeModel(root, { stripNodes = [], preRotation = null, targetSize = 1, sizeAxis = 'y' } = {}) {
  for (const name of stripNodes) {
    const node = root.getObjectByName(name);
    if (node) node.parent.remove(node);
  }

  if (preRotation) {
    root.rotation.set(preRotation.x || 0, preRotation.y || 0, preRotation.z || 0);
  }

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const dimension = sizeAxis === 'max' ? Math.max(size.x, size.y, size.z) : size[sizeAxis];
  const scale = targetSize / (dimension || 1);
  root.scale.setScalar(scale);

  const box2 = new THREE.Box3().setFromObject(root);
  root.position.x -= (box2.min.x + box2.max.x) / 2;
  root.position.z -= (box2.min.z + box2.max.z) / 2;
  root.position.y -= box2.min.y;

  // Якорь: внешний код двигает/вращает anchor, не заботясь о нормализации модели внутри.
  const anchor = new THREE.Group();
  anchor.add(root);
  return anchor;
}

export function cloneModel(template) {
  return template.clone(true);
}

// В исходном .glb монстра помимо самого монстра встречается плоская "подставка"
// для витрины (стандартно для моделей со Sketchfab) — она не нужна в игре.
export function loadMonsterModel() {
  return loadModel('/models/monster.glb', {
    stripNodes: ['WerewolfAR1'],
    targetSize: 2.2,
    sizeAxis: 'y'
  });
}

export function cloneMonsterModel(template) {
  return cloneModel(template);
}
