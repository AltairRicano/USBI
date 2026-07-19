import * as Phaser from 'phaser';
import { CrosswordEngine } from '@usbi/engine';
import { CrosswordWord } from '@usbi/schema';

export class CrosswordScene extends Phaser.Scene {
  private words: CrosswordWord[];
  private engine!: CrosswordEngine;
  private cellSize = 40;

  constructor() {
    super('CrosswordScene');
    this.words = [];
  }

  init(data: { words: CrosswordWord[] }) {
    this.words = data.words || [];
  }

  preload() {
    // preload assets if any
  }

  create() {
    this.engine = new CrosswordEngine(this.words);
    const cells = this.engine.getGridCells();
    const placedWords = this.engine.getPlacedWords();

    const offsetX = 50;
    const offsetY = 50;

    // Draw grid
    cells.forEach(cell => {
      const x = offsetX + cell.x * this.cellSize;
      const y = offsetY + cell.y * this.cellSize;

      this.add.rectangle(x, y, this.cellSize, this.cellSize, 0xffffff)
        .setStrokeStyle(1, 0x000000)
        .setOrigin(0);

      // In a real implementation we would use DOM elements for text inputs
      // For now, we just draw empty squares and maybe the solution in light text for testing
      // this.add.text(x + 10, y + 10, cell.char, { color: '#cccccc' });
    });

    // Draw Clues
    let clueY = offsetY + (this.cellSize * 12);
    this.add.text(offsetX, clueY, 'Pistas:', { color: '#000000', fontSize: '20px' });
    clueY += 30;
    placedWords.forEach((pw, idx) => {
      this.add.text(offsetX, clueY, `${idx + 1}. ${pw.clue} (${pw.isVertical ? 'V' : 'H'})`, { color: '#333333' });
      
      // Draw number on grid
      const nx = offsetX + pw.x * this.cellSize + 2;
      const ny = offsetY + pw.y * this.cellSize + 2;
      this.add.text(nx, ny, `${idx + 1}`, { color: '#000000', fontSize: '10px' });
      
      clueY += 20;
    });
    
    // Simulate game end (Wait for input match in real implementation)
    this.time.delayedCall(5000, () => {
       this.events.emit('GAME_WIN', { score: 100 });
    });
  }
}
