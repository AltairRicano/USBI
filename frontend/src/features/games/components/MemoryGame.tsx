import React, { useState, useEffect } from 'react';
import { MemoryPair } from '@usbi/schema';
import { MemoryEngine, MemoryCard } from '@usbi/engine';
import clsx from 'clsx';

interface MemoryGameProps {
  pairs: MemoryPair[];
  onComplete: (score: number, maxScore: number) => void;
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ pairs, onComplete }) => {
  const [engine] = useState(() => new MemoryEngine(pairs));
  const [cards, setCards] = useState<MemoryCard[]>(engine.getCards());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // window.__TAURI__?.invoke('set_game_status', { isPlaying: true });
  }, []);

  const handleCardClick = (index: number) => {
    if (isProcessing) return;
    
    const flipped = engine.flipCard(index);
    if (!flipped) return;
    
    setCards([...engine.getCards()]);

    const result = engine.checkMatch();
    if (result) {
      setIsProcessing(true);
      setTimeout(() => {
        setCards([...engine.getCards()]);
        setIsProcessing(false);
        if (result.gameOver) {
          // Score logic can be improved. Passing a generic maxScore as total pairs.
          onComplete(pairs.length, pairs.length);
        }
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="grid grid-cols-4 gap-4 max-w-2xl w-full">
        {cards.map((card, index) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(index)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(index); }}
            role="button"
            tabIndex={0}
            className="relative w-full aspect-[3/4] cursor-pointer"
            style={{ perspective: '1000px' }}
          >
            <div
              className={clsx(
                "w-full h-full transition-transform duration-500 border-2 rounded-xl shadow-md",
                (card.isFlipped || card.isMatched) ? "rotate-y-180" : ""
              )}
              style={{
                transformStyle: 'preserve-3d',
                transform: (card.isFlipped || card.isMatched) ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Back of the card (visible when not flipped) */}
              <div
                className="absolute w-full h-full bg-blue-600 rounded-xl backface-hidden"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex items-center justify-center h-full w-full opacity-30 text-white font-bold text-4xl">
                  ?
                </div>
              </div>
              
              {/* Front of the card (visible when flipped) */}
              <div
                className={clsx(
                  "absolute w-full h-full bg-[--color-card] rounded-xl backface-hidden flex items-center justify-center p-2 text-center break-words",
                  card.isMatched ? "bg-green-100 border-green-400" : "border-slate-300"
                )}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-slate-800 font-medium">{card.content}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
