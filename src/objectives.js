// Прогресс целей уровня: собрать N предметов и починить M генераторов.
// Показывается в панели в углу экрана; при выполнении обоих условий
// вызывается onComplete (открывает дверь выхода).
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

  function checkComplete() {
    if (!completed && items >= itemsTarget && generators >= generatorsTarget) {
      completed = true;
      onComplete();
    }
  }

  function collectItem() {
    items = Math.min(itemsTarget, items + 1);
    render();
    checkComplete();
  }

  function activateGenerator() {
    generators = Math.min(generatorsTarget, generators + 1);
    render();
    checkComplete();
  }

  render();
  return { collectItem, activateGenerator };
}
