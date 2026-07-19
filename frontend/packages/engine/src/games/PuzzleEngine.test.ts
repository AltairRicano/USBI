import { describe, it, expect } from 'vitest';
import { PuzzleEngine } from './PuzzleEngine';

describe('PuzzleEngine', () => {
  it('should throw on invalid config', () => {
    expect(() => new PuzzleEngine(1)).toThrow();
    expect(() => new PuzzleEngine(11)).toThrow();
  });

  it('should generate pieces and shuffle them deterministically and distinctly from solution', () => {
    const engine1 = new PuzzleEngine(3, 123);
    const engine2 = new PuzzleEngine(3, 123);
    
    expect(engine1.getState().pieces).toEqual(engine2.getState().pieces);
    
    // Check distinct from solution
    const state = engine1.getState();
    const isSolved = state.pieces.every(p => p.originalGridX === p.currentX && p.originalGridY === p.currentY);
    expect(isSolved).toBe(false);
  });

  it('should move pieces', () => {
    const engine = new PuzzleEngine(3, 123);
    const firstPiece = engine.getState().pieces[0];
    
    engine.movePiece(firstPiece.id, 10, 10);
    const pieceAfterMove = engine.getState().pieces.find(p => p.id === firstPiece.id);
    
    expect(pieceAfterMove?.currentX).toBe(10);
    expect(pieceAfterMove?.currentY).toBe(10);
    expect(engine.getState().moves).toBe(1);
  });

  it('should snap valid piece and lock it', () => {
    const engine = new PuzzleEngine(3, 123);
    const piece = engine.getState().pieces[0];
    
    // Move it near its original spot
    engine.movePiece(piece.id, piece.originalGridX + 0.1, piece.originalGridY - 0.1);
    
    const snapped = engine.snapPiece(piece.id);
    
    expect(snapped).toBe(true);
    const updatedPiece = engine.getState().pieces.find(p => p.id === piece.id);
    expect(updatedPiece?.isLocked).toBe(true);
    expect(updatedPiece?.currentX).toBe(piece.originalGridX);
    expect(updatedPiece?.currentY).toBe(piece.originalGridY);
    expect(engine.getState().score).toBe(100);
  });

  it('should reject invalid snap', () => {
    const engine = new PuzzleEngine(3, 123);
    const piece = engine.getState().pieces[0];
    
    // Move it far
    engine.movePiece(piece.id, piece.originalGridX + 2, piece.originalGridY + 2);
    
    const snapped = engine.snapPiece(piece.id);
    
    expect(snapped).toBe(false);
    const updatedPiece = engine.getState().pieces.find(p => p.id === piece.id);
    expect(updatedPiece?.isLocked).toBe(false);
  });

  it('should finish game when all pieces locked', () => {
    const engine = new PuzzleEngine(2, 123); // 4 pieces
    const pieces = engine.getState().pieces;
    
    for (const p of pieces) {
      engine.movePiece(p.id, p.originalGridX, p.originalGridY);
      engine.snapPiece(p.id);
    }
    
    expect(engine.getState().isFinished).toBe(true);
  });

  it('should reset properly', () => {
    const engine = new PuzzleEngine(2, 123);
    const piece = engine.getState().pieces[0];
    engine.movePiece(piece.id, piece.originalGridX, piece.originalGridY);
    engine.snapPiece(piece.id);
    
    engine.reset();
    
    const state = engine.getState();
    expect(state.moves).toBe(0);
    expect(state.score).toBe(0);
    expect(state.isFinished).toBe(false);
    expect(state.pieces.every(p => !p.isLocked)).toBe(true);
  });
});
