import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';

export function PuzzleForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  return (
    <div className="space-y-4">
      <Input label="URL de la imagen" type="url" value={value.imageUrl || ''} onChange={(e: any) => onChange({...value, imageUrl: e.target.value})} required />
      {value.imageUrl && (
        <div className="mt-2">
          <p className="text-sm text-gray-500">Vista previa:</p>
          <img src={value.imageUrl} alt="preview" className="max-h-48 rounded object-cover mt-1" onError={(e: any) => e.currentTarget.style.display = 'none'} onLoad={(e: any) => e.currentTarget.style.display = 'block'} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Tamaño de cuadrícula (2-10)" type="number" min={2} max={10} value={value.gridSize || 3} onChange={(e: any) => onChange({...value, gridSize: Number(e.target.value)})} required />
        <div>
           <label className="text-sm font-medium">Semilla (Seed)</label>
           <div className="flex gap-2 mt-1">
             <Input label="Semilla" value={value.seed || 1234} readOnly />
             <Button variant="outline" onClick={() => onChange({...value, seed: Math.floor(Math.random()*10000)})}>Aleatoria</Button>
           </div>
        </div>
      </div>
    </div>
  );
}
