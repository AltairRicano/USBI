import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function WordSearchForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  const words = value.words || [];
  
  const addWord = () => onChange({ ...value, words: [...words, ''] });
  const removeWord = (idx: number) => onChange({ ...value, words: words.filter((_: any, i: number) => i !== idx) });
  const updateWord = (idx: number, val: string) => {
    const next = [...words];
    next[idx] = val.toUpperCase().replace(/[^A-Z]/g, '');
    onChange({ ...value, words: next });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Input label="Ancho (5-24)" type="number" min={5} max={24} value={value.width || 12} onChange={(e: any) => onChange({...value, width: Number(e.target.value)})} />
        <Input label="Alto (5-24)" type="number" min={5} max={24} value={value.height || 12} onChange={(e: any) => onChange({...value, height: Number(e.target.value)})} />
        <div>
           <label className="text-sm font-medium">Semilla (Seed)</label>
           <div className="flex gap-2 mt-1">
             <Input label="Semilla" value={value.seed || 1234} readOnly />
             <Button variant="outline" onClick={() => onChange({...value, seed: Math.floor(Math.random()*10000)})}>Aleatoria</Button>
           </div>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold">Palabras a buscar</h4>
        {words.map((w: string, idx: number) => (
          <div key={idx} className="flex gap-2">
            <Input label="" className="flex-1" value={w} onChange={(e: any) => updateWord(idx, e.target.value)} required />
            {words.length > 2 && <Button variant="outline" className="text-red-500" onClick={() => removeWord(idx)}>X</Button>}
          </div>
        ))}
        <Button variant="outline" onClick={addWord}>+ Agregar Palabra</Button>
      </div>
    </div>
  );
}
