import Phaser from 'phaser';
import { PuzzleEngine } from '@usbi/engine';

interface SceneData {
  engine: PuzzleEngine;
  imageUrl: string;
  onFinish?: (score: number) => void;
}

export class PuzzleScene extends Phaser.Scene {
  private engine!: PuzzleEngine;
  private onFinish?: (score: number) => void;
  private imageUrl!: string;
  private unsubscribeEngine?: () => void;
  
  private puzzleContainer!: Phaser.GameObjects.Container;
  private piecesMap: Map<string, Phaser.GameObjects.Image> = new Map();
  private pieceWidth: number = 0;
  private pieceHeight: number = 0;
  
  private boardOffset: {x: number, y: number} = {x: 0, y: 0};
  
  constructor() {
    super('PuzzleScene');
  }

  init(data: SceneData) {
    this.engine = data.engine;
    this.imageUrl = data.imageUrl;
    this.onFinish = data.onFinish;
  }

  preload() {
    this.load.image('puzzle-image', this.imageUrl);
  }

  create() {
    const state = this.engine.getState();
    const sourceImage = this.textures.get('puzzle-image').getSourceImage();
    const imgWidth = sourceImage.width;
    const imgHeight = sourceImage.height;
    
    // Calculate scaling to fit screen (e.g. 600x600 max)
    const maxSize = 600;
    const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight);
    
    const displayWidth = imgWidth * scale;
    const displayHeight = imgHeight * scale;
    
    this.pieceWidth = displayWidth / state.gridSize;
    this.pieceHeight = displayHeight / state.gridSize;
    
    this.boardOffset.x = (this.cameras.main.width - displayWidth) / 2;
    this.boardOffset.y = (this.cameras.main.height - displayHeight) / 2;

    this.puzzleContainer = this.add.container(this.boardOffset.x, this.boardOffset.y);
    
    // Draw grid background
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(2, 0xcccccc, 0.5);
    for (let i = 0; i <= state.gridSize; i++) {
      gridGraphics.moveTo(this.boardOffset.x + i * this.pieceWidth, this.boardOffset.y);
      gridGraphics.lineTo(this.boardOffset.x + i * this.pieceWidth, this.boardOffset.y + displayHeight);
      gridGraphics.moveTo(this.boardOffset.x, this.boardOffset.y + i * this.pieceHeight);
      gridGraphics.lineTo(this.boardOffset.x + displayWidth, this.boardOffset.y + i * this.pieceHeight);
    }
    gridGraphics.strokePath();

    // Create pieces
    state.pieces.forEach(p => {
      // Create crop frame
      const frameName = `piece-${p.id}`;
      this.textures.get('puzzle-image').add(
        frameName, 
        0, 
        (p.originalGridX * imgWidth) / state.gridSize, 
        (p.originalGridY * imgHeight) / state.gridSize, 
        imgWidth / state.gridSize, 
        imgHeight / state.gridSize
      );

      const pieceImg = this.add.image(0, 0, 'puzzle-image', frameName);
      pieceImg.setDisplaySize(this.pieceWidth, this.pieceHeight);
      pieceImg.setOrigin(0);
      
      // Initial spread position (outside grid if possible, or scattered)
      const startX = p.currentX * this.pieceWidth;
      const startY = p.currentY * this.pieceHeight;
      pieceImg.setPosition(startX, startY);
      
      pieceImg.setInteractive({ cursor: 'pointer', draggable: true });
      
      // Store in map
      this.piecesMap.set(p.id, pieceImg);
      this.puzzleContainer.add(pieceImg);
      
      // Drag events
      pieceImg.on('dragstart', () => {
        if (p.isLocked) return;
        this.puzzleContainer.bringToTop(pieceImg);
      });
      
      pieceImg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        if (p.isLocked) return;
        pieceImg.x = dragX;
        pieceImg.y = dragY;
      });
      
      pieceImg.on('dragend', () => {
        if (p.isLocked) return;
        // Convert pixel to grid coord
        const gridX = pieceImg.x / this.pieceWidth;
        const gridY = pieceImg.y / this.pieceHeight;
        
        this.engine.movePiece(p.id, gridX, gridY);
        const snapped = this.engine.snapPiece(p.id);
        
        if (snapped) {
          pieceImg.x = p.originalGridX * this.pieceWidth;
          pieceImg.y = p.originalGridY * this.pieceHeight;
          pieceImg.disableInteractive();
          pieceImg.setTint(0xddffdd);
          setTimeout(() => pieceImg.clearTint(), 300);
        }
      });
    });

    this.unsubscribeEngine = this.engine.subscribe((newState) => {
      if (newState.isFinished && this.onFinish) {
        this.onFinish(newState.score);
      }
    });
  }

  shutdown() {
    if (this.unsubscribeEngine) {
      this.unsubscribeEngine();
      this.unsubscribeEngine = undefined;
    }
    this.piecesMap.forEach(img => {
      img.off('dragstart');
      img.off('drag');
      img.off('dragend');
    });
    this.piecesMap.clear();
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.input.removeAllListeners();
    // Remove generated frames
    const state = this.engine.getState();
    state.pieces.forEach(p => {
      if (this.textures.exists('puzzle-image')) {
        this.textures.get('puzzle-image').remove(`piece-${p.id}`);
      }
    });
  }
}
