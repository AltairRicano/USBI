import type { ChangeEvent } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

interface TriviaQuestion {
  question: string;
  options: string[];
  correct_index: number;
  media_url?: string;
}

export function TriviaForm({
  value,
  onChange,
}: {
  value: TriviaQuestion[];
  onChange: (val: TriviaQuestion[]) => void;
}) {
  const addQuestion = () => onChange([...value, { question: '', options: ['', ''], correct_index: 0 }]);
  const removeQuestion = (idx: number) => {
    if (value.length <= 3) return;
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateQ = (idx: number, updates: Partial<TriviaQuestion>) => {
    const next = [...value];
    next[idx] = { ...next[idx], ...updates };
    onChange(next);
  };

  return (
    <div className="space-y-6">
      {value.map((q, qIdx) => (
        <div key={qIdx} className="p-4 border border-gray-200 rounded relative">
          <button
            type="button"
            onClick={() => removeQuestion(qIdx)}
            disabled={value.length <= 3}
            className="absolute top-2 right-2 text-red-500 text-sm disabled:text-gray-400"
          >
            Eliminar
          </button>
          <Input label={`Pregunta ${qIdx + 1}`} value={q.question} onChange={(event: ChangeEvent<HTMLInputElement>) => updateQ(qIdx, { question: event.target.value })} required />
          <div className="mt-4 space-y-2">
            {q.options.map((opt: string, optIdx: number) => (
              <div key={optIdx} className="flex gap-2 items-center">
                <input type="radio" checked={q.correct_index === optIdx} onChange={() => updateQ(qIdx, { correct_index: optIdx })} />
                <Input label="" className="flex-1" value={opt} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const newOpts = [...q.options];
                  newOpts[optIdx] = event.target.value;
                  updateQ(qIdx, { options: newOpts });
                }} required />
                {q.options.length > 2 && (
                  <button type="button" onClick={() => {
                    const newOpts = q.options.filter((_, i) => i !== optIdx);
                    updateQ(qIdx, { options: newOpts, correct_index: Math.min(q.correct_index, newOpts.length - 1) });
                  }} className="text-red-500 px-2">X</button>
                )}
              </div>
            ))}
          </div>
          {q.options.length < 4 && (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => updateQ(qIdx, { options: [...q.options, ''] })}>
              + Agregar opción
            </Button>
          )}
        </div>
      ))}
      <p className="text-sm text-[--color-muted]">Mínimo 3 preguntas para sostener partidas repetidas.</p>
      <Button type="button" variant="outline" onClick={addQuestion}>+ Agregar Pregunta</Button>
    </div>
  );
}
