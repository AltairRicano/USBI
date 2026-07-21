import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  const [state, setState] = useState<CrosswordState | null>(null);

  const engine = useMemo(() => new CrosswordEngine(words), [words]);
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
    backgroundColor: '#f8f9fa',
    scene: [CrosswordScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  }), []);

  // This callback is guaranteed to fire after Phaser is ready
  const handleGameReady = useCallback((game: Phaser.Game) => {
    game.scene.start('CrosswordScene', { engine, onFinish });
  }, [engine, onFinish]);


  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0 relative">
        <div
          className="w-full rounded-xl overflow-hidden shadow-inner relative"
          style={{ minHeight: '500px', background: '#f8f9fa' }}
        >
           <PhaserGame ref={phaserRef} config={gameConfig} onGameReady={handleGameReady} />
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
