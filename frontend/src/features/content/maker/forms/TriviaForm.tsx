import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function TriviaForm({ value, onChange }: { value: any[], onChange: (val: any[]) => void, errors?: any }) {
  const addQuestion = () => onChange([...value, { question: '', options: ['', ''], correct_index: 0 }]);
  const removeQuestion = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const updateQ = (idx: number, updates: any) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      {value.map((q, qIdx) => (
        <div key={qIdx} className="p-4 border border-gray-200 rounded relative">
          <button onClick={() => removeQuestion(qIdx)} className="absolute top-2 right-2 text-red-500 text-sm">Eliminar</button>
          <Input label={`Pregunta ${qIdx + 1}`} value={q.question} onChange={(e: any) => updateQ(qIdx, { question: e.target.value })} required />
          <div className="mt-4 space-y-2">
            {q.options.map((opt: string, optIdx: number) => (
              <div key={optIdx} className="flex gap-2 items-center">
                <input type="radio" checked={q.correct_index === optIdx} onChange={() => updateQ(qIdx, { correct_index: optIdx })} />
                <Input label="" className="flex-1" value={opt} onChange={(e: any) => {
                  const newOpts = [...q.options];
                  newOpts[optIdx] = e.target.value;
                  updateQ(qIdx, { options: newOpts });
                }} required />
                {q.options.length > 2 && (
                  <button type="button" onClick={() => {
                    const newOpts = q.options.filter((_: any, i: number) => i !== optIdx);
                    updateQ(qIdx, { options: newOpts, correct_index: Math.min(q.correct_index, newOpts.length - 1) });
                  }} className="text-red-500 px-2">X</button>
                )}
              </div>
            ))}
          </div>
          {q.options.length < 4 && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => updateQ(qIdx, { options: [...q.options, ''] })}>
              + Agregar opción
            </Button>
          )}
        </div>
      ))}
      <Button variant="outline" onClick={addQuestion}>+ Agregar Pregunta</Button>
    </div>
  );
}
