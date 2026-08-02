// Личный инвентарь игрока — просто список подобранных предметов, отображаемых
// внизу экрана иконкой + подписью.
export function createInventory() {
  const container = document.getElementById('inventory-bar');
  const items = [];

  function render() {
    container.innerHTML = '';
    for (const item of items) {
      const chip = document.createElement('div');
      chip.className = 'inv-chip';
      chip.textContent = `${item.icon} ${item.label}`;
      container.appendChild(chip);
    }
  }

  function addItem(item) {
    items.push(item);
    render();
  }

  return { addItem };
}
