import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function SnakeLadderForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  const snakes = value.snakes || [];
  const ladders = value.ladders || [];
  
  const addSnake = () => onChange({ ...value, snakes: [...snakes, { start: 2, end: 1 }] });
  const addLadder = () => onChange({ ...value, ladders: [...ladders, { start: 1, end: 2 }] });

  const updateItem = (list: any[], idx: number, field: string, val: number, isSnake: boolean) => {
    const next = [...list];
    next[idx][field] = val;
    onChange({ ...value, [isSnake ? 'snakes' : 'ladders']: next });
  };
  const removeItem = (list: any[], idx: number, isSnake: boolean) => {
    onChange({ ...value, [isSnake ? 'snakes' : 'ladders']: list.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Input label="Columnas" type="number" min={2} max={10} value={value.board_width} onChange={(e: any) => onChange({...value, board_width: Number(e.target.value)})} required />
        <Input label="Filas" type="number" min={2} max={10} value={value.board_height} onChange={(e: any) => onChange({...value, board_height: Number(e.target.value)})} required />
        <Input label="Casilla Inicial" type="number" value={value.start_position} onChange={(e: any) => onChange({...value, start_position: Number(e.target.value)})} required />
        <Input label="Casilla Final" type="number" value={value.end_position} onChange={(e: any) => onChange({...value, end_position: Number(e.target.value)})} required />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-red-600 mb-2">Serpientes (Bajan)</h4>
          {snakes.map((s: any, idx: number) => (
            <div key={idx} className="flex gap-2 mb-2 items-end">
              <Input label="Inicio (Alto)" type="number" value={s.start} onChange={(e: any) => updateItem(snakes, idx, 'start', Number(e.target.value), true)} />
              <Input label="Fin (Bajo)" type="number" value={s.end} onChange={(e: any) => updateItem(snakes, idx, 'end', Number(e.target.value), true)} />
              <Button variant="outline" onClick={() => removeItem(snakes, idx, true)}>X</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addSnake}>+ Serpiente</Button>
        </div>

        <div>
          <h4 className="font-semibold text-green-600 mb-2">Escaleras (Suben)</h4>
          {ladders.map((l: any, idx: number) => (
            <div key={idx} className="flex gap-2 mb-2 items-end">
              <Input label="Inicio (Bajo)" type="number" value={l.start} onChange={(e: any) => updateItem(ladders, idx, 'start', Number(e.target.value), false)} />
              <Input label="Fin (Alto)" type="number" value={l.end} onChange={(e: any) => updateItem(ladders, idx, 'end', Number(e.target.value), false)} />
              <Button variant="outline" onClick={() => removeItem(ladders, idx, false)}>X</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addLadder}>+ Escalera</Button>
        </div>
      </div>
    </div>
  );
}
