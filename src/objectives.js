// Прогресс целей уровня общий на всю команду — сервер решает, кто что собрал/
// починил, здесь только отображение панели в углу экрана.
export function createObjectives({ itemsTarget, generatorsTarget, onComplete }) {
  const panel = document.getElementById('objectives-panel');
  let items = 0;
  let generators = 0;
  let completed = false;

  function render() {
    panel.innerHTML = `
      <div>Предметы: ${items}/${itemsTarget}</div>
      <div>Генераторы: ${generators}/${generatorsTarget}</div>
    `;
  }

  function setCounts({ items: newItems, generators: newGenerators, objectivesComplete }) {
    if (newItems != null) items = newItems;
    if (newGenerators != null) generators = newGenerators;
    render();
    if (objectivesComplete && !completed) {
      completed = true;
      onComplete();
    }
  }

  render();
  return { setCounts };
}
