import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function CrosswordForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  const words = value.words || [];
  
  const addWord = () => onChange({ ...value, words: [...words, { word: '', clue: '' }] });
  const removeWord = (idx: number) => onChange({ ...value, words: words.filter((_: any, i: number) => i !== idx) });
  const updateWord = (idx: number, field: 'word'|'clue', val: string) => {
    const next = [...words];
    next[idx][field] = val;
    onChange({ ...value, words: next });
  };

  return (
    <div className="space-y-4">
      {words.map((w: any, idx: number) => (
        <div key={idx} className="flex gap-2 items-end">
          <div className="flex-1">
            <Input label="Palabra" value={w.word} onChange={(e: any) => updateWord(idx, 'word', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} required />
          </div>
          <div className="flex-[2]">
            <Input label="Pista" value={w.clue} onChange={(e: any) => updateWord(idx, 'clue', e.target.value)} required />
          </div>
          {words.length > 2 && <Button variant="outline" className="text-red-500" onClick={() => removeWord(idx)}>X</Button>}
        </div>
      ))}
      <Button variant="outline" onClick={addWord}>+ Agregar Palabra</Button>
    </div>
  );
}
