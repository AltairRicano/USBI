import { WordSearchEngine } from './frontend/packages/engine/dist/games/WordSearchEngine.js';
const engine = new WordSearchEngine(['HELLO'], 10, 10, 1234);
console.log(engine.getState().grid);
