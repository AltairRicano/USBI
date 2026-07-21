import Phaser from 'phaser';
import { WordSearchEngine } from '@usbi/engine';

interface SceneData {
  engine: WordSearchEngine;
  onFinish?: (score: number) => void;
}

export class WordSearchScene extends Phaser.Scene {
  private engine!: WordSearchEngine;
  private onFinish?: (score: number) => void;
  private unsubscribeEngine?: () => void;
  
  private cellSize: number = 40;
  private gridOffset: { x: number, y: number } = { x: 0, y: 0 };
  
  private cells: Phaser.GameObjects.Text[][] = [];
  private selectedCoords: { x: number, y: number }[] = [];
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private foundGraphics!: Phaser.GameObjects.Graphics;
  
  private isSelecting: boolean = false;

  constructor() {
    super('WordSearchScene');
  }

  init(data: SceneData) {
    if (data.engine) {
       this.engine = data.engine;
    }
    if (data.onFinish) {
       this.onFinish = data.onFinish;
    }
  }

  create(data: SceneData) {
    if (data.engine) this.engine = data.engine;
    if (data.onFinish) this.onFinish = data.onFinish;

    if (!this.engine) return;

    const state = this.engine.getState();
    const width = state.width;
    const height = state.height;

    // Calculate grid layout
    const boardWidth = width * this.cellSize;
    const boardHeight = height * this.cellSize;
    
    this.gridOffset.x = (this.cameras.main.width - boardWidth) / 2;
    this.gridOffset.y = (this.cameras.main.height - boardHeight) / 2;

    this.foundGraphics = this.add.graphics();
    this.selectionGraphics = this.add.graphics();

    // Create grid
    for (let y = 0; y < height; y++) {
      this.cells[y] = [];
      for (let x = 0; x < width; x++) {
        const px = this.gridOffset.x + x * this.cellSize + this.cellSize / 2;
        const py = this.gridOffset.y + y * this.cellSize + this.cellSize / 2;
        
        const text = this.add.text(px, py, state.grid[y][x], {
          fontSize: '24px',
          color: '#333333',
          fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        this.cells[y][x] = text;
      }
    }

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);

    this.unsubscribeEngine = this.engine.subscribe((newState) => {
      this.redrawFound(newState.foundWords, newState.grid, newState.width, newState.height);
      if (newState.isFinished && this.onFinish) {
        this.onFinish(newState.score);
      }
    });

    // Draw initially found words if any
    this.redrawFound(state.foundWords, state.grid, state.width, state.height);
  }

  private getGridCoord(x: number, y: number): { x: number, y: number } | null {
    if (!this.engine) return null;
    const state = this.engine.getState();
    const gx = Math.floor((x - this.gridOffset.x) / this.cellSize);
    const gy = Math.floor((y - this.gridOffset.y) / this.cellSize);
    
    if (gx >= 0 && gx < state.width && gy >= 0 && gy < state.height) {
      return { x: gx, y: gy };
    }
    return null;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    const coord = this.getGridCoord(pointer.x, pointer.y);
    if (coord) {
      this.isSelecting = true;
      this.selectedCoords = [coord];
      this.drawSelection();
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.isSelecting) return;
    const coord = this.getGridCoord(pointer.x, pointer.y);
    if (coord) {
      const start = this.selectedCoords[0];
      // Restrict to horizontal, vertical, or diagonal
      const dx = coord.x - start.x;
      const dy = coord.y - start.y;
      
      if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        this.selectedCoords = [];
        for (let i = 0; i <= steps; i++) {
          const stepX = steps === 0 ? 0 : dx / steps;
          const stepY = steps === 0 ? 0 : dy / steps;
          this.selectedCoords.push({
            x: start.x + stepX * i,
            y: start.y + stepY * i
          });
        }
        this.drawSelection();
      }
    }
  }

  private handlePointerUp() {
    if (this.isSelecting) {
      this.isSelecting = false;
      if (this.engine) {
         this.engine.checkWord(this.selectedCoords);
      }
      this.selectedCoords = [];
      this.selectionGraphics.clear();
    }
  }

  private drawSelection() {
    this.selectionGraphics.clear();
    if (this.selectedCoords.length === 0) return;

    this.selectionGraphics.lineStyle(20, 0x000000, 0.2);
    this.selectionGraphics.beginPath();
    
    const start = this.selectedCoords[0];
    this.selectionGraphics.moveTo(
      this.gridOffset.x + start.x * this.cellSize + this.cellSize / 2,
      this.gridOffset.y + start.y * this.cellSize + this.cellSize / 2
    );

    for (let i = 1; i < this.selectedCoords.length; i++) {
      const p = this.selectedCoords[i];
      this.selectionGraphics.lineTo(
        this.gridOffset.x + p.x * this.cellSize + this.cellSize / 2,
        this.gridOffset.y + p.y * this.cellSize + this.cellSize / 2
      );
    }
    this.selectionGraphics.strokePath();
  }

  private redrawFound(foundWords: string[], grid: string[][], width: number, height: number) {
    if (!this.foundGraphics) return;
    this.foundGraphics.clear();
    
    for (const word of foundWords) {
      const coords = this.findWordInGrid(word, grid, width, height);
      if (coords) {
        this.foundGraphics.lineStyle(20, 0x4caf50, 0.4);
        this.foundGraphics.beginPath();
        this.foundGraphics.moveTo(
          this.gridOffset.x + coords[0].x * this.cellSize + this.cellSize / 2,
          this.gridOffset.y + coords[0].y * this.cellSize + this.cellSize / 2
        );
        for (let i = 1; i < coords.length; i++) {
          this.foundGraphics.lineTo(
            this.gridOffset.x + coords[i].x * this.cellSize + this.cellSize / 2,
            this.gridOffset.y + coords[i].y * this.cellSize + this.cellSize / 2
          );
        }
        this.foundGraphics.strokePath();
      }
    }
  }

  private findWordInGrid(word: string, grid: string[][], width: number, height: number): {x: number, y: number}[] | null {
    const dirs = [[1,0], [0,1], [1,1], [1,-1], [-1,0], [0,-1], [-1,-1], [-1,1]];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === word[0]) {
          for (const [dx, dy] of dirs) {
            let found = true;
            const coords = [{x, y}];
            for (let i = 1; i < word.length; i++) {
              const nx = x + dx * i;
              const ny = y + dy * i;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height || grid[ny][nx] !== word[i]) {
                found = false;
                break;
              }
              coords.push({x: nx, y: ny});
            }
            if (found) return coords;
          }
        }
      }
    }
    return null;
  }

  shutdown() {
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = undefined;
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
