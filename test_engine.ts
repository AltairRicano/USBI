import { WordSearchEngine } from './frontend/packages/engine/src/games/WordSearchEngine.ts';
const engine = new WordSearchEngine(['HELLO'], 10, 10, 1234);
console.log(engine.getState().grid);
