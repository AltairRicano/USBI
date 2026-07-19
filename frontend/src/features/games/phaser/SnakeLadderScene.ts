import * as Phaser from 'phaser';
import { SnakeLadderEngine, SnakeLadderConfig, mapToGrid } from '@usbi/engine';

export class SnakeLadderScene extends Phaser.Scene {
  private config!: SnakeLadderConfig;
  private engine!: SnakeLadderEngine;
  private cellSize = 40;
  private playerToken!: Phaser.GameObjects.Arc;
  private aiToken!: Phaser.GameObjects.Arc;
  public isAnimating = false;
  private messageText!: Phaser.GameObjects.Text;
  private diceText!: Phaser.GameObjects.Text;
  
  constructor() {
    super('SnakeLadderScene');
  }

  init() {
    this.config = this.game.registry.get('config');
    this.engine = this.game.registry.get('engine');
  }

  create() {
    const cols = Math.ceil(Math.sqrt(this.config.boardSize));
    const rows = Math.ceil(this.config.boardSize / cols);
    const offsetX = 50;
    const offsetY = 50;

    for (let i = 1; i <= this.config.boardSize; i++) {
      const { x, y } = mapToGrid(i, cols, rows);
      const cx = offsetX + x * this.cellSize;
      const cy = offsetY + y * this.cellSize;

      this.add.rectangle(cx, cy, this.cellSize, this.cellSize, 0xffffff)
        .setStrokeStyle(1, 0x000000)
        .setOrigin(0);
      
      this.add.text(cx + 2, cy + 2, `${i}`, { color: '#000000', fontSize: '12px' });
    }

    this.config.snakes.forEach((s: {start: number, end: number}) => {
      const start = mapToGrid(s.start, cols, rows);
      const end = mapToGrid(s.end, cols, rows);
      const sx = offsetX + start.x * this.cellSize + this.cellSize / 2;
      const sy = offsetY + start.y * this.cellSize + this.cellSize / 2;
      const ex = offsetX + end.x * this.cellSize + this.cellSize / 2;
      const ey = offsetY + end.y * this.cellSize + this.cellSize / 2;
      
      this.add.line(0, 0, sx, sy, ex, ey, 0xff0000).setOrigin(0).setLineWidth(2);
    });

    this.config.ladders.forEach((l: {start: number, end: number}) => {
      const start = mapToGrid(l.start, cols, rows);
      const end = mapToGrid(l.end, cols, rows);
      const sx = offsetX + start.x * this.cellSize + this.cellSize / 2;
      const sy = offsetY + start.y * this.cellSize + this.cellSize / 2;
      const ex = offsetX + end.x * this.cellSize + this.cellSize / 2;
      const ey = offsetY + end.y * this.cellSize + this.cellSize / 2;
      
      this.add.line(0, 0, sx, sy, ex, ey, 0x00ff00).setOrigin(0).setLineWidth(2);
    });

    const pStart = mapToGrid(1, cols, rows);
    this.playerToken = this.add.circle(offsetX + pStart.x * this.cellSize + 10, offsetY + pStart.y * this.cellSize + 20, 8, 0x0000ff);
    this.aiToken = this.add.circle(offsetX + pStart.x * this.cellSize + 30, offsetY + pStart.y * this.cellSize + 20, 8, 0xff00ff);

    this.messageText = this.add.text(10, 10, this.engine.state.message, { color: '#000000', fontSize: '16px' });
    this.diceText = this.add.text(10, 30, '', { color: '#000000', fontSize: '16px' });

    this.events.on('ROLL_DICE', () => {
      if (this.engine.state.state === 'player_turn' && !this.isAnimating) {
        const startPos = this.engine.state.playerPosition;
        this.engine.rollPlayer();
        const endPos = this.engine.state.playerPosition;
        this.updateState('player', startPos, endPos);
      }
    });
  }

  updateState(who: 'player' | 'ai', startPos: number, endPos: number) {
    this.messageText.setText(this.engine.state.message);
    this.diceText.setText(`Last Roll: ${this.engine.state.lastRoll}`);
    
    const token = who === 'player' ? this.playerToken : this.aiToken;

    this.animateToken(token, startPos, endPos, () => {
        if (who === 'player' && this.engine.state.state === 'ai_turn') {
            this.time.delayedCall(500, () => {
                if (!this.isAnimating) {
                    const aiStartPos = this.engine.state.aiPosition;
                    this.engine.playAITurn();
                    const aiEndPos = this.engine.state.aiPosition;
                    this.updateState('ai', aiStartPos, aiEndPos);
                }
            });
        } else if (this.engine.state.state === 'game_over') {
            this.events.emit('GAME_OVER', { winner: this.engine.state.winner });
        }
    });
  }

  animateToken(token: Phaser.GameObjects.Arc, startPos: number, endPos: number, onComplete: () => void) {
    this.isAnimating = true;
    const cols = Math.ceil(Math.sqrt(this.config.boardSize));
    const rows = Math.ceil(this.config.boardSize / cols);
    
    const isPlayer = token === this.playerToken;
    const offsetTokenX = isPlayer ? 10 : 30;
    
    const roll = this.engine.state.lastRoll;
    let intermediatePos = startPos + roll;
    if (intermediatePos > this.config.boardSize) {
        const excess = intermediatePos - this.config.boardSize;
        intermediatePos = this.config.boardSize - excess;
    }

    const positions: {x: number, y: number}[] = [];
    
    // Step by step to intermediatePos
    if (intermediatePos > startPos) {
       for(let i = startPos + 1; i <= intermediatePos; i++) {
           const p = mapToGrid(i, cols, rows);
           positions.push({ x: 50 + p.x * this.cellSize + offsetTokenX, y: 50 + p.y * this.cellSize + 20 });
       }
    } else if (intermediatePos < startPos) {
        // Bounce back logic
        for(let i = startPos + 1; i <= this.config.boardSize; i++) {
            const p = mapToGrid(i, cols, rows);
            positions.push({ x: 50 + p.x * this.cellSize + offsetTokenX, y: 50 + p.y * this.cellSize + 20 });
        }
        for(let i = this.config.boardSize - 1; i >= intermediatePos; i--) {
            const p = mapToGrid(i, cols, rows);
            positions.push({ x: 50 + p.x * this.cellSize + offsetTokenX, y: 50 + p.y * this.cellSize + 20 });
        }
    } else {
       // Should not happen as roll >= 1, but fallback
       const p = mapToGrid(endPos, cols, rows);
       positions.push({ x: 50 + p.x * this.cellSize + offsetTokenX, y: 50 + p.y * this.cellSize + 20 });
    }

    // After reaching intermediate, jump to endPos (snake or ladder)
    if (intermediatePos !== endPos) {
        const p = mapToGrid(endPos, cols, rows);
        positions.push({ x: 50 + p.x * this.cellSize + offsetTokenX, y: 50 + p.y * this.cellSize + 20 });
    }

    if (positions.length === 0) {
        this.isAnimating = false;
        onComplete();
        return;
    }

    const tweenConfigs = positions.map((pos, idx) => {
        const isJump = idx === positions.length - 1 && intermediatePos !== endPos;
        return {
            targets: token,
            x: pos.x,
            y: pos.y,
            duration: isJump ? 500 : 200,
            ease: isJump ? 'Sine.easeInOut' : 'Linear'
        };
    });

    this.tweens.chain({
        tweens: tweenConfigs,
        onComplete: () => {
            this.isAnimating = false;
            onComplete();
        }
    });
    

  }
}
