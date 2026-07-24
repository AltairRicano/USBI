import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';

export function PuzzleForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1 text-gray-700">Frase o mensaje secreto</label>
        <textarea 
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          value={value.phrase || ''} 
          onChange={(e: any) => onChange({...value, phrase: e.target.value})} 
          required 
          placeholder="Escribe la frase secreta aquí..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Número de piezas (3-20)" type="number" min={3} max={20} value={value.pieces || 3} onChange={(e: any) => onChange({...value, pieces: Number(e.target.value)})} required />
        <div>
           <label className="text-sm font-medium">Semilla (Seed)</label>
           <div className="flex gap-2 mt-1">
             <Input label="Semilla" value={value.seed || 1234} readOnly />
             <Button variant="outline" type="button" onClick={() => onChange({...value, seed: Math.floor(Math.random()*10000)})}>Aleatoria</Button>
           </div>
        </div>
      </div>
    </div>
  );
}
