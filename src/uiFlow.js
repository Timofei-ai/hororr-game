import { net } from './net.js';

const NICKNAME_KEY = 'horrorGame.nickname';

function el(id) {
  return document.getElementById(id);
}

function show(id) { el(id).classList.remove('hidden'); }
function hide(id) { el(id).classList.add('hidden'); }

function colorToCss(colorInt) {
  return `#${colorInt.toString(16).padStart(6, '0')}`;
}

export function runLobbyFlow() {
  return new Promise((resolve) => {
    let state = null; // { code, selfId, hostId, players, nickname }

    function renderWaitingRoom() {
      el('room-code-display').textContent = `Код комнаты: ${state.code}`;
      const list = el('player-list-lobby');
      list.innerHTML = '';
      for (const p of state.players) {
        const li = document.createElement('li');
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = colorToCss(p.color);
        li.appendChild(dot);
        li.appendChild(document.createTextNode(p.nickname + (p.id === state.hostId ? ' (хост)' : '')));
        list.appendChild(li);
      }
      el('waiting-status').textContent = `Ждём игроков… (${state.players.length}/5)`;

      const isHost = state.selfId === state.hostId;
      const startBtn = el('start-game-btn');
      if (isHost) {
        startBtn.classList.remove('hidden');
        startBtn.disabled = state.players.length < 2;
      } else {
        startBtn.classList.add('hidden');
      }
    }

    function enterWaitingRoom(payload) {
      state = {
        code: payload.code,
        selfId: payload.selfId,
        hostId: payload.hostId,
        players: payload.players,
        nickname: state?.nickname
      };
      hide('nickname-screen');
      hide('lobby-menu');
      show('waiting-room');
      renderWaitingRoom();
    }

    // Ник
    const savedNickname = localStorage.getItem(NICKNAME_KEY) || '';
    el('nickname-input').value = savedNickname;

    el('nickname-continue-btn').addEventListener('click', () => {
      const nickname = el('nickname-input').value.trim().slice(0, 16);
      if (!nickname) {
        el('nickname-error').textContent = 'Введите ник';
        return;
      }
      localStorage.setItem(NICKNAME_KEY, nickname);
      state = { nickname };
      hide('nickname-screen');
      show('lobby-menu');
    });

    // Лобби: создать / войти
    el('create-room-btn').addEventListener('click', async () => {
      el('lobby-error').textContent = '';
      try {
        const payload = await net.createRoom(state.nickname);
        enterWaitingRoom(payload);
      } catch (err) {
        el('lobby-error').textContent = err.message;
      }
    });

    el('join-room-toggle-btn').addEventListener('click', () => {
      el('join-code-row').classList.remove('hidden');
    });

    el('join-confirm-btn').addEventListener('click', async () => {
      el('lobby-error').textContent = '';
      const code = el('join-code-input').value.trim();
      try {
        const payload = await net.joinRoom(code, state.nickname);
        enterWaitingRoom(payload);
      } catch (err) {
        el('lobby-error').textContent = err.message;
      }
    });

    // Обновления состава комнаты, пока все ждут в лобби.
    net.onLobbyUpdate((room) => {
      if (!state || room.code !== state.code) return;
      state.hostId = room.hostId;
      state.players = room.players;
      renderWaitingRoom();
    });

    // Старт игры (нажал хост).
    el('start-game-btn').addEventListener('click', async () => {
      try {
        await net.startGame();
      } catch (err) {
        el('waiting-error').textContent = err.message;
      }
    });

    // Приходит всем участникам комнаты, включая хоста.
    net.onGameStarted((room) => {
      hide('waiting-room');
      const self = room.players.find((p) => p.id === state.selfId);
      resolve({
        code: room.code,
        selfId: state.selfId,
        nickname: state.nickname,
        color: self ? self.color : 0xffffff,
        players: room.players,
        level: room.level || 0
      });
    });
  });
}
