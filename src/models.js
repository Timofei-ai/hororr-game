import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
const TARGET_HEIGHT = 2.2; // метры — чуть выше игрока, чтобы монстр внушал страх

// В исходном .glb помимо самого монстра встречается плоская "подставка"
// для витрины (стандартно для моделей со Sketchfab) — она не нужна в игре.
const STRIP_NODE_NAMES = ['WerewolfAR1'];

let monsterPromise = null;

// Грузим модель один раз и кэшируем — и настоящая сущность, и галлюцинация
// "подмена объекта" берут независимые клоны от одного и того же шаблона.
export function loadMonsterModel() {
  if (!monsterPromise) {
    monsterPromise = new Promise((resolve, reject) => {
      loader.load(
        '/models/monster.glb',
        (gltf) => resolve(normalizeModel(gltf.scene)),
        undefined,
        (err) => reject(err)
      );
    });
  }
  return monsterPromise;
}

function normalizeModel(root) {
  for (const name of STRIP_NODE_NAMES) {
    const node = root.getObjectByName(name);
    if (node) node.parent.remove(node);
  }

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = TARGET_HEIGHT / (size.y || 1);
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

export function cloneMonsterModel(template) {
  return template.clone(true);
}
