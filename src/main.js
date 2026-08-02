import { runLobbyFlow } from './uiFlow.js';
import { startGame } from './game.js';

runLobbyFlow().then(startGame);
