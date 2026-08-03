import { io } from 'socket.io-client';

const socket = io({ autoConnect: true });

function request(event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (response) => {
      if (response && response.ok === false) reject(new Error(response.error || 'Неизвестная ошибка'));
      else resolve(response);
    });
  });
}

export const net = {
  socket,
  createRoom: (nickname) => request('create_room', { nickname }),
  joinRoom: (code, nickname) => request('join_room', { code, nickname }),
  startGame: () => request('start_game', {}),
  sendMove: (position, rotationY, sprinting) => socket.emit('player_move', { position, rotationY, sprinting }),
  sendFlashlightState: (on) => socket.emit('flashlight_state', { on }),
  setAdminMode: (on) => socket.emit('set_admin_mode', { on }),
  collectItem: (itemId) => socket.emit('collect_item', { itemId }),
  repairGenerator: (generatorId) => socket.emit('repair_generator', { generatorId }),
  useExitDoor: () => request('use_exit_door', {}),
  onLobbyUpdate: (cb) => socket.on('lobby_update', cb),
  onGameStarted: (cb) => socket.on('game_started', cb),
  onPlayerMoved: (cb) => socket.on('player_moved', cb),
  onPlayerLeft: (cb) => socket.on('player_left', cb),
  onEntityUpdate: (cb) => socket.on('entity_update', cb),
  onPlayerCaught: (cb) => socket.on('player_caught', cb),
  onGameOver: (cb) => socket.on('game_over', cb),
  onHallucination: (cb) => socket.on('hallucination', cb),
  onItemCollected: (cb) => socket.on('item_collected', cb),
  onGeneratorRepaired: (cb) => socket.on('generator_repaired', cb),
  onLevelChanged: (cb) => socket.on('level_changed', cb),
  onGameWon: (cb) => socket.on('game_won', cb)
};
