export type GameStatus = 'DISPONIBLE' | 'IMPLEMENTADO SIN RUTA' | 'IMPLEMENTADO PARCIALMENTE' | 'NO FUNCIONAL' | 'NO ENCONTRADO';

export interface Minigame {
  id: string;
  name: string;
  description: string;
  status: GameStatus;
  route?: string;
  icon?: string;
}

export const MINIGAMES_REGISTRY: Minigame[] = [
  {
    id: 'fake-news',
    name: 'Fake News',
    description: 'Identifica las noticias falsas.',
    status: 'DISPONIBLE',
    route: '/games/fake-news',
  },
  {
    id: 'memorama',
    name: 'Memorama',
    description: 'Encuentra los pares de cartas.',
    status: 'DISPONIBLE',
    route: '/games/memorama',
  },
  {
    id: 'snake-ladder',
    name: 'Serpientes y Escaleras',
    description: 'Juega contra la IA y llega a la meta.',
    status: 'DISPONIBLE',
    route: '/games/snake-ladder',
  },
  {
    id: 'crossword',
    name: 'Crucigrama',
    description: 'Resuelve el crucigrama.',
    status: 'DISPONIBLE',
    route: '/games/crossword',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Responde preguntas de opción múltiple.',
    status: 'DISPONIBLE',
    route: '/games/trivia',
  },
  {
    id: 'sopa-letras',
    name: 'Sopa de Letras',
    description: 'Encuentra las palabras ocultas.',
    status: 'DISPONIBLE',
    route: '/games/word-search',
  },
  {
    id: 'rompecabezas',
    name: 'Rompecabezas',
    description: 'Arma la imagen.',
    status: 'DISPONIBLE',
    route: '/games/puzzle',
  },
];
