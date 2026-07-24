import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { levelTemplateRegistry } from '../content/maker/registry';
import type { TemplateType } from '../content/types';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substr(2, 9);
};

export const MakerPage = () => {
  const navigate = useNavigate();
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [metadata, setMetadata] = useState({
    id: generateId(),
    title: '',
    author: '',
    color: '#18529D',
    difficulty: 1,
    template_type: 'trivia' as TemplateType,
  });

  const [content, setContent] = useState<any>(() => levelTemplateRegistry['trivia'].getDefaults());
  const [errors, setErrors] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const schema = levelTemplateRegistry[metadata.template_type]?.schema;
    if (schema) {
      try {
        const result = schema.safeParse(content);
        if (!result.success) {
          setErrors(result.error.format());
        } else {
          setErrors(null);
        }
      } catch (err) {
        setErrors({ _errors: ["Error interno de validación en la plantilla."] });
      }
    }
  }, [content, metadata.template_type]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TemplateType;
    setMetadata({ ...metadata, template_type: newType });
    const registryEntry = levelTemplateRegistry[newType] || levelTemplateRegistry['trivia'];
    setContent(registryEntry.getDefaults());
  };

  const saveLocal = () => {
    if (errors || !metadata.title) {
      setExportStatus('error');
      return;
    }
    
    try {
      const levelExport = { metadata: { ...metadata, creation_date: new Date().toISOString() }, content };
      const stored = localStorage.getItem('usbi_local_levels');
      const levels = stored ? JSON.parse(stored) : [];
      
      const existingIdx = levels.findIndex((l: any) => l.metadata.id === metadata.id);
      if (existingIdx >= 0) {
        levels[existingIdx] = levelExport;
      } else {
        levels.push(levelExport);
      }
      localStorage.setItem('usbi_local_levels', JSON.stringify(levels));
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setExportStatus('error');
    }
  };

  const onExport = async () => {
    setExportStatus('idle');

    if (errors || !metadata.title) {
      setExportStatus('error');
      return;
    }

    const levelExport = { metadata: { ...metadata, creation_date: new Date().toISOString() }, content };
    const jsonStr = JSON.stringify(levelExport, null, 2);
    const fileName = `${metadata.title.replace(/\s+/g, '_') || 'nivel_usbi'}.json`;

    try {
      // Intentar usar Tauri si está disponible
      if (window.__TAURI__) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        
        const filePath = await save({
          defaultPath: fileName,
          filters: [{ name: 'USBI Level', extensions: ['json'] }],
        });

        if (filePath) {
          await writeTextFile(filePath, jsonStr);
          setExportStatus('success');
          setTimeout(() => setExportStatus('idle'), 3000);
        }
      } else {
        // Fallback para navegador web puro (Vite)
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    } catch (e) {
      console.error(e);
      setExportStatus('error');
    }
  };

  const registryEntry = levelTemplateRegistry[metadata.template_type] || levelTemplateRegistry['trivia'];
  const FormComponent = registryEntry.FormComponent as any;
  const PreviewComponent = registryEntry.PreviewComponent as any;

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <header className="relative flex flex-col items-center justify-center text-center">
        <button 
          type="button" 
          onClick={() => navigate(-1)} 
          className="absolute left-0 top-2 hover:underline flex items-center gap-1 text-sm font-medium text-[--color-primary]"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-[--color-primary]">Maker Local — Creación de Niveles</h1>
        <p className="text-sm text-[--color-muted] mt-1">
          Crea niveles de prueba. Puedes guardarlos en tu navegador (Crear) o exportarlos como archivo JSON a tu computadora (Exportar).
        </p>
      </header>

      <div className="space-y-6 bg-[--color-surface] text-[--color-foreground] border border-[--color-border] p-6 rounded-lg shadow-sm">
        {/* ── Metadata ──────────────────────────────────────────────────── */}
        <fieldset className="border border-[--color-border] rounded-lg p-4 space-y-4">
          <legend className="text-sm font-semibold px-1 text-[--color-primary]">Metadatos del Nivel</legend>

          <div className="space-y-1">
            <label htmlFor="maker-title" className="block text-sm font-medium">Título</label>
            <input 
              id="maker-title" 
              value={metadata.title}
              onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
              className="w-full p-2 border border-[--color-border] bg-[--color-surface] text-[--color-foreground] rounded focus:outline-none focus:ring-2 focus:ring-[--color-primary]" 
              placeholder="Ej: Capitales de América" 
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="maker-author" className="block text-sm font-medium">Autor</label>
            <input 
              id="maker-author" 
              value={metadata.author}
              onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
              className="w-full p-2 border border-[--color-border] bg-[--color-surface] text-[--color-foreground] rounded focus:outline-none focus:ring-2 focus:ring-[--color-primary]" 
              placeholder="Tu nombre o alias" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="maker-difficulty" className="block text-sm font-medium">Dificultad (1–10)</label>
              <input 
                id="maker-difficulty" 
                type="number" 
                min="1" max="10" 
                value={metadata.difficulty}
                onChange={(e) => setMetadata({ ...metadata, difficulty: parseInt(e.target.value, 10) || 1 })}
                className="w-full p-2 border border-[--color-border] bg-[--color-surface] text-[--color-foreground] rounded focus:outline-none focus:ring-2 focus:ring-[--color-primary]" 
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="maker-color" className="block text-sm font-medium">Color del nivel</label>
              <input 
                id="maker-color" 
                type="color" 
                value={metadata.color}
                onChange={(e) => setMetadata({ ...metadata, color: e.target.value })}
                className="w-full h-10 p-1 border border-[--color-border] bg-[--color-surface] rounded cursor-pointer" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="maker-template" className="block text-sm font-medium">Tipo de Plantilla</label>
            <select 
              id="maker-template" 
              value={metadata.template_type}
              onChange={handleTemplateChange}
              className="w-full p-2 border border-[--color-border] rounded bg-[--color-surface] text-[--color-foreground] focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
            >
              <option value="trivia">Trivia</option>
              <option value="crossword">Crucigrama</option>
              <option value="word_search">Sopa de Letras</option>
              <option value="puzzle">Rompecabezas</option>
              <option value="fake_news">Detector de Fake News (Arco)</option>
              <option value="memory">Memorama</option>
              <option value="snakes_ladders">Serpientes y Escaleras</option>
            </select>
          </div>
        </fieldset>

        {/* ── Dynamic content ───────────────────────────────────────────── */}
        <fieldset className="border border-[--color-border] rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center mb-4">
            <legend className="text-sm font-semibold px-1 text-[--color-primary]">Contenido del Nivel</legend>
            <button 
              type="button"
              onClick={() => setShowPreview(!showPreview)} 
              className="text-sm hover:underline cursor-pointer text-[--color-primary]"
            >
              {showPreview ? 'Ocultar Previsualización' : 'Mostrar Previsualización'}
            </button>
          </div>

          <div className="min-h-[200px]">
            {showPreview ? (
              <PreviewComponent value={content} />
            ) : (
              <FormComponent value={content} onChange={setContent} errors={errors} />
            )}
          </div>
        </fieldset>

        {/* ── Status & Submit ───────────────────────────────────────────── */}
        {exportStatus === 'success' && (
          <p className="text-green-600 dark:text-green-400 font-medium text-sm">✓ Operación realizada exitosamente.</p>
        )}
        {exportStatus === 'error' && (
          <p className="text-red-600 dark:text-red-400 font-medium text-sm">✗ Error. Revisa que el título no esté vacío y que no haya errores de validación en el contenido.</p>
        )}
        {errors && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded text-sm overflow-auto max-h-32">
            La configuración del nivel contiene errores (revisa los campos).
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button 
            type="button"
            onClick={saveLocal}
            className="flex-1 bg-[--color-primary] text-white px-6 py-3 rounded font-medium hover:bg-[--color-primary-hover] transition-colors"
          >
            Crear (Guardar en Local)
          </button>
          
          <button 
            type="button"
            onClick={onExport}
            className="flex-1 bg-[#28AD56] text-white px-6 py-3 rounded font-medium hover:bg-[#208a44] transition-colors"
          >
            Exportar (Descargar JSON)
          </button>
        </div>
      </div>
    </div>
  );
};
