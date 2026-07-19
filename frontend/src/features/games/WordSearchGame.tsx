import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { invoke } from '@tauri-apps/api/core';
import { WordSearchEngine, WordSearchState } from '@usbi/engine';
import { WordSearchScene } from './WordSearchScene';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';

interface WordSearchGameProps {
  words: string[];
  width?: number;
  height?: number;
  seed?: number;
  onFinish?: (score: number) => void;
}

export function WordSearchGame({ words, width = 10, height = 10, seed = 1234, onFinish }: WordSearchGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WordSearchEngine | null>(null);
  const [state, setState] = useState<WordSearchState | null>(null);
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

    const engine = new WordSearchEngine(words, width, height, seed);
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
        backgroundColor: '#ffffff',
        scene: [WordSearchScene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.once('ready', () => {
        game.scene.start('WordSearchScene', { engine, onFinish });
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
  }, [words, width, height, seed, onFinish]);

  if (!state) return <div>Loading...</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8 flex flex-col md:flex-row gap-4">
      <CardContent className="flex-1 p-0">
        <div ref={containerRef} className="w-full aspect-video rounded-xl overflow-hidden" />
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
