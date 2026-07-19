import { create } from 'zustand';

export interface GameState {
  isGameActive: boolean;
  currentGameId: string | null;
  currentScore: number;

  startGame: (gameId: string) => void;
  updateScore: (score: number) => void;
  endGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  isGameActive: false,
  currentGameId: null,
  currentScore: 0,

  startGame: (gameId) => set({ isGameActive: true, currentGameId: gameId, currentScore: 0 }),
  updateScore: (score) => set({ currentScore: score }),

  // Corrección: también resetea currentScore al terminar el juego
  // para que el siguiente juego no herede la puntuación anterior.
  endGame: () => set({ isGameActive: false, currentGameId: null, currentScore: 0 }),
}));
