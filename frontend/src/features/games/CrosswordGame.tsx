import { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { CrosswordEngine, CrosswordState } from '@usbi/engine';
import { CrosswordWord } from '@usbi/schema';
import { CrosswordScene } from './CrosswordScene';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';
import { PhaserGame, IRefPhaserGame } from '../../lib/PhaserGame';

interface CrosswordGameProps {
  words: CrosswordWord[];
  onFinish?: (score: number) => void;
}

export function CrosswordGame({ words, onFinish }: CrosswordGameProps) {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const engineRef = useRef<CrosswordEngine | null>(null);
  const [state, setState] = useState<CrosswordState | null>(null);

  const engine = useMemo(() => new CrosswordEngine(words), [words]);
  const placedWords = useMemo(() => engine.getPlacedWords(), [engine]);

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

    engineRef.current = engine;

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
    width: 800,
    height: 600,
    backgroundColor: '#e5e7eb',
    scene: [CrosswordScene]
  }), []);

  useEffect(() => {
    if (phaserRef.current?.game) {
       const game = phaserRef.current.game;
       game.events.once('ready', () => {
          game.scene.start('CrosswordScene', { engine, onFinish });
       });
    }
  }, [phaserRef, engine, onFinish]);

  if (!state) return <div>Loading...</div>;

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0 relative">
        <div className="w-full aspect-video rounded-xl overflow-hidden shadow-inner relative min-h-[400px]">
           <PhaserGame ref={phaserRef} config={gameConfig} />
        </div>
      </CardContent>
      <div className="w-full md:w-80 p-6 border-l border-[--color-border] flex flex-col gap-4 overflow-y-auto max-h-[600px]">
        <CardTitle className="text-xl">Crucigrama</CardTitle>
        <div className="flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Puntuación</p>
          <p className="font-bold text-2xl text-[--color-primary]">{state.score}</p>
        </div>
        {state.isFinished && (
          <div className="mt-2 p-4 bg-green-100 text-green-800 rounded-xl font-bold text-center animate-pulse">
            ¡Completado!
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <h4 className="font-bold text-lg border-b pb-2">Pistas</h4>
          <ul className="flex flex-col gap-3">
            {placedWords.map((pw, i) => (
              <li key={i} className="text-sm">
                <span className="font-bold text-gray-700 mr-2">
                  {pw.isVertical ? 'Vertical' : 'Horizontal'} ({pw.x},{pw.y}):
                </span>
                {pw.clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
