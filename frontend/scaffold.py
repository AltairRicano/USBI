import os

files = {
    "src/trivia/TriviaEngine.ts": """
import { IGameState } from '../interfaces/IGameState';

export class TriviaEngine {
    private state: IGameState;
    
    constructor() {
        this.state = {
            status: 'wait',
            score: 0,
            currentQuestionIndex: 0
        };
    }
    
    public getState(): IGameState {
        return this.state;
    }
    
    public startGame(): void {
        this.state.status = 'question';
    }
    
    public answerQuestion(correct: boolean): void {
        if (correct) {
            this.state.score += 10;
        }
        this.state.status = 'feedback';
    }
    
    public nextQuestion(): void {
        this.state.currentQuestionIndex += 1;
        this.state.status = 'question';
    }
    
    public endGame(): void {
        this.state.status = 'game_over';
    }
}
""",
    "src/trivia/TriviaBoard.tsx": """
import React, { useEffect, useState } from 'react';
import { TriviaEngine } from './TriviaEngine';
import { IGameState } from '../interfaces/IGameState';

// Mock invoke for Tauri
const invoke = (cmd: string, args?: any) => console.log('invoke', cmd, args);

export const TriviaBoard: React.FC = () => {
    const [engine] = useState(() => new TriviaEngine());
    const [state, setState] = useState<IGameState>(engine.getState());
    
    useEffect(() => {
        invoke('set_game_status', true);
        const eventBus = new EventTarget();
        eventBus.dispatchEvent(new Event('ON_GAME_START'));
        
        return () => {
            invoke('set_game_status', false);
            eventBus.dispatchEvent(new Event('GAME_OVER'));
        };
    }, []);
    
    const handleAnswer = (correct: boolean) => {
        engine.answerQuestion(correct);
        setState({ ...engine.getState() });
    };
    
    return (
        <div className="bg-white p-4 text-black">
            <h1>Trivia</h1>
            <p>Score: {state.score}</p>
            {state.status === 'question' && (
                <button className="primary" onClick={() => handleAnswer(true)}>Answer Correctly</button>
            )}
        </div>
    );
};
""",
    "src/wordsearch/WordSearchScene.ts": """
import Phaser from 'phaser';

export class WordSearchScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WordSearchScene' });
    }
    
    preload() {
        // No external assets
    }
    
    create() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xff0000, 1);
        graphics.fillRect(100, 100, 200, 200);
        
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            console.log('pointerdown', pointer.x, pointer.y);
        });
    }
}
""",
    "src/puzzle/PuzzleScene.ts": """
import Phaser from 'phaser';

export class PuzzleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PuzzleScene' });
    }
    
    preload() {
        // No external assets
    }
    
    create() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1);
        graphics.fillRect(100, 100, 200, 200);
    }
}
""",
    "src/index.ts": """
export * from './interfaces/IGameState';
export * from './trivia/TriviaEngine';
export * from './trivia/TriviaBoard';
export * from './wordsearch/WordSearchScene';
export * from './puzzle/PuzzleScene';
"""
}

base_dir = "/mnt/wolf/codigo/usbi/frontend/packages/engine"

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content.strip() + "\n")

print("Files created.")
