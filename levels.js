// Общий конфиг уровней — импортируется и сервером, и клиентом, чтобы обе
// стороны всегда были согласованы (позиции предметов, счётчики целей).
// Комната переиспользуется (см. ROOM_SIZE в src/scene.js), но каждый уровень
// разбрасывает предметы/генераторы по-своему — левая половина комнаты для
// предметов, правая для генераторов, чтобы точки не пересекались.
function grid(count, xRange, zRange) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const positions = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = xRange[0] + (col + 0.5) * (xRange[1] - xRange[0]) / cols;
    const z = zRange[0] + (row + 0.5) * (zRange[1] - zRange[0]) / rows;
    positions.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
  }
  return positions;
}

function makeLevel({ name, fogDensity, entitySpeedMultiplier, hallucinationMultiplier, jumpscareMultiplier, itemCount, generatorCount, idPrefix }) {
  const itemSpots = grid(itemCount, [-9.5, -1.5], [-9, 9.5]);
  const generatorSpots = grid(generatorCount, [1.5, 9.5], [-9, 9.5]);
  return {
    name,
    fogDensity,
    entitySpeedMultiplier,
    hallucinationMultiplier,
    jumpscareMultiplier,
    items: itemSpots.map((p, i) => ({ id: `${idPrefix}-fuse-${i}`, x: p.x, z: p.z })),
    generators: generatorSpots.map((p, i) => ({ id: `${idPrefix}-gen-${i}`, x: p.x, z: p.z }))
  };
}

export const LEVELS = [
  makeLevel({
    name: 'Приёмный покой',
    fogDensity: 0.07,
    entitySpeedMultiplier: 1,
    hallucinationMultiplier: 1,
    jumpscareMultiplier: 1,
    itemCount: 5,
    generatorCount: 3,
    idPrefix: 'l1'
  }),
  makeLevel({
    name: 'Хирургическое отделение',
    fogDensity: 0.09,
    entitySpeedMultiplier: 1.2,
    hallucinationMultiplier: 1.4,
    jumpscareMultiplier: 1.5,
    itemCount: 6,
    generatorCount: 4,
    idPrefix: 'l2'
  }),
  makeLevel({
    name: 'Морг',
    fogDensity: 0.11,
    entitySpeedMultiplier: 1.4,
    hallucinationMultiplier: 1.8,
    jumpscareMultiplier: 2,
    itemCount: 8,
    generatorCount: 5,
    idPrefix: 'l3'
  })
];
