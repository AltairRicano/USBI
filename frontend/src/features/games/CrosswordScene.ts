import Phaser from 'phaser';
import { CrosswordEngine, CrosswordState } from '@usbi/engine';

interface SceneData {
  engine: CrosswordEngine;
  onFinish?: (score: number) => void;
}

export class CrosswordScene extends Phaser.Scene {
  private engine!: CrosswordEngine;
  private onFinish?: (score: number) => void;
  private unsubscribeEngine?: () => void;
  
  private cellSize: number = 40;
  private gridOffset: { x: number, y: number } = { x: 0, y: 0 };
  
  private cellRects: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private cellTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private highlightGraphics!: Phaser.GameObjects.Graphics;
  
  constructor() {
    super('CrosswordScene');
  }

  init(data: SceneData) {
    this.engine = data.engine;
    this.onFinish = data.onFinish;
  }

  create() {
    // Draw a white background to prevent black canvas bleed-through
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xf8f9fa
    );

    this.highlightGraphics = this.add.graphics();
    const cells = this.engine.getGridCells();

    // Guard: nothing to draw if engine has no placed words
    if (cells.length === 0) {
      this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'Sin palabras para mostrar',
        { fontSize: '20px', color: '#666666', fontFamily: 'sans-serif' }
      ).setOrigin(0.5);
      return;
    }

    // Find grid bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(c => {
      if (c.x < minX) minX = c.x;
      if (c.x > maxX) maxX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.y > maxY) maxY = c.y;
    });

    const gridW = (maxX - minX + 1) * this.cellSize;
    const gridH = (maxY - minY + 1) * this.cellSize;

    this.gridOffset.x = (this.cameras.main.width - gridW) / 2 - (minX * this.cellSize);
    this.gridOffset.y = (this.cameras.main.height - gridH) / 2 - (minY * this.cellSize);

    // Build a set of word-start positions for numbering
    const wordStartLabels = new Map<string, number>();
    this.engine.getPlacedWords().forEach((pw, idx) => {
      wordStartLabels.set(`${pw.x},${pw.y}`, idx + 1);
    });

    cells.forEach(c => {
      const px = this.gridOffset.x + c.x * this.cellSize;
      const py = this.gridOffset.y + c.y * this.cellSize;

      const rect = this.add
        .rectangle(px + this.cellSize / 2, py + this.cellSize / 2, this.cellSize, this.cellSize, 0xffffff)
        .setStrokeStyle(1, 0x333333)
        .setInteractive({ cursor: 'pointer' });

      rect.on('pointerdown', () => {
        this.engine.selectCell(c.x, c.y);
      });

      const text = this.add
        .text(px + this.cellSize / 2, py + this.cellSize / 2, '', {
          fontSize: '22px',
          color: '#111111',
          fontFamily: 'monospace',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const key = `${c.x},${c.y}`;
      this.cellRects.set(key, rect);
      this.cellTexts.set(key, text);

      // Draw small number label at top-left of word-start cells
      const labelNum = wordStartLabels.get(key);
      if (labelNum !== undefined) {
        this.add.text(px + 2, py + 1, String(labelNum), {
          fontSize: '10px',
          color: '#555555',
          fontFamily: 'sans-serif',
        });
      }
    });

    this.input.keyboard!.on('keydown', this.handleKeyDown, this);

    this.unsubscribeEngine = this.engine.subscribe((newState) => {
      this.drawState(newState);
      if (newState.isFinished && this.onFinish) {
        this.onFinish(newState.score);
      }
    });
  }

  private drawState(state: CrosswordState) {
    this.highlightGraphics.clear();

    // Reset colors
    this.cellRects.forEach((rect) => {
      rect.setFillStyle(0xffffff);
    });

    // Draw selection
    if (state.selectedCell) {
      const {x, y} = state.selectedCell;
      const key = `${x},${y}`;
      const rect = this.cellRects.get(key);
      if (rect) {
        rect.setFillStyle(0xffea00); // Yellow highlight
      }
      
      // Optionally highlight word (not fully implemented in state, but basic idea)
    }

    // Draw chars
    this.cellTexts.forEach((text, key) => {
      const char = state.userGrid.get(key) || '';
      text.setText(char);
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      this.engine.navigate(1, 0);
    } else if (event.key === 'ArrowLeft') {
      this.engine.navigate(-1, 0);
    } else if (event.key === 'ArrowDown') {
      this.engine.navigate(0, 1);
    } else if (event.key === 'ArrowUp') {
      this.engine.navigate(0, -1);
    } else if (event.key.length === 1 && /[a-zA-ZñÑ\s]/.test(event.key)) {
      this.engine.inputChar(event.key);
    } else if (event.key === 'Backspace') {
      this.engine.inputChar('');
      // Navigate backwards
      const state = this.engine.getState();
      if (state.orientation === 'horizontal') this.engine.navigate(-1, 0);
      else this.engine.navigate(0, -1);
    }
  }

  shutdown() {
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = undefined;
    }
    this.cellRects.forEach(r => r.off('pointerdown'));
    this.cellRects.clear();
    this.cellTexts.clear();
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
