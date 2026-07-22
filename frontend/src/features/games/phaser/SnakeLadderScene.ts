import * as Phaser from 'phaser';
import { SnakeLadderEngine, SnakeLadderConfig, mapToGrid } from '@usbi/engine';

interface BoardLayout {
  cols: number;
  rows: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  boardWidth: number;
  boardHeight: number;
}

export class SnakeLadderScene extends Phaser.Scene {
  private config!: SnakeLadderConfig;
  private engine!: SnakeLadderEngine;
  private playerToken!: Phaser.GameObjects.Arc;
  private aiToken!: Phaser.GameObjects.Arc;
  public isAnimating = false;
  private messageText!: Phaser.GameObjects.Text;
  private diceText!: Phaser.GameObjects.Text;
  private layout!: BoardLayout;

  constructor() {
    super('SnakeLadderScene');
  }

  init() {
    this.config = this.game.registry.get('config');
    this.engine = this.game.registry.get('engine');
  }

  create() {
    this.layout = this.calculateLayout();
    this.drawHud();
    this.drawBoard();
    this.drawLinks();
    this.drawTokens();

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
    this.diceText.setText(`Tiro: ${this.engine.state.lastRoll}`);

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

    const roll = this.engine.state.lastRoll;
    const winPosition = this.config.endPosition ?? this.config.boardSize;
    let intermediatePos = startPos + roll;
    if (intermediatePos > winPosition) {
      const excess = intermediatePos - winPosition;
      intermediatePos = winPosition - excess;
    }

    const isPlayer = token === this.playerToken;
    const positions: { x: number; y: number }[] = [];

    if (intermediatePos > startPos) {
      for (let i = startPos + 1; i <= intermediatePos; i++) {
        positions.push(this.tokenPoint(i, isPlayer));
      }
    } else if (intermediatePos < startPos) {
      for (let i = startPos + 1; i <= winPosition; i++) {
        positions.push(this.tokenPoint(i, isPlayer));
      }
      for (let i = winPosition - 1; i >= intermediatePos; i--) {
        positions.push(this.tokenPoint(i, isPlayer));
      }
    } else {
      positions.push(this.tokenPoint(endPos, isPlayer));
    }

    if (intermediatePos !== endPos) {
      positions.push(this.tokenPoint(endPos, isPlayer));
    }

    if (positions.length === 0) {
      this.isAnimating = false;
      onComplete();
      return;
    }

    this.tweens.chain({
      tweens: positions.map((pos, idx) => {
        const isJump = idx === positions.length - 1 && intermediatePos !== endPos;
        return {
          targets: token,
          x: pos.x,
          y: pos.y,
          duration: isJump ? 520 : 180,
          ease: isJump ? 'Sine.easeInOut' : 'Linear',
        };
      }),
      onComplete: () => {
        this.isAnimating = false;
        onComplete();
      },
    });
  }

  private calculateLayout(): BoardLayout {
    const cols = this.config.boardWidth ?? Math.ceil(Math.sqrt(this.config.boardSize));
    const rows = this.config.boardHeight ?? Math.ceil(this.config.boardSize / cols);
    const width = this.scale.width;
    const height = this.scale.height;
    const hudHeight = 82;
    const padding = 24;
    const availableWidth = width - padding * 2;
    const availableHeight = height - hudHeight - padding * 2;
    const cellSize = Math.floor(Math.min(availableWidth / cols, availableHeight / rows));
    const boardWidth = cellSize * cols;
    const boardHeight = cellSize * rows;

    return {
      cols,
      rows,
      cellSize,
      boardWidth,
      boardHeight,
      offsetX: Math.round((width - boardWidth) / 2),
      offsetY: Math.round(hudHeight + (height - hudHeight - boardHeight) / 2),
    };
  }

  private drawHud() {
    this.add.rectangle(0, 0, this.scale.width, 74, 0xf8fafc).setOrigin(0);
    this.messageText = this.add.text(20, 16, this.engine.state.message, {
      color: '#0f172a',
      fontSize: '22px',
      fontStyle: 'bold',
    });
    this.diceText = this.add.text(20, 44, '', {
      color: '#334155',
      fontSize: '18px',
    });
  }

  private drawBoard() {
    const { cols, rows, cellSize, offsetX, offsetY } = this.layout;
    const totalCells = cols * rows;
    const startPosition = this.config.startPosition ?? 1;
    const endPosition = this.config.endPosition ?? totalCells;

    for (let i = 1; i <= totalCells; i++) {
      const { x, y } = mapToGrid(i, cols, rows);
      const cx = offsetX + x * cellSize;
      const cy = offsetY + y * cellSize;
      const isStart = i === startPosition;
      const isEnd = i === endPosition;
      const fill = isStart ? 0xdbeafe : isEnd ? 0xdcfce7 : 0xffffff;

      this.add.rectangle(cx, cy, cellSize, cellSize, fill)
        .setStrokeStyle(1, 0x334155)
        .setOrigin(0);

      this.add.text(cx + cellSize * 0.08, cy + cellSize * 0.08, `${i}`, {
        color: '#0f172a',
        fontSize: `${Math.max(12, Math.floor(cellSize * 0.22))}px`,
        fontStyle: 'bold',
      });

      if (isStart || isEnd) {
        this.add.text(cx + cellSize / 2, cy + cellSize * 0.65, isStart ? 'INICIO' : 'META', {
          color: isStart ? '#1d4ed8' : '#15803d',
          fontSize: `${Math.max(10, Math.floor(cellSize * 0.16))}px`,
          fontStyle: 'bold',
        }).setOrigin(0.5);
      }
    }
  }

  private drawLinks() {
    const graphics = this.add.graphics();
    this.config.ladders.forEach((ladder) => this.drawLadder(graphics, ladder.start, ladder.end));
    this.config.snakes.forEach((snake) => this.drawSnake(graphics, snake.start, snake.end));
  }

  private drawSnake(graphics: Phaser.GameObjects.Graphics, start: number, end: number) {
    const from = this.cellCenter(start);
    const to = this.cellCenter(end);
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(from.x, from.y),
      new Phaser.Math.Vector2((from.x + to.x) / 2 + this.layout.cellSize * 0.35, (from.y + to.y) / 2),
      new Phaser.Math.Vector2(to.x, to.y),
    );

    graphics.lineStyle(Math.max(4, this.layout.cellSize * 0.08), 0xdc2626, 0.78);
    curve.draw(graphics, 32);
    graphics.fillStyle(0xdc2626, 0.95);
    graphics.fillCircle(from.x, from.y, Math.max(5, this.layout.cellSize * 0.1));
  }

  private drawLadder(graphics: Phaser.GameObjects.Graphics, start: number, end: number) {
    const from = this.cellCenter(start);
    const to = this.cellCenter(end);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const normalX = (-dy / length) * Math.max(5, this.layout.cellSize * 0.08);
    const normalY = (dx / length) * Math.max(5, this.layout.cellSize * 0.08);

    graphics.lineStyle(Math.max(3, this.layout.cellSize * 0.05), 0x16a34a, 0.9);
    graphics.lineBetween(from.x + normalX, from.y + normalY, to.x + normalX, to.y + normalY);
    graphics.lineBetween(from.x - normalX, from.y - normalY, to.x - normalX, to.y - normalY);

    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const rungX = from.x + dx * t;
      const rungY = from.y + dy * t;
      graphics.lineBetween(rungX + normalX, rungY + normalY, rungX - normalX, rungY - normalY);
    }
  }

  private drawTokens() {
    const playerPoint = this.tokenPoint(this.engine.state.playerPosition, true);
    const aiPoint = this.tokenPoint(this.engine.state.aiPosition, false);
    const radius = Math.max(7, Math.min(13, this.layout.cellSize * 0.16));
    this.playerToken = this.add.circle(playerPoint.x, playerPoint.y, radius, 0x2563eb)
      .setStrokeStyle(2, 0xffffff);
    this.aiToken = this.add.circle(aiPoint.x, aiPoint.y, radius, 0xc026d3)
      .setStrokeStyle(2, 0xffffff);
  }

  private cellCenter(position: number): { x: number; y: number } {
    const safePosition = Phaser.Math.Clamp(position, 1, this.layout.cols * this.layout.rows);
    const { x, y } = mapToGrid(safePosition, this.layout.cols, this.layout.rows);
    return {
      x: this.layout.offsetX + x * this.layout.cellSize + this.layout.cellSize / 2,
      y: this.layout.offsetY + y * this.layout.cellSize + this.layout.cellSize / 2,
    };
  }

  private tokenPoint(position: number, isPlayer: boolean): { x: number; y: number } {
    const center = this.cellCenter(position);
    const spread = Math.max(7, this.layout.cellSize * 0.16);
    return {
      x: center.x + (isPlayer ? -spread : spread),
      y: center.y + spread * 0.35,
    };
  }
}
