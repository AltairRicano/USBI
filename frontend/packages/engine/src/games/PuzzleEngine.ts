

export interface PuzzlePiece {
  id: string;
  originalGridX: number;
  originalGridY: number;
  currentX: number;
  currentY: number;
  isLocked: boolean;
}

export interface PuzzleState {
  gridSize: number;
  pieces: PuzzlePiece[];
  isFinished: boolean;
  score: number;
  moves: number;
}

export class PuzzleEngine {
  private state: PuzzleState;
  private listeners: Set<(state: PuzzleState) => void> = new Set();
  private seed: number;

  constructor(gridSize: number, seed = 12345) {
    if (gridSize < 2 || gridSize > 10) {
      throw new Error("Invalid configuration: gridSize must be between 2 and 10");
    }
    this.seed = seed;
    this.state = {
      gridSize,
      pieces: [],
      isFinished: false,
      score: 0,
      moves: 0,
    };
    this.generatePieces();
  }

  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private generatePieces() {
    const { gridSize } = this.state;
    const positions: { x: number, y: number }[] = [];
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        this.state.pieces.push({
          id: `${x}-${y}`,
          originalGridX: x,
          originalGridY: y,
          currentX: x,
          currentY: y,
          isLocked: false
        });
        positions.push({ x, y });
      }
    }

    // Shuffle positions deterministically and distinctly from solution
    let isSolved = true;
    let maxAttempts = 100;
    
    while (isSolved && maxAttempts > 0) {
      maxAttempts--;
      
      // Fisher-Yates shuffle
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // Check if it's identical to solution
      isSolved = this.state.pieces.every((p, i) => 
        p.originalGridX === positions[i].x && p.originalGridY === positions[i].y
      );
    }
    
    // Apply shuffled positions
    this.state.pieces.forEach((p, i) => {
      p.currentX = positions[i].x;
      p.currentY = positions[i].y;
    });
  }

  public movePiece(id: string, newX: number, newY: number) {
    if (this.state.isFinished) return;

    const piece = this.state.pieces.find(p => p.id === id);
    if (!piece || piece.isLocked) return;

    piece.currentX = newX;
    piece.currentY = newY;
    this.state.moves++;

    this.notify();
  }

  public snapPiece(id: string): boolean {
    if (this.state.isFinished) return false;
    const piece = this.state.pieces.find(p => p.id === id);
    if (!piece || piece.isLocked) return false;

    // Distance in grid units. Tolerance is e.g. 0.2 (handled in scene mostly, but engine verifies logical snap)
    const dx = Math.abs(piece.currentX - piece.originalGridX);
    const dy = Math.abs(piece.currentY - piece.originalGridY);
    
    if (dx < 0.2 && dy < 0.2) {
      piece.currentX = piece.originalGridX;
      piece.currentY = piece.originalGridY;
      piece.isLocked = true;
      this.state.score += 100;
      this.checkCompletion();
      this.notify();
      return true;
    }
    
    this.notify();
    return false;
  }

  private checkCompletion() {
    this.state.isFinished = this.state.pieces.every(p => p.isLocked);
  }

  public getState(): PuzzleState {
    return this.state;
  }

  public subscribe(listener: (state: PuzzleState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public reset() {
    this.state.moves = 0;
    this.state.score = 0;
    this.state.isFinished = false;
    this.state.pieces = [];
    this.generatePieces();
    this.notify();
  }

  public destroy() {
    this.listeners.clear();
  }
}
