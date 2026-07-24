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

  const engine = useMemo(() => new CrosswordEngine(words), [words]);
  const placedWords = useMemo(() => engine.getPlacedWords(), [engine]);
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

  // We want to assign numbers based on grid position (y, then x)
  const numberedWords = useMemo(() => {
    const sorted = [...placedWords].sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });
    
    // We only increment the number if it's a NEW cell. Two words starting at the same cell share the same number.
    const startMap = new Map<string, number>();
    let currentNumber = 1;
    
    return sorted.map(pw => {
      const key = `${pw.x},${pw.y}`;
      let num = startMap.get(key);
      if (num === undefined) {
        num = currentNumber++;
        startMap.set(key, num);
      }
      return { ...pw, num };
    });
  }, [placedWords]);

  const horizontals = useMemo(() => numberedWords.filter(pw => !pw.isVertical), [numberedWords]);
  const verticals = useMemo(() => numberedWords.filter(pw => pw.isVertical), [numberedWords]);

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
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-lg border-b border-[--color-border] pb-2 mb-3">Horizontales</h4>
            <ul className="flex flex-col gap-2">
              {horizontals.map((pw, i) => (
                <li key={`h-${i}`} className="text-sm text-[--color-text] flex items-start gap-2">
                  <span className="font-bold shrink-0">{pw.num}.</span>
                  <span>{pw.clue}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-lg border-b border-[--color-border] pb-2 mb-3">Verticales</h4>
            <ul className="flex flex-col gap-2">
              {verticals.map((pw, i) => (
                <li key={`v-${i}`} className="text-sm text-[--color-text] flex items-start gap-2">
                  <span className="font-bold shrink-0">{pw.num}.</span>
                  <span>{pw.clue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
