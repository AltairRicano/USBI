import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { PuzzleEngine, PuzzleState } from '@usbi/engine';
import { PuzzleScene } from './PuzzleScene';
import { Card, CardTitle } from '../../components/ui/Card';
import { PhaserGame, IRefPhaserGame } from '../../lib/PhaserGame';

interface PuzzleGameProps {
  imageUrl: string;
  gridSize?: number;
  seed?: number;
  onFinish?: (score: number) => void;
}

export function PuzzleGame({ imageUrl, gridSize = 3, seed = 1234, onFinish }: PuzzleGameProps) {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [state, setState] = useState<PuzzleState | null>(null);

  const engine = useMemo(() => new PuzzleEngine(gridSize, seed), [gridSize, seed]);
  const [state, setState] = useState<PuzzleState>(() => engine.getState());

  useEffect(() => {
    const setup = async () => {
      try {
        if (window.__TAURI__) {
          await invoke('set_game_status', { isPlaying: true });
        }
      } catch (err) {
        console.error('Failed to set game status', err);
      }
    };
    setup();

    // Set initial state from engine
    setState({ ...engine.getState() });

    const unsubscribe = engine.subscribe((newState) => {
      setState({ ...newState });
    });

    return () => {
      unsubscribe();
      engine.destroy();
      const teardown = async () => {
        try {
          if (window.__TAURI__) {
            await invoke('set_game_status', { isPlaying: false });
          }
        } catch (err) {
          console.error('Failed to clear game status', err);
        }
      };
      teardown();
    };
  }, [engine]);

  const gameConfig: Phaser.Types.Core.GameConfig = useMemo(() => ({
    type: Phaser.AUTO,
    width: 600,
    height: 600,
    backgroundColor: '#ffffff',
    scene: [PuzzleScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }), []);

  // This callback is guaranteed to fire after Phaser is ready
  const handleGameReady = useCallback((game: Phaser.Game) => {
    game.scene.start('PuzzleScene', { engine, onFinish, imageUrl });
  }, [engine, onFinish, imageUrl]);


  return (
    <Card className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center p-6 gap-6">
      <CardTitle className="text-2xl">Rompecabezas</CardTitle>

      <div className="flex gap-4 items-center">
        <p className="font-bold text-lg text-gray-700 dark:text-gray-300">Movimientos: {state.moves}</p>
        <p className="font-bold text-lg text-[--color-primary]">Puntuación: {state.score}</p>
      </div>

      <div className="w-[600px] h-[600px] border-4 border-[--color-border] rounded-xl overflow-hidden shadow-lg relative">
         <PhaserGame ref={phaserRef} config={gameConfig} onGameReady={handleGameReady} />
      </div>

      {state.isFinished && (
        <div className="p-4 bg-green-100 text-green-800 rounded-xl font-bold text-center animate-bounce text-xl mt-4">
          ¡Felicidades, completaste el rompecabezas!
        </div>
      )}
    </Card>
  );
}
