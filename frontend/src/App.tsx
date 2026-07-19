import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import DashboardPage from './features/dashboard/DashboardPage';
import { MakerPage } from './features/maker';
import { FakeNewsGame } from './features/games/components/FakeNewsGame';
import { MemoryGame } from './features/games/components/MemoryGame';
import { SnakeLadderGame } from './features/games/components/SnakeLadderGame';
import { TriviaGame } from './features/games/TriviaGame';
import { WordSearchGame } from './features/games/WordSearchGame';
import { PuzzleGame } from './features/games/PuzzleGame';
import { CrosswordGame } from './features/games/CrosswordGame';

import { Snakes, FakeNewsItem, MultipleChoice } from '@usbi/schema';

// Placeholder levels for games
const mockSnakesLevel: Snakes = {
  board_width: 10, board_height: 10, start_position: 1, end_position: 100, snakes: [{start: 16, end: 6}], ladders: [{start: 2, end: 15}], ai_config: { difficulty: 'EASY' }
};

const mockFakeNews: FakeNewsItem[] = [
  { title: 'Test News', content: 'This is a test news', reference: '', imageUrl: '', isFake: true, explanation: 'Test explanation' }
];

const mockTriviaLevel: MultipleChoice[] = [
  { question: '¿Cuál es la capital de Veracruz?', options: ['Xalapa', 'Veracruz', 'Boca del Río', 'Córdoba'], correct_index: 0 }
];

const mockCrosswordLevel = {
  words: [
    { word: 'XALAPA', clue: 'Capital de Veracruz' },
    { word: 'UV', clue: 'Universidad Veracruzana' }
  ]
};

export default function App() {
  return (
    <BrowserRouter>
      {/* SVG para filtros daltónicos globales */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix"
              values="0.625 0.375 0   0 0
                      0.7   0.3   0   0 0
                      0     0.3   0.7 0 0
                      0     0     0   1 0"/>
          </filter>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix"
              values="0.567 0.433 0     0 0
                      0.558 0.442 0     0 0
                      0     0.242 0.758 0 0
                      0     0     0     1 0"/>
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix"
              values="0.95 0.05  0    0 0
                      0    0.433 0.567 0 0
                      0    0.475 0.525 0 0
                      0    0     0     1 0"/>
          </filter>
        </defs>
      </svg>
      <Routes>
        {/* Raíz → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/games/fake-news"
          element={
            <ProtectedRoute>
              <FakeNewsGame news={mockFakeNews} onComplete={(score, max) => console.log('Score:', score, max)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/memorama"
          element={
            <ProtectedRoute>
              <MemoryGame pairs={[{id: '1', content1: 'A', content2: 'A'}, {id: '2', content1: 'B', content2: 'B'}]} onComplete={(score, max) => console.log('Score:', score, max)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/snake-ladder"
          element={
            <ProtectedRoute>
              <SnakeLadderGame level={mockSnakesLevel} onComplete={(score: number, max?: number) => console.log('Score:', score, max)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/trivia"
          element={
            <ProtectedRoute>
              <TriviaGame questions={mockTriviaLevel} onFinish={(score: number) => console.log('Score:', score)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/word-search"
          element={
            <ProtectedRoute>
              <WordSearchGame words={['VERACRUZ', 'XALAPA']} onFinish={(score: number) => console.log('Score:', score)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/puzzle"
          element={
            <ProtectedRoute>
              <PuzzleGame imageUrl="" gridSize={3} onFinish={(score: number) => console.log('Score:', score)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/games/crossword"
          element={
            <ProtectedRoute>
              <CrosswordGame words={mockCrosswordLevel.words} onFinish={(score: number) => console.log('Score:', score)} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/maker"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MakerPage />
            </ProtectedRoute>
          }
        />

        {/* Ruta de acceso denegado */}
        <Route
          path="/unauthorized"
          element={
            <main className="min-h-screen flex items-center justify-center">
              <div className="text-center space-y-4">
                <h1 style={{ color: 'var(--color-error)' }}>Acceso no autorizado</h1>
                <p style={{ color: 'var(--color-muted)' }}>
                  No tienes permiso para ver esta página.
                </p>
              </div>
            </main>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
