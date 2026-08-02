function colorToCss(colorInt) {
  return `#${colorInt.toString(16).padStart(6, '0')}`;
}

// Список игроков в углу экрана: ник, цвет, статус (жив/выбыл).
// Статус "выбыл" пока не выставляется автоматически — это появится вместе с
// сущностью-монстром (Stage 4). Здесь только структура для этого.
export function createHud(players, selfId) {
  const container = document.getElementById('hud-playerlist');
  const list = document.getElementById('hud-player-list');
  container.classList.add('visible');

  const rows = new Map();

  function render() {
    list.innerHTML = '';
    for (const [id, info] of rows.entries()) {
      const li = document.createElement('li');
      if (!info.alive) li.classList.add('eliminated');
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = colorToCss(info.color);
      li.appendChild(dot);
      li.appendChild(document.createTextNode(info.nickname + (id === selfId ? ' (вы)' : '')));
      list.appendChild(li);
    }
  }

  for (const p of players) {
    rows.set(p.id, { nickname: p.nickname, color: p.color, alive: true });
  }
  render();

  return {
    setEliminated(id, eliminated = true) {
      const row = rows.get(id);
      if (!row) return;
      row.alive = !eliminated;
      render();
    },
    removePlayer(id) {
      rows.delete(id);
      render();
    }
  };
}
