import { CrosswordWord } from "@usbi/schema";


export interface CrosswordCell {
  x: number;
  y: number;
  char: string;
}

export interface PlacedWord {
  word: string;
  clue: string;
  x: number;
  y: number;
  isVertical: boolean;
}

export interface CrosswordState {
  score: number;
  isFinished: boolean;
  userGrid: Map<string, string>;
  selectedCell: { x: number; y: number } | null;
  orientation: 'horizontal' | 'vertical';
}

export class CrosswordEngine {
  private grid: Map<string, CrosswordCell> = new Map();
  private placedWords: PlacedWord[] = [];
  private maxX = 0;
  private maxY = 0;
  
  private state: CrosswordState = {
    score: 0,
    isFinished: false,
    userGrid: new Map(),
    selectedCell: null,
    orientation: 'horizontal'
  };
  private listeners: Set<(state: CrosswordState) => void> = new Set();
  private initialWords: CrosswordWord[];

  constructor(words: CrosswordWord[]) {
    this.initialWords = words;
    this.generateGrid(words);
  }

  private generateGrid(words: CrosswordWord[]) {
    // Basic backtracking algorithm
    if (words.length === 0) return;
    
    const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
    const firstWord = sortedWords.shift()!;
    
    this.placeWord(firstWord, 0, 0, false);

    for (const w of sortedWords) {
      this.tryPlaceWord(w);
    }
  }

  private placeWord(cw: CrosswordWord, x: number, y: number, isVertical: boolean) {
    this.placedWords.push({ word: cw.word, clue: cw.clue, x, y, isVertical });
    for (let i = 0; i < cw.word.length; i++) {
      const cx = isVertical ? x : x + i;
      const cy = isVertical ? y + i : y;
      this.grid.set(`${cx},${cy}`, { x: cx, y: cy, char: cw.word[i] });
      if (cx > this.maxX) this.maxX = cx;
      if (cy > this.maxY) this.maxY = cy;
    }
  }

  private tryPlaceWord(cw: CrosswordWord): boolean {
    const word = cw.word;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      // Find cells with same char
      for (const cell of this.grid.values()) {
        if (cell.char === char) {
          // Try horizontal
          if (this.canPlaceWord(word, cell.x - i, cell.y, false)) {
            this.placeWord(cw, cell.x - i, cell.y, false);
            return true;
          }
          // Try vertical
          if (this.canPlaceWord(word, cell.x, cell.y - i, true)) {
            this.placeWord(cw, cell.x, cell.y - i, true);
            return true;
          }
        }
      }
    }
    // If no intersection, place below
    this.placeWord(cw, 0, this.maxY + 2, false);
    return true;
  }

  private canPlaceWord(word: string, startX: number, startY: number, isVertical: boolean): boolean {
    for (let i = 0; i < word.length; i++) {
      const cx = isVertical ? startX : startX + i;
      const cy = isVertical ? startY + i : startY;
      const key = `${cx},${cy}`;
      
      if (this.grid.has(key)) {
        if (this.grid.get(key)!.char !== word[i]) {
          return false;
        }
      } else {
        // check adjacent cells to avoid side by side words
        const adj1 = isVertical ? `${cx - 1},${cy}` : `${cx},${cy - 1}`;
        const adj2 = isVertical ? `${cx + 1},${cy}` : `${cx},${cy + 1}`;
        if (this.grid.has(adj1) || this.grid.has(adj2)) return false;
      }
    }
    return true;
  }

  getPlacedWords(): PlacedWord[] {
    return this.placedWords;
  }

  getGridCells(): CrosswordCell[] {
    return Array.from(this.grid.values());
  }

  // --- IGameState Extensions ---
  public getState(): CrosswordState {
    return this.state;
  }

  public subscribe(listener: (state: CrosswordState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.state));
  }

  public inputChar(char: string) {
    if (this.state.isFinished || !this.state.selectedCell) return;
    const key = `${this.state.selectedCell.x},${this.state.selectedCell.y}`;
    if (!this.grid.has(key)) return;
    
    // Normalize and uppercase
    const cleanChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    this.state.userGrid.set(key, cleanChar);
    
    // Move to next cell automatically
    const nextX = this.state.selectedCell.x + (this.state.orientation === 'horizontal' ? 1 : 0);
    const nextY = this.state.selectedCell.y + (this.state.orientation === 'vertical' ? 1 : 0);
    const nextKey = `${nextX},${nextY}`;
    
    if (this.grid.has(nextKey)) {
      this.state.selectedCell = { x: nextX, y: nextY };
    }
    
    this.validate();
    this.notify();
  }

  public selectCell(x: number, y: number) {
    const key = `${x},${y}`;
    if (!this.grid.has(key)) return;

    if (this.state.selectedCell && this.state.selectedCell.x === x && this.state.selectedCell.y === y) {
      this.state.orientation = this.state.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    } else {
      this.state.selectedCell = { x, y };
      // Try to guess orientation based on what's available
      const horizHas = this.grid.has(`${x+1},${y}`) || this.grid.has(`${x-1},${y}`);
      const vertHas = this.grid.has(`${x},${y+1}`) || this.grid.has(`${x},${y-1}`);
      if (horizHas && !vertHas) this.state.orientation = 'horizontal';
      if (vertHas && !horizHas) this.state.orientation = 'vertical';
    }
    this.notify();
  }
  
  public navigate(dx: number, dy: number) {
    if (!this.state.selectedCell) return;
    const nx = this.state.selectedCell.x + dx;
    const ny = this.state.selectedCell.y + dy;
    if (this.grid.has(`${nx},${ny}`)) {
      this.state.selectedCell = { x: nx, y: ny };
      this.notify();
    }
  }

  public validate() {
    let allCorrect = true;
    let correctCount = 0;
    
    for (const cell of this.grid.values()) {
      const key = `${cell.x},${cell.y}`;
      const userChar = this.state.userGrid.get(key);
      const expectedChar = cell.char.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (userChar === expectedChar) {
        correctCount++;
      } else {
        allCorrect = false;
      }
    }
    
    this.state.score = correctCount * 10;
    
    if (allCorrect && this.grid.size > 0) {
      this.state.isFinished = true;
    }
  }

  public reset() {
    this.state.userGrid.clear();
    this.state.score = 0;
    this.state.isFinished = false;
    this.state.selectedCell = null;
    this.state.orientation = 'horizontal';
    this.notify();
  }

  public destroy() {
    this.listeners.clear();
  }
}
