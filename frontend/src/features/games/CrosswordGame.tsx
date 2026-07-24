import { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { CrosswordEngine, type CrosswordState } from '@usbi/engine';
import type { CrosswordWord } from '@usbi/schema';
import { CrosswordScene } from './CrosswordScene';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';
import { PhaserGame, type IRefPhaserGame } from '../../lib/PhaserGame';

interface CrosswordGameProps {
  words: CrosswordWord[];
  onFinish?: (score: number) => void;
}

export function CrosswordGame({ words, onFinish }: CrosswordGameProps) {
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  const engine = useMemo(() => new CrosswordEngine(words), [words]);
  const placedWords = useMemo(() => engine.getPlacedWords(), [engine]);
  const unplacedWords = useMemo(() => engine.getUnplacedWords(), [engine]);
  const [state, setState] = useState<CrosswordState>(() => engine.getState());


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
    width: 720,
    height: 720,
    backgroundColor: '#f8f9fa',
    scene: [CrosswordScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set('crosswordEngine', engine);
        game.registry.set('crosswordOnFinish', onFinish);
      },
    },
  }), [engine, onFinish]);


  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0 relative">
        <div
          className="relative mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-xl shadow-inner"
          style={{ background: '#f8f9fa' }}
        >
           <PhaserGame
             key={words.map((word) => `${word.word}:${word.clue}`).join('|')}
             ref={phaserRef}
             config={gameConfig}
           />
        </div>
      </CardContent>
      <div className="w-full md:w-80 p-6 border-l border-[--color-border] flex flex-col gap-4 overflow-y-auto max-h-[600px]">
        <CardTitle className="text-xl">Crucigrama</CardTitle>
        <div className="flex flex-col gap-2 bg-white dark:bg-[--color-card] p-4 rounded-xl border border-[--color-border]">
          <p className="text-sm text-[--color-text-muted]">Puntuación</p>
          <p className="font-bold text-2xl text-[--color-primary]">{state.score}</p>
        </div>
        {state.isFinished && (
          <div className="mt-2 p-4 bg-green-100 text-green-800 rounded-xl font-bold text-center animate-pulse">
            ¡Completado!
          </div>
        )}
        {unplacedWords.length > 0 && (
          <div className="mt-2 rounded-xl border border-[--color-error] bg-red-50 p-3 text-sm text-[--color-error]">
            Hay palabras que no se pudieron cruzar: {unplacedWords.map((word) => word.word).join(', ')}.
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <h4 className="font-bold text-lg border-b border-[--color-border] pb-2">Pistas</h4>
          <ul className="flex flex-col gap-3">
            {placedWords.map((pw, i) => (
              <li key={i} className="text-sm text-[--color-text]">
                <span className="font-bold mr-2">
                  {pw.isVertical ? '↓' : '→'} ({pw.x},{pw.y}):
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
