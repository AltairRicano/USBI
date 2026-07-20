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
    id: 'fake_news',
    name: 'Fake News',
    description: 'Identifica las noticias falsas.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
  {
    id: 'memory',
    name: 'Memorama',
    description: 'Encuentra los pares de cartas.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
  {
    id: 'snakes_ladders',
    name: 'Serpientes y Escaleras',
    description: 'Juega contra la IA y llega a la meta.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
  {
    id: 'crossword',
    name: 'Crucigrama',
    description: 'Resuelve el crucigrama.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Responde preguntas de opción múltiple.',
    status: 'DISPONIBLE',
  },
  {
    id: 'word_search',
    name: 'Sopa de Letras',
    description: 'Encuentra las palabras ocultas.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
  {
    id: 'puzzle',
    name: 'Rompecabezas',
    description: 'Arma la imagen.',
    status: 'IMPLEMENTADO PARCIALMENTE',
  },
];
