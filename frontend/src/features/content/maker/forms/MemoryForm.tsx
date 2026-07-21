import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function MemoryForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  const pairs = value.pairs || [];
  
  const addPair = () => onChange({ ...value, pairs: [...pairs, { id: crypto.randomUUID(), content1: '', content2: '' }] });
  const removePair = (idx: number) => onChange({ ...value, pairs: pairs.filter((_: any, i: number) => i !== idx) });
  const updatePair = (idx: number, field: string, val: string) => {
    const next = [...pairs];
    next[idx][field] = val;
    onChange({ ...value, pairs: next });
  };

  return (
    <div className="space-y-4">
      {pairs.map((p: any, idx: number) => (
        <div key={p.id} className="flex gap-4 items-start p-3 border rounded">
          <div className="flex-1 space-y-2">
            <Input label={`Tarjeta A (Par ${idx + 1})`} value={p.content1} onChange={(e: any) => updatePair(idx, 'content1', e.target.value)} required />
          </div>
          <div className="flex-1 space-y-2">
            <Input label={`Tarjeta B (Par ${idx + 1})`} value={p.content2} onChange={(e: any) => updatePair(idx, 'content2', e.target.value)} required />
          </div>
          {pairs.length > 4 && <Button variant="outline" className="text-red-500 mt-6" onClick={() => removePair(idx)}>X</Button>}
        </div>
      ))}
      <Button variant="outline" onClick={addPair}>+ Agregar Par</Button>
      <p className="text-xs text-gray-500">Mínimo 4 pares requeridos.</p>
    </div>
  );
}
