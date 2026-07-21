import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Snakes } from '@usbi/schema';
import { SnakeLadderEngine, SnakeLadderConfig } from '@usbi/engine';
import { PhaserGame, IRefPhaserGame } from '../../../lib/PhaserGame';
import { SnakeLadderScene } from '../phaser/SnakeLadderScene';
import { invoke } from '@tauri-apps/api/core';
import Phaser from 'phaser';

interface SnakeLadderGameProps {
  level: Snakes;
  onComplete: (score: number, maxScore: number) => void;
}

export const SnakeLadderGame: React.FC<SnakeLadderGameProps> = ({ level, onComplete }) => {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  
  const engineConfig = useMemo<SnakeLadderConfig>(() => ({
      boardSize: level.board_width * level.board_height,
      snakes: level.snakes || [],
      ladders: level.ladders || [],
      aiDifficulty: level.ai_config?.difficulty || 'MEDIUM'
  }), [level]);

  const [engine] = useState(() => new SnakeLadderEngine(engineConfig));
  const [isGameOver, setIsGameOver] = useState(false);
  const [canRoll, setCanRoll] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    // Notify Tauri that game started
    invoke('set_game_status', { isPlaying: true }).catch(console.error);
    engine.start();
    return () => {
      invoke('set_game_status', { isPlaying: false }).catch(console.error);
    };
  }, [engine]);

  const gameConfig: Phaser.Types.Core.GameConfig = useMemo(() => ({
      type: Phaser.AUTO,
      width: 600,
      height: 600,
      backgroundColor: '#f8fafc',
      scene: [SnakeLadderScene],
      callbacks: {
          preBoot: (game) => {
              game.registry.set('config', engineConfig);
              game.registry.set('engine', engine);
          }
      }
  }), [engineConfig, engine]);

  useEffect(() => {
     if (phaserRef.current?.scene) {
        const scene = phaserRef.current.scene;
        
        const handleGameOver = (data: { winner: string }) => {
            setIsGameOver(true);
            setWinner(data.winner);
            const score = data.winner === 'player' ? 100 : 0;
            onComplete(score, 100);
        };
        
        scene.events.on('GAME_OVER', handleGameOver);
        
        // Re-check roll button state periodically since scene drives it
        const interval = setInterval(() => {
            const snakeScene = scene as SnakeLadderScene;
            setCanRoll(engine.state.state === 'player_turn' && !snakeScene.isAnimating);
        }, 100);

        return () => {
            scene.events.off('GAME_OVER', handleGameOver);
            clearInterval(interval);
        };
     }
  }, [phaserRef, engine, onComplete]);

  const rollDice = () => {
     if (phaserRef.current?.scene && canRoll) {
         setCanRoll(false);
         phaserRef.current.scene.events.emit('ROLL_DICE');
     }
  };

  return (
      <div className="flex flex-col items-center justify-center p-4">
         {!isGameOver ? (
             <>
                 <div className="mb-4 rounded-xl shadow-lg overflow-hidden border-2 border-slate-300 relative w-[600px] h-[600px] bg-[--color-card]">
                     <PhaserGame ref={phaserRef} config={gameConfig} />
                 </div>
                 <button 
                     onClick={rollDice}
                     disabled={!canRoll}
                     className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-md disabled:bg-slate-400 active:scale-95 transition-transform"
                 >
                     Tirar Dado
                 </button>
             </>
         ) : (
             <div className="flex flex-col items-center justify-center p-8 text-center text-white bg-slate-800 rounded-xl">
                 <h2 className="text-3xl font-bold mb-4">Juego Terminado</h2>
                 <p className="text-xl">Ganador: {winner === 'player' ? '¡Tú!' : 'La Inteligencia Artificial'}</p>
             </div>
         )}
      </div>
  );
};
