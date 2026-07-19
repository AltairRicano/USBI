import { forwardRef, useLayoutEffect, useRef } from 'react';
import Phaser from 'phaser';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

export interface PhaserGameProps {
    config: Phaser.Types.Core.GameConfig;
}

export const PhaserGame = forwardRef<IRefPhaserGame, PhaserGameProps>(({ config }, ref) => {
    const gameContainer = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!gameContainer.current) return;
        
        // Prevent multiple game instances during React StrictMode development
        if (gameContainer.current.children.length > 0) return;

        const game = new Phaser.Game({ ...config, parent: gameContainer.current });

        if (typeof ref === 'function') {
            ref({ game, scene: null });
        } else if (ref) {
            ref.current = { game, scene: null };
        }

        // Setup a global event listener to keep the active scene reference updated (optional but useful)
        game.events.on('step', () => {
            const activeScene = game.scene.getScenes(true)[0];
            if (activeScene) {
                if (typeof ref === 'function') {
                    ref({ game, scene: activeScene });
                } else if (ref) {
                    ref.current = { game, scene: activeScene };
                }
            }
        });

        return () => {
            if (game) {
                game.destroy(true);
            }
            if (typeof ref === 'function') {
                ref({ game: null, scene: null });
            } else if (ref) {
                ref.current = { game: null, scene: null };
            }
        };
    }, [config, ref]);

    return <div ref={gameContainer} className="phaser-game-container" />;
});
