// Общий менеджер объектов, с которыми можно взаимодействовать по E:
// стол с фонариком, предметы-подборы, генераторы, дверь и т.д.
// Каждый кадр находит ближайший доступный объект в радиусе и показывает подсказку.
export function createInteractionManager(playerObject) {
  const promptEl = document.getElementById('prompt');
  const registry = new Map();
  let current = null;

  function register(id, config) {
    registry.set(id, config);
  }

  function unregister(id) {
    registry.delete(id);
  }

  function update() {
    let nearest = null;
    let nearestDist = Infinity;

    for (const cfg of registry.values()) {
      if (cfg.canInteract && !cfg.canInteract()) continue;
      const dx = playerObject.position.x - cfg.position.x;
      const dz = playerObject.position.z - cfg.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= cfg.range && dist < nearestDist) {
        nearestDist = dist;
        nearest = cfg;
      }
    }

    current = nearest;
    if (current) {
      promptEl.textContent = typeof current.prompt === 'function' ? current.prompt() : current.prompt;
      promptEl.classList.add('visible');
    } else {
      promptEl.classList.remove('visible');
    }
  }

  function interact() {
    if (current) current.onInteract();
  }

  return { register, unregister, update, interact };
}
