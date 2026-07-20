import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CrosswordSchema,
  FakeNewsSchema,
  MemorySchema,
  MultipleChoiceSchema,
  PuzzleSchema,
  SnakesSchema,
  WordSearchSchema,
} from '@usbi/schema';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../lib/apiClient';
import type { LevelDTO, LevelSummaryDTO, LevelsPageDTO, SectionDTO, SectionsResponse, TemplateType } from './types';

const emptyOptions = ['', '', '', ''];
const templateOptions: Array<{ value: TemplateType; label: string }> = [
  { value: 'trivia', label: 'Trivia' },
  { value: 'memory', label: 'Memoria' },
  { value: 'fake_news', label: 'Fake news' },
  { value: 'word_search', label: 'Sopa de letras' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'crossword', label: 'Crucigrama' },
  { value: 'snakes_ladders', label: 'Serpientes y escaleras' },
];

const triviaJSONExample = prettyJSON([
  {
    question: 'Que servicio permite localizar materiales bibliograficos?',
    options: ['Catalogo institucional', 'Sala de descanso', 'Cafeteria', 'Estacionamiento'],
    correct_index: 0,
  },
]);

const jsonExamples: Record<Exclude<TemplateType, 'trivia'>, string> = {
  memory: prettyJSON({
    pairs: [
      { id: 'catalogo', content1: 'Catalogo', content2: 'Busca libros, revistas y tesis' },
      { id: 'prestamo', content1: 'Prestamo', content2: 'Servicio para llevar materiales autorizados' },
      { id: 'hemeroteca', content1: 'Hemeroteca', content2: 'Consulta de publicaciones periodicas' },
      { id: 'referencia', content1: 'Referencia', content2: 'Apoyo para encontrar informacion confiable' },
    ],
  }),
  fake_news: prettyJSON({
    news: [
      {
        title: 'Una fuente anonima siempre es suficiente',
        content: 'La informacion academica puede citarse sin verificar autor, fecha o procedencia.',
        isFake: true,
        explanation: 'La evaluacion de fuentes exige autor, fecha, procedencia y evidencia.',
        reference: 'Guia USBI de alfabetizacion informacional',
      },
      {
        title: 'El catalogo institucional ayuda a ubicar material oficial',
        content: 'El catalogo permite localizar recursos bibliograficos disponibles en la biblioteca.',
        isFake: false,
        explanation: 'Es una herramienta oficial para busqueda y ubicacion de materiales.',
        reference: 'Servicios USBI',
      },
    ],
  }),
  word_search: prettyJSON({
    words: ['catalogo', 'prestamo', 'referencia', 'revista'],
    width: 12,
    height: 12,
    seed: 2026,
  }),
  puzzle: prettyJSON({
    imageUrl: 'https://dummyimage.com/600x600/18529d/ffffff&text=USBI',
    gridSize: 3,
    seed: 2026,
  }),
  crossword: prettyJSON({
    words: [
      { word: 'catalogo', clue: 'Herramienta para localizar materiales de biblioteca' },
      { word: 'cita', clue: 'Referencia breve a una fuente consultada' },
      { word: 'tesis', clue: 'Documento academico de investigacion' },
    ],
  }),
  snakes_ladders: prettyJSON({
    board_width: 6,
    board_height: 6,
    start_position: 1,
    end_position: 36,
    snakes: [{ start: 29, end: 13 }],
    ladders: [{ start: 4, end: 16 }],
    ai_config: { difficulty: 'EASY', fail_probability: 0.1 },
  }),
};

interface SectionEditForm {
  id: string;
  title: string;
  color: string;
}

interface LevelEditForm {
  id: string;
  title: string;
  color: string;
  difficulty: number;
  templateType: TemplateType;
  rawContent: string;
}

export function AdminContentPage() {
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [levels, setLevels] = useState<LevelSummaryDTO[]>([]);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionColor, setSectionColor] = useState('#18529D');
  const [levelSectionID, setLevelSectionID] = useState('');
  const [levelTitle, setLevelTitle] = useState('');
  const [levelColor, setLevelColor] = useState('#28AD56');
  const [templateType, setTemplateType] = useState<TemplateType>('trivia');
  const [rawContent, setRawContent] = useState(jsonExamples.memory);
  const [difficulty, setDifficulty] = useState(1);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(emptyOptions);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [editingSection, setEditingSection] = useState<SectionEditForm | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelEditForm | null>(null);
  const [loadingLevelID, setLoadingLevelID] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadContent() {
    setError(null);
    try {
      const [sectionResp, levelResp] = await Promise.all([
        apiClient.get<SectionsResponse>('/sections?include_unpublished=true'),
        apiClient.get<LevelsPageDTO>('/levels?include_unpublished=true&page_size=50'),
      ]);
      setSections(sectionResp.data.items);
      setLevels(levelResp.data.items);
      if (!levelSectionID && sectionResp.data.items[0]) {
        setLevelSectionID(sectionResp.data.items[0].id);
      }
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el contenido.'));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContent();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/sections', { title: sectionTitle, color: sectionColor });
      setSectionTitle('');
      await loadContent();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear la sección.'));
    } finally {
      setLoading(false);
    }
  }

  async function createLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const content = templateType === 'trivia'
        ? buildTriviaContent(question, options, correctIndex)
        : parseOfficialJSON(templateType, rawContent);

      await apiClient.post('/levels', {
        section_id: levelSectionID,
        title: levelTitle,
        color: levelColor,
        template_type: templateType,
        difficulty,
        content,
      });
      setLevelTitle('');
      setQuestion('');
      setOptions(emptyOptions);
      setCorrectIndex(0);
      await loadContent();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear el nivel.'));
    } finally {
      setLoading(false);
    }
  }

  async function saveSectionEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSection) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.patch(`/sections/${editingSection.id}`, {
        title: editingSection.title,
        color: editingSection.color,
      });
      setEditingSection(null);
      await loadContent();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo actualizar la sección.'));
    } finally {
      setLoading(false);
    }
  }

  async function startLevelEdit(levelID: string) {
    setLoadingLevelID(levelID);
    setError(null);
    try {
      const { data } = await apiClient.get<LevelDTO>(`/levels/${levelID}`);
      setEditingLevel({
        id: data.id,
        title: data.title,
        color: data.color,
        difficulty: data.difficulty,
        templateType: data.template_type,
        rawContent: prettyJSON(data.content),
      });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el nivel para edición.'));
    } finally {
      setLoadingLevelID(null);
    }
  }

  async function saveLevelEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLevel) return;

    setLoading(true);
    setError(null);
    try {
      const content = parseLevelEditContent(editingLevel.templateType, editingLevel.rawContent);
      await apiClient.patch(`/levels/${editingLevel.id}`, {
        title: editingLevel.title,
        color: editingLevel.color,
        template_type: editingLevel.templateType,
        difficulty: editingLevel.difficulty,
        content,
      });
      setEditingLevel(null);
      await loadContent();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo actualizar el nivel.'));
    } finally {
      setLoading(false);
    }
  }

  async function publishSection(id: string) {
    await apiClient.post(`/sections/${id}/publish`);
    await loadContent();
  }

  async function archiveSection(id: string) {
    await apiClient.post(`/sections/${id}/archive`);
    await loadContent();
  }

  async function publishLevel(id: string) {
    await apiClient.post(`/levels/${id}/publish`);
    await loadContent();
  }

  async function archiveLevel(id: string) {
    await apiClient.post(`/levels/${id}/archive`);
    await loadContent();
  }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Administración de Contenido</h1>
            <p className="text-sm text-[--color-muted]">Secciones y niveles oficiales guardados en PostgreSQL.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="outline" size="sm">
              <Link to="/maker">Maker local</Link>
            </Button>
            <Button variant="outline" size="sm">
              <Link to="/admin/arco">Resolver ARCO</Link>
            </Button>
          </div>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-white p-3 text-[--color-error]">{error}</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Nueva sección</h2>
            <form onSubmit={createSection} className="space-y-4">
              <Input label="Título de sección" value={sectionTitle} onChange={(e) => setSectionTitle(e.currentTarget.value)} required />
              <Input label="Color" type="color" value={sectionColor} onChange={(e) => setSectionColor(e.currentTarget.value)} required />
              <Button type="submit" disabled={loading}>Crear sección</Button>
            </form>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Nuevo nivel oficial</h2>
            <form onSubmit={createLevel} className="space-y-4">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Sección
                <select
                  className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
                  value={levelSectionID}
                  onChange={(e) => setLevelSectionID(e.currentTarget.value)}
                  required
                >
                  <option value="">Selecciona una sección</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>{section.title}</option>
                  ))}
                </select>
              </label>
              <Input label="Título del nivel" value={levelTitle} onChange={(e) => setLevelTitle(e.currentTarget.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Dificultad" type="number" min={1} max={10} value={difficulty} onChange={(e) => setDifficulty(Number(e.currentTarget.value))} required />
                <Input label="Color" type="color" value={levelColor} onChange={(e) => setLevelColor(e.currentTarget.value)} required />
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Plantilla
                <select
                  className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
                  value={templateType}
                  onChange={(e) => {
                    const nextTemplate = e.currentTarget.value as TemplateType;
                    setTemplateType(nextTemplate);
                    if (nextTemplate !== 'trivia') {
                      setRawContent(jsonExamples[nextTemplate]);
                    }
                  }}
                  required
                >
                  {templateOptions.map((template) => (
                    <option key={template.value} value={template.value}>{template.label}</option>
                  ))}
                </select>
              </label>

              {templateType === 'trivia' ? (
                <>
                  <Input label="Pregunta" value={question} onChange={(e) => setQuestion(e.currentTarget.value)} required />
                  {options.map((option, idx) => (
                    <div key={idx} className="flex items-end gap-2">
                      <Input
                        label={`Opción ${idx + 1}`}
                        value={option}
                        onChange={(e) => setOptions(options.map((value, optionIdx) => optionIdx === idx ? e.currentTarget.value : value))}
                        required
                      />
                      <label className="flex min-h-[44px] items-center gap-2 text-sm">
                        <input
                          type="radio"
                          checked={correctIndex === idx}
                          onChange={() => setCorrectIndex(idx)}
                        />
                        Correcta
                      </label>
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-3">
                  <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="official-content-json">
                    Contenido JSON
                    <textarea
                      id="official-content-json"
                      className="min-h-[260px] rounded-lg border border-[--color-border] bg-white p-3 font-mono text-sm"
                      value={rawContent}
                      onChange={(e) => setRawContent(e.currentTarget.value)}
                      spellCheck={false}
                      required
                    />
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRawContent(jsonExamples[templateType])}
                  >
                    Restaurar ejemplo
                  </Button>
                </div>
              )}
              <Button type="submit" disabled={loading || sections.length === 0}>Crear nivel</Button>
            </form>
          </section>
        </div>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Secciones</h2>
          {editingSection && (
            <form onSubmit={saveSectionEdit} className="mb-5 rounded-lg border border-[--color-border] p-4">
              <h3 className="mb-3 font-semibold">Editar sección</h3>
              <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
                <Input
                  id="edit-section-title"
                  label="Título de sección"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.currentTarget.value })}
                  required
                />
                <Input
                  id="edit-section-color"
                  label="Color"
                  type="color"
                  value={editingSection.color}
                  onChange={(e) => setEditingSection({ ...editingSection, color: e.currentTarget.value })}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={loading}>Guardar</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          )}
          <div className="divide-y">
            {sections.map((section) => (
              <div key={section.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{section.title}</p>
                  <p className="text-sm text-[--color-muted]">{section.is_published ? 'Publicada' : 'Borrador'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSection({ id: section.id, title: section.title, color: section.color })}
                  >
                    Editar
                  </Button>
                  {!section.is_published && <Button size="sm" onClick={() => void publishSection(section.id)}>Publicar</Button>}
                  <Button size="sm" variant="outline" onClick={() => void archiveSection(section.id)}>Archivar</Button>
                </div>
              </div>
            ))}
            {sections.length === 0 && <p className="py-4 text-sm text-[--color-muted]">No hay secciones.</p>}
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Niveles</h2>
          {editingLevel && (
            <form onSubmit={saveLevelEdit} className="mb-5 space-y-4 rounded-lg border border-[--color-border] p-4">
              <h3 className="font-semibold">Editar nivel oficial</h3>
              <Input
                id="edit-level-title"
                label="Título del nivel"
                value={editingLevel.title}
                onChange={(e) => setEditingLevel({ ...editingLevel, title: e.currentTarget.value })}
                required
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="edit-level-difficulty"
                  label="Dificultad"
                  type="number"
                  min={1}
                  max={10}
                  value={editingLevel.difficulty}
                  onChange={(e) => setEditingLevel({ ...editingLevel, difficulty: Number(e.currentTarget.value) })}
                  required
                />
                <Input
                  id="edit-level-color"
                  label="Color"
                  type="color"
                  value={editingLevel.color}
                  onChange={(e) => setEditingLevel({ ...editingLevel, color: e.currentTarget.value })}
                  required
                />
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="edit-level-template">
                Plantilla
                <select
                  id="edit-level-template"
                  className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
                  value={editingLevel.templateType}
                  onChange={(e) => {
                    const nextTemplate = e.currentTarget.value as TemplateType;
                    setEditingLevel({
                      ...editingLevel,
                      templateType: nextTemplate,
                      rawContent: getTemplateExample(nextTemplate),
                    });
                  }}
                  required
                >
                  {templateOptions.map((template) => (
                    <option key={template.value} value={template.value}>{template.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="edit-level-content-json">
                Contenido JSON
                <textarea
                  id="edit-level-content-json"
                  className="min-h-[300px] rounded-lg border border-[--color-border] bg-white p-3 font-mono text-sm"
                  value={editingLevel.rawContent}
                  onChange={(e) => setEditingLevel({ ...editingLevel, rawContent: e.currentTarget.value })}
                  spellCheck={false}
                  required
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={loading}>Guardar nivel</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditingLevel(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingLevel({ ...editingLevel, rawContent: getTemplateExample(editingLevel.templateType) })}
                >
                  Restaurar ejemplo
                </Button>
              </div>
            </form>
          )}
          <div className="divide-y">
            {levels.map((level) => (
              <div key={level.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{level.title}</p>
                  <p className="text-sm text-[--color-muted]">
                    {level.template_type} · dificultad {level.difficulty} · {level.is_published ? 'Publicado' : 'Borrador'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Link to={`/levels/${level.id}/play`}>Previsualizar</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingLevelID === level.id}
                    onClick={() => void startLevelEdit(level.id)}
                  >
                    {loadingLevelID === level.id ? 'Cargando' : 'Editar'}
                  </Button>
                  {!level.is_published && <Button size="sm" onClick={() => void publishLevel(level.id)}>Publicar</Button>}
                  <Button size="sm" variant="outline" onClick={() => void archiveLevel(level.id)}>Archivar</Button>
                </div>
              </div>
            ))}
            {levels.length === 0 && <p className="py-4 text-sm text-[--color-muted]">No hay niveles.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
    return detail ?? fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

function buildTriviaContent(question: string, options: string[], correctIndex: number) {
  const content = [{
    question: question.trim(),
    options: options.map((option) => option.trim()),
    correct_index: correctIndex,
  }];
  const result = MultipleChoiceSchema.array().min(1).safeParse(content);
  if (!result.success) {
    throw new Error('La trivia no cumple el contrato mínimo.');
  }
  return result.data;
}

function parseLevelEditContent(templateType: TemplateType, rawContent: string): unknown {
  if (templateType === 'trivia') {
    return parseTriviaJSON(rawContent);
  }
  return parseOfficialJSON(templateType, rawContent);
}

function parseTriviaJSON(rawContent: string): unknown {
  if (new Blob([rawContent]).size > 5 * 1024 * 1024) {
    throw new Error('El JSON supera el máximo de 5 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('El contenido JSON no es válido.');
  }

  const questions = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;

  if (!questions) {
    throw new Error('La trivia debe ser un arreglo de preguntas o un objeto con questions.');
  }

  const result = MultipleChoiceSchema.array().min(1).safeParse(questions);
  if (!result.success) {
    throw new Error('La trivia no cumple el contrato mínimo.');
  }

  if (Array.isArray(parsed)) {
    return result.data;
  }
  return { ...(parsed as Record<string, unknown>), questions: result.data };
}

function parseOfficialJSON(templateType: Exclude<TemplateType, 'trivia'>, rawContent: string): unknown {
  if (new Blob([rawContent]).size > 5 * 1024 * 1024) {
    throw new Error('El JSON supera el máximo de 5 MB.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('El contenido JSON no es válido.');
  }

  const result = validateTemplateContent(templateType, parsed);
  if (!result.success) {
    throw new Error(`El JSON no cumple el contrato de ${templateLabel(templateType)}.`);
  }
  return result.data;
}

function validateTemplateContent(templateType: Exclude<TemplateType, 'trivia'>, content: unknown) {
  switch (templateType) {
    case 'memory':
      return MemorySchema.safeParse(content);
    case 'fake_news':
      return FakeNewsSchema.safeParse(content);
    case 'word_search':
      return WordSearchSchema.safeParse(content);
    case 'puzzle':
      return PuzzleSchema.safeParse(content);
    case 'crossword':
      return CrosswordSchema.safeParse(content);
    case 'snakes_ladders':
      return SnakesSchema.safeParse(content);
  }
}

function templateLabel(templateType: Exclude<TemplateType, 'trivia'>): string {
  return templateOptions.find((template) => template.value === templateType)?.label ?? templateType;
}

function getTemplateExample(templateType: TemplateType): string {
  if (templateType === 'trivia') {
    return triviaJSONExample;
  }
  return jsonExamples[templateType];
}

function prettyJSON(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
