import { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { WordSearchEngine, WordSearchState } from '@usbi/engine';
import { WordSearchScene } from './WordSearchScene';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';
import { PhaserGame, IRefPhaserGame } from '../../lib/PhaserGame';

interface WordSearchGameProps {
  words: string[];
  width?: number;
  height?: number;
  seed?: number;
  onFinish?: (score: number) => void;
}

export function WordSearchGame({ words, width = 10, height = 10, seed = 1234, onFinish }: WordSearchGameProps) {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const engineRef = useRef<WordSearchEngine | null>(null);
  const [state, setState] = useState<WordSearchState | null>(null);

  const engine = useMemo(() => new WordSearchEngine(words, width, height, seed), [words, width, height, seed]);

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
    backgroundColor: '#ffffff',
    scene: [WordSearchScene]
  }), []);

  useEffect(() => {
    if (phaserRef.current?.game) {
       const game = phaserRef.current.game;
       game.events.once('ready', () => {
          game.scene.start('WordSearchScene', { engine, onFinish });
       });
    }
  }, [phaserRef, engine, onFinish]);

  if (!state) return <div>Loading...</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0">
        <div className="w-full aspect-video rounded-xl overflow-hidden relative min-h-[400px]">
           <PhaserGame ref={phaserRef} config={gameConfig} />
        </div>
      </CardContent>
      <div className="w-full md:w-64 p-6 border-l border-[--color-border] flex flex-col gap-4">
        <CardTitle className="text-xl">Palabras a buscar</CardTitle>
        <p className="font-bold text-[--color-primary]">Score: {state.score}</p>
        <ul className="flex flex-col gap-2">
          {state.words.map((word, i) => (
            <li 
              key={i}
              className={`text-lg transition-colors ${state.foundWords.includes(word) ? 'text-gray-300 line-through' : 'text-gray-800'}`}
            >
              {word}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
