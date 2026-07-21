import { Input } from '../../../components/ui/Input';
import { SectionDTO } from '../types';

interface LevelMetadataFormProps {
  title: string;
  setTitle: (t: string) => void;
  color: string;
  setColor: (c: string) => void;
  difficulty: number;
  setDifficulty: (d: number) => void;
  templateType: string;
  setTemplateType: (t: any) => void;
  sectionId: string;
  setSectionId: (id: string) => void;
  sections: SectionDTO[];
  isEditing: boolean;
}

export function LevelMetadataForm({
  title, setTitle, color, setColor, difficulty, setDifficulty, 
  templateType, setTemplateType, sectionId, setSectionId, sections, isEditing
}: LevelMetadataFormProps) {
  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Sección
          <select
            className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
            value={sectionId}
            onChange={(e) => {
              const newId = e.currentTarget.value;
              setSectionId(newId);
              const sec = sections.find(s => s.id === newId);
              if (sec) setColor(sec.color); // Regla de color heredada
            }}
            required
            disabled={isEditing}
          >
            <option value="">Selecciona una sección</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
        <Input label="Título del nivel" value={title} onChange={(e: any) => setTitle(e.currentTarget.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Input label="Dificultad (1-10)" type="number" min={1} max={10} value={difficulty} onChange={(e: any) => setDifficulty(Number(e.currentTarget.value))} required />
        <Input label="Color" type="color" value={color} onChange={(e: any) => setColor(e.currentTarget.value)} required />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Plantilla
          <select
            className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
            value={templateType}
            onChange={(e: any) => setTemplateType(e.currentTarget.value)}
            required
            disabled={isEditing}
          >
            <option value="trivia">Trivia</option>
            <option value="memory">Memoria</option>
            <option value="fake_news">Fake News</option>
            <option value="word_search">Sopa de Letras</option>
            <option value="puzzle">Rompecabezas</option>
            <option value="crossword">Crucigrama</option>
            <option value="snakes_ladders">Serpientes y Escaleras</option>
          </select>
        </label>
      </div>
    </div>
  );
}
