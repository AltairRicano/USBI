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
      boardWidth: level.board_width,
      boardHeight: level.board_height,
      startPosition: level.start_position,
      endPosition: level.end_position,
      snakes: level.snakes || [],
      ladders: level.ladders || [],
      aiDifficulty: level.ai_config?.difficulty || 'MEDIUM'
  }), [level]);

  const engine = useMemo(() => new SnakeLadderEngine(engineConfig), [engineConfig]);
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
      width: 720,
      height: 780,
      backgroundColor: '#f8fafc',
      scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
      },
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

  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  const handleRollClick = () => {
      const questions = (level as any).questions || [];
      if (questions.length > 0) {
          const q = questions[Math.floor(Math.random() * questions.length)];
          setCurrentQuestion(q);
          setShowQuestionModal(true);
      } else {
          executeRoll();
      }
  };

  const executeRoll = () => {
      if (phaserRef.current?.scene && canRoll) {
          setCanRoll(false);
          phaserRef.current.scene.events.emit('ROLL_DICE');
      }
  };

  const handleAnswer = (index: number) => {
      setShowQuestionModal(false);
      if (index === currentQuestion.correct_index) {
          executeRoll();
      } else {
          setCanRoll(false);
          engine.state.message = "¡Respuesta incorrecta! Pierdes el turno.";
          engine.state.state = 'ai_turn';
          if (phaserRef.current?.scene) {
              const snakeScene = phaserRef.current.scene as any;
              if (snakeScene.messageText) {
                  snakeScene.messageText.setText(engine.state.message);
              }
              snakeScene.events.emit('AI_PLAY');
          }
      }
  };

  return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-2 py-4 sm:px-4">
         {!isGameOver ? (
             <>
                 <div
                     className="relative w-full overflow-hidden rounded-lg border border-[--color-border] bg-[--color-card] shadow-sm"
                     style={{ maxWidth: 'min(92vw, 720px)', aspectRatio: '720 / 780' }}
                 >
                     <PhaserGame
                         key={`${level.board_width}x${level.board_height}-${level.seed ?? 'random'}-${level.snakes?.length ?? 0}-${level.ladders?.length ?? 0}`}
                         ref={phaserRef}
                         config={gameConfig}
                     />
                 </div>
                 <button 
                     onClick={handleRollClick}
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
         
         {showQuestionModal && currentQuestion && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                 <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full">
                     <h3 className="text-xl font-bold mb-4">Para tirar el dado, responde:</h3>
                     <p className="text-lg mb-6">{currentQuestion.question}</p>
                     <div className="flex flex-col gap-3">
                         {currentQuestion.options.map((opt: string, idx: number) => (
                             <button
                                 key={idx}
                                 onClick={() => handleAnswer(idx)}
                                 className="px-4 py-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                             >
                                 {opt}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
         )}
      </div>
  );
};
