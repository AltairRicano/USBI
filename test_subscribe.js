const { WordSearchEngine } = require('./frontend/packages/engine/dist/games/WordSearchEngine.js');
const engine = new WordSearchEngine(['HELLO']);
let state = null;
engine.subscribe((newState) => { state = newState; });
console.log('State after subscribe:', state !== null);
