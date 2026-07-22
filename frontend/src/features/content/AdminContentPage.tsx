import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../lib/apiClient';
import type { LevelDTO, LevelSummaryDTO, LevelsPageDTO, SectionDTO, SectionsResponse } from './types';
import { LevelMakerForm } from './maker/LevelMakerForm';

interface SectionEditForm {
  id: string;
  title: string;
  description: string;
  color: string;
}

export function AdminContentPage() {
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [levels, setLevels] = useState<LevelSummaryDTO[]>([]);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionColor, setSectionColor] = useState('#18529D');
  const [editingSection, setEditingSection] = useState<SectionEditForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showMaker, setShowMaker] = useState(false);
  const [makerInitialData, setMakerInitialData] = useState<any>(null);
  const [loadingLevelID, setLoadingLevelID] = useState<string | null>(null);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const levelsBySection = useMemo(() => {
    const groups: Record<string, LevelSummaryDTO[]> = {};
    for (const lvl of levels) {
      if (!groups[lvl.section_id]) groups[lvl.section_id] = [];
      groups[lvl.section_id].push(lvl);
    }
    return groups;
  }, [levels]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function loadContent() {
    setError(null);
    try {
      const [sectionResp, levelResp] = await Promise.all([
        apiClient.get<SectionsResponse>('/sections?include_unpublished=true'),
        apiClient.get<LevelsPageDTO>('/levels?include_unpublished=true&page_size=50'),
      ]);
      setSections(sectionResp.data.items);
      setLevels(levelResp.data.items);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el contenido.'));
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/sections', { title: sectionTitle, description: sectionDescription, color: sectionColor });
      setSectionTitle('');
      setSectionDescription('');
      await loadContent();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo crear la sección.'));
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
        description: editingSection.description,
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
      setMakerInitialData({
        id: data.id,
        section_id: data.section_id,
        title: data.title,
        color: data.color,
        difficulty: data.difficulty,
        templateType: data.template_type,
        content: data.content,
      });
      setShowMaker(true);
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar el nivel para edición.'));
    } finally {
      setLoadingLevelID(null);
    }
  }

  async function handleMakerSave(data: any) {
    try {
      if (makerInitialData) {
        await apiClient.patch(`/levels/${makerInitialData.id}`, data);
      } else {
        await apiClient.post('/levels', data);
      }
      setShowMaker(false);
      setMakerInitialData(null);
      await loadContent();
    } catch (err: any) {
      setError(errorMessage(err, 'No se pudo guardar el nivel.'));
      throw err;
    }
  }

  async function publishSection(id: string) { await apiClient.post(`/sections/${id}/publish`); await loadContent(); }
  async function archiveSection(id: string) { await apiClient.post(`/sections/${id}/archive`); await loadContent(); }
  async function publishLevel(id: string) { await apiClient.post(`/levels/${id}/publish`); await loadContent(); }
  async function unpublishSection(id: string) { await apiClient.post(`/sections/${id}/unpublish`); await loadContent(); }
  async function unpublishLevel(id: string) { await apiClient.post(`/levels/${id}/unpublish`); await loadContent(); }
  async function archiveLevel(id: string) { await apiClient.post(`/levels/${id}/archive`); await loadContent(); }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Administración de Contenido</h1>
            <p className="text-sm text-[--color-muted]">Secciones y niveles oficiales.</p>
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

        {error && <p className="rounded border border-[--color-error] bg-[--color-card] p-3 text-[--color-error]">{error}</p>}

        {showMaker ? (
          <LevelMakerForm 
            sections={sections}
            initialData={makerInitialData}
            onSave={handleMakerSave}
            onCancel={() => {
              setShowMaker(false);
              setMakerInitialData(null);
            }}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Nueva sección</h2>
              <form onSubmit={createSection} className="space-y-4">
                <Input label="Título de sección" value={sectionTitle} onChange={(e) => setSectionTitle(e.currentTarget.value)} required />
                <Input label="Descripción (opcional)" value={sectionDescription} onChange={(e) => setSectionDescription(e.currentTarget.value)} />
                <Input label="Color" type="color" value={sectionColor} onChange={(e) => setSectionColor(e.currentTarget.value)} required />
                <Button type="submit" disabled={loading} className="bg-[#22c55e] hover:bg-[#16a34a] text-white w-full">Crear sección</Button>
              </form>
            </section>

            <section className="rounded-lg bg-[--color-card] p-5 shadow-sm flex flex-col justify-center items-center">
              <h2 className="mb-4 text-xl font-semibold">Nuevo Nivel Oficial</h2>
              <p className="text-sm text-gray-500 mb-4 text-center">Usa el editor visual para configurar niveles con validación completa.</p>
              <Button onClick={() => setShowMaker(true)} className="bg-[#18529D] text-white">Abrir Creador de Niveles</Button>
            </section>
          </div>
        )}

        {!showMaker && (
          <section className="rounded-lg bg-[--color-card] p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Secciones y Niveles</h2>
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
                    id="edit-section-description"
                    label="Descripción"
                    value={editingSection.description}
                    onChange={(e) => setEditingSection({ ...editingSection, description: e.currentTarget.value })}
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
              {sections.map((section) => {
                const sectionLevels = levelsBySection[section.id] || [];
                const isExpanded = expandedSections[section.id];
                return (
                  <div key={section.id} className="py-3">
                    <div 
                      className="flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded transition-colors"
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[--color-muted] w-5 text-center text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <div>
                          <p className="font-semibold">{section.title} <span className="text-xs font-normal text-[--color-muted] bg-[--color-surface] px-2 py-0.5 rounded-full ml-2 border border-[--color-border]">{sectionLevels.length} niveles</span></p>
                          <p className="text-sm text-[--color-muted]">{section.description || 'Sin descripción'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSection({ id: section.id, title: section.title, description: section.description, color: section.color })}
                        >
                          Editar
                        </Button>
                        {!section.is_published && <Button size="sm" onClick={() => void publishSection(section.id)}>Publicar</Button>}
                        {section.is_published && <Button size="sm" variant="outline" onClick={() => void unpublishSection(section.id)}>Ocultar</Button>}
                        <Button size="sm" variant="outline" onClick={() => void archiveSection(section.id)}>Archivar</Button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pl-6 pr-2 border-l-2 border-[--color-border] ml-4 bg-[--color-surface]/30 rounded-r-lg">
                        <div className="divide-y divide-dashed border-t border-[--color-border] mt-2">
                          {sectionLevels.map((level) => (
                            <div key={level.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                              <div>
                                <p className="font-medium text-sm">{level.title}</p>
                                <p className="text-xs text-[--color-muted]">
                                  {level.template_type} · dificultad {level.difficulty} · {level.is_published ? 'Publicado' : 'Borrador'}
                                </p>
                              </div>
                              <div className="flex gap-2 items-center">
                                <Button size="sm" variant="outline" className="h-8 px-2 text-xs flex items-center justify-center">
                                  <Link to={`/levels/${level.id}/play`} className="flex items-center h-full">Previsualizar</Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-xs"
                                  disabled={loadingLevelID === level.id}
                                  onClick={() => void startLevelEdit(level.id)}
                                >
                                  {loadingLevelID === level.id ? 'Cargando' : 'Editar'}
                                </Button>
                                {!level.is_published && <Button size="sm" className="h-8 px-2 text-xs bg-[#22c55e] hover:bg-[#16a34a] text-white" onClick={() => void publishLevel(level.id)}>Publicar</Button>}
                                {level.is_published && <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => void unpublishLevel(level.id)}>Ocultar</Button>}
                                <Button size="sm" variant="outline" className="h-8 px-2 text-xs border-[--color-error] text-[--color-error] hover:bg-[--color-error] hover:text-white" onClick={() => void archiveLevel(level.id)}>Archivar</Button>
                              </div>
                            </div>
                          ))}
                          {sectionLevels.length === 0 && <p className="py-3 text-sm text-[--color-muted]">No hay niveles en esta sección.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sections.length === 0 && <p className="py-4 text-sm text-[--color-muted]">No hay secciones.</p>}
            </div>
          </section>
        )}
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
