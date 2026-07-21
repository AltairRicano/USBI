import { forwardRef, useLayoutEffect, useRef } from 'react';
import Phaser from 'phaser';

export interface IRefPhaserGame {
    game: Phaser.Game | null;
    scene: Phaser.Scene | null;
}

export interface PhaserGameProps {
    config: Phaser.Types.Core.GameConfig;
    onGameReady?: (game: Phaser.Game) => void;
}

export const PhaserGame = forwardRef<IRefPhaserGame, PhaserGameProps>(({ config, onGameReady }, ref) => {
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

        // Call onGameReady when Phaser finishes booting
        game.events.once('ready', () => {
            if (onGameReady) {
                onGameReady(game);
            }
        });

        // Setup a global event listener to keep the active scene reference updated
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={gameContainer} className="phaser-game-container" style={{ width: '100%', height: '100%' }} />;
});
