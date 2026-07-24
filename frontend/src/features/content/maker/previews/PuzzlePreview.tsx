import { PuzzleGame } from '../../../games/PuzzleGame';

export function PuzzlePreview({ value }: { value: any }) {
  if (!value.phrase) {
    return (
      <div className="p-4 bg-gray-50 border rounded-md text-gray-500 text-center">
        Ingresa una frase para ver la vista previa.
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border rounded-md overflow-hidden">
      <h3 className="font-bold text-gray-700 mb-4">Vista Previa</h3>
      <div className="scale-75 origin-top">
        <PuzzleGame 
          phrase={value.phrase} 
          pieces={value.pieces || 3} 
          seed={value.seed} 
        />
      </div>
    </div>
  );
}
