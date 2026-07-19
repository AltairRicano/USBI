import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { PuzzleEngine, PuzzleState } from '@usbi/engine';
import { PuzzleScene } from './PuzzleScene';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';

interface PuzzleGameProps {
  imageUrl: string;
  gridSize?: number;
  seed?: number;
  onFinish?: (score: number) => void;
}

export function PuzzleGame({ imageUrl, gridSize = 3, seed = 1234, onFinish }: PuzzleGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PuzzleEngine | null>(null);
  const [state, setState] = useState<PuzzleState | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const setup = async () => {
      try {
        await invoke('set_game_status', { isPlaying: true });
      } catch (err) {
        console.error('Failed to set game status', err);
      }
    };
    setup();

    const engine = new PuzzleEngine(gridSize, seed);
    engineRef.current = engine;

    const unsubscribe = engine.subscribe((newState) => {
      setState({ ...newState });
    });

    if (containerRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 800,
        height: 600,
        backgroundColor: '#f3f4f6',
        scene: [PuzzleScene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once('ready', () => {
        game.scene.start('PuzzleScene', { engine, imageUrl, onFinish });
      });
    }

    return () => {
      unsubscribe();
      engine.destroy();
      if (gameRef.current) {
        const scenes = gameRef.current.scene.getScenes(true);
        scenes.forEach(scene => {
          if ('shutdown' in scene) {
            (scene as Phaser.Scene & { shutdown: () => void }).shutdown();
          }
        });
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      const teardown = async () => {
        try {
          await invoke('set_game_status', { isPlaying: false });
        } catch (err) {
          console.error('Failed to clear game status', err);
        }
      };
      teardown();
    };
  }, [imageUrl, gridSize, seed, onFinish]);

  if (!state) return <div>Loading...</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0 relative">
        <div ref={containerRef} className="w-full aspect-video rounded-xl overflow-hidden shadow-inner" />
      </CardContent>
      <div className="w-full md:w-64 p-6 border-l border-[--color-border] flex flex-col gap-4">
        <CardTitle className="text-xl">Rompecabezas</CardTitle>
        <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Movimientos</p>
          <p className="font-bold text-2xl text-[--color-primary]">{state.moves}</p>
        </div>
        <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Puntuación</p>
          <p className="font-bold text-2xl text-[--color-primary]">{state.score}</p>
        </div>
        {state.isFinished && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-xl font-bold text-center animate-pulse">
            ¡Completado!
          </div>
        )}
      </div>
    </Card>
  );
}
