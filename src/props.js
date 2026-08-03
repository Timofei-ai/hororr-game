import { loadModel, cloneModel } from './models.js';

// Параметры на глаз по названиям/пропорциям исходных .glb — все эти файлы
// (Sketchfab, автоконвертация в glTF) уже корректно ориентированы по Y,
// поворот (preRotation) не понадобился ни одной из них после проверки.
export const PROP_CONFIG = {
  gurney: { url: '/models/gurney.glb', targetSize: 1.9, sizeAxis: 'max' },
  wheelchair: { url: '/models/wheelchair.glb', targetSize: 1.0, sizeAxis: 'max' },
  morgueCabinet: { url: '/models/morgue_cabinet.glb', targetSize: 1.8, sizeAxis: 'max' },
  hospitalCupboard: { url: '/models/hospital_cupboard.glb', targetSize: 1.7, sizeAxis: 'max' },
  crutchIvDrip: { url: '/models/crutch_iv_drip.glb', targetSize: 1.6, sizeAxis: 'max' },
  surgerySet: { url: '/models/surgery_set.glb', targetSize: 1.4, sizeAxis: 'max' },
  fluorescentLight: { url: '/models/fluorescent_light.glb', targetSize: 0.6, sizeAxis: 'max' },
  doubleDoors: { url: '/models/double_doors.glb', targetSize: 2.2, sizeAxis: 'max' },
  papers: { url: '/models/papers.glb', targetSize: 0.3, sizeAxis: 'max' },
  corpse: { url: '/models/corpse.glb', targetSize: 1.8, sizeAxis: 'max' }
};

export function loadProp(name) {
  const config = PROP_CONFIG[name];
  if (!config) throw new Error(`Unknown prop: ${name}`);
  return loadModel(config.url, config);
}

export async function spawnProp(scene, name, position, rotationY = 0) {
  const template = await loadProp(name);
  const instance = cloneModel(template);
  instance.position.copy(position);
  instance.rotation.y = rotationY;
  scene.add(instance);
  return instance;
}
