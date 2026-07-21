import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

// ── Local form schema ────────────────────────────────────────────────────────
// The MakerPage uses a single unified form that owns both metadata and content.
// On export, this is validated and written to disk as a USBI Level JSON.

const MakerFormSchema = z.object({
  metadata: z.object({
    id: z.string(), // relaxed from uuid to string to avoid parse errors with fallback
    title: z.string().min(1, 'El título es requerido'),
    author: z.string().min(1, 'El autor es requerido'),
    creation_date: z.string(),
    color: z.string().min(1),
    difficulty: z.number().int().min(1).max(10),
    template_type: z.literal('trivia'),
  }),
  // Content fields are optional at form level — validated manually in onExport.
  questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()).length(4),
    correct_index: z.number().int().min(0).max(3),
  })).optional(),
});

type MakerForm = z.infer<typeof MakerFormSchema>;

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substr(2, 9);
};

// ── Main component ───────────────────────────────────────────────────────────

export const MakerPage = () => {
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { control, handleSubmit, register, watch, formState: { errors } } = useForm<MakerForm>({
    resolver: zodResolver(MakerFormSchema),
    defaultValues: {
      metadata: {
        id: generateId(),
        title: '',
        author: '',
        creation_date: new Date().toISOString(),
        color: '#18529D',
        difficulty: 1,
        template_type: 'trivia',
      },
      questions: [{ question: '', options: ['', '', '', ''], correct_index: 0 }],
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedTemplate = watch('metadata.template_type');

  const questionsField = useFieldArray({ control, name: 'questions' });

  const onExport = async (data: MakerForm) => {
    setExportStatus('idle');

    const content = (data.questions ?? []).filter(q => q.question && q.options.every(Boolean));
    if (content.length === 0) {
      setExportStatus('error');
      return;
    }

    const levelExport = { metadata: data.metadata, content };
    const jsonStr = JSON.stringify(levelExport, null, 2);
    const fileName = `${data.metadata.title.replace(/\s+/g, '_')}.json`;

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
      }
    } catch (e) {
      console.error(e);
      setExportStatus('error');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <header>
        <h1 className="text-3xl font-bold text-[#18529D]">Maker — Creación de Niveles</h1>
        <p className="text-sm text-gray-500 mt-1">
          El nivel se exporta como archivo JSON a tu computadora. No se envía a ningún servidor.
        </p>
      </header>

      <form onSubmit={handleSubmit(onExport)} className="space-y-6">

        {/* ── Metadata ──────────────────────────────────────────────────── */}
        <fieldset className="border rounded-lg p-4 space-y-4">
          <legend className="text-sm font-semibold text-[#18529D] px-1">Metadatos del Nivel</legend>

          <div className="space-y-1">
            <label htmlFor="maker-title" className="block text-sm font-medium">Título</label>
            <Controller
              name="metadata.title"
              control={control}
              render={({ field }) => (
                <input id="maker-title" {...field} className="w-full p-2 border rounded" placeholder="Ej: Capitales de América" />
              )}
            />
            {errors.metadata?.title && <p className="text-red-500 text-xs">{errors.metadata.title.message}</p>}
          </div>

          <div className="space-y-1">
            <label htmlFor="maker-author" className="block text-sm font-medium">Autor</label>
            <Controller
              name="metadata.author"
              control={control}
              render={({ field }) => (
                <input id="maker-author" {...field} className="w-full p-2 border rounded" placeholder="Tu nombre o alias" />
              )}
            />
            {errors.metadata?.author && <p className="text-red-500 text-xs">{errors.metadata.author.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="maker-difficulty" className="block text-sm font-medium">Dificultad (1–10)</label>
              <Controller
                name="metadata.difficulty"
                control={control}
                render={({ field }) => (
                  <input id="maker-difficulty" type="number" min="1" max="10" {...field}
                    onChange={e => field.onChange(parseInt(e.target.value, 10))}
                    className="w-full p-2 border rounded" />
                )}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="maker-color" className="block text-sm font-medium">Color del nivel</label>
              <Controller
                name="metadata.color"
                control={control}
                render={({ field }) => (
                  <input id="maker-color" type="color" {...field} className="w-full h-10 p-1 border rounded cursor-pointer" />
                )}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="maker-template" className="block text-sm font-medium">Tipo de Plantilla</label>
            <Controller
              name="metadata.template_type"
              control={control}
              render={({ field }) => (
                <select id="maker-template" {...field} className="w-full p-2 border rounded bg-[--color-card]">
                  <option value="trivia">Trivia</option>
                </select>
              )}
            />
          </div>
        </fieldset>

        {/* ── Dynamic content ───────────────────────────────────────────── */}
        <fieldset className="border rounded-lg p-4 space-y-3">
          <legend className="text-sm font-semibold text-[#18529D] px-1">Contenido del Nivel</legend>

          {selectedTemplate === 'trivia' && (
            <div className="space-y-3">
              {questionsField.fields.map((field, idx) => (
                <div key={field.id} className="border rounded p-3 space-y-2 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#18529D]">Pregunta {idx + 1}</span>
                    {questionsField.fields.length > 1 && (
                      <button type="button" onClick={() => questionsField.remove(idx)} className="text-red-500 text-xs hover:underline">
                        Eliminar
                      </button>
                    )}
                  </div>
                  <label htmlFor={`mc-q-${idx}`} className="block text-xs font-medium">Enunciado</label>
                  <input id={`mc-q-${idx}`} {...register(`questions.${idx}.question`)}
                    className="w-full p-2 border rounded text-sm" placeholder="¿Cuál es...?" />
                  <p className="text-xs font-medium mt-1">Opciones (marca la correcta)</p>
                  {[0, 1, 2, 3].map((optIdx) => (
                    <div key={optIdx} className="flex gap-2 items-center">
                      <Controller
                        control={control}
                        name={`questions.${idx}.correct_index`}
                        render={({ field: rf }) => (
                          <input type="radio" id={`mc-r-${idx}-${optIdx}`}
                            checked={rf.value === optIdx} onChange={() => rf.onChange(optIdx)}
                            aria-label={`Marcar opción ${optIdx + 1} como correcta`}
                            className="accent-[#28AD56]" />
                        )}
                      />
                      <input {...register(`questions.${idx}.options.${optIdx}`)}
                        className="flex-1 p-1 border rounded text-sm" placeholder={`Opción ${optIdx + 1}`} />
                    </div>
                  ))}
                </div>
              ))}
              <button type="button"
                onClick={() => questionsField.append({ question: '', options: ['', '', '', ''], correct_index: 0 })}
                className="text-sm text-[#18529D] hover:underline">
                + Añadir pregunta
              </button>
            </div>
          )}
        </fieldset>

        {/* ── Status & Submit ───────────────────────────────────────────── */}
        {exportStatus === 'success' && (
          <p className="text-[#28AD56] font-medium text-sm">✓ Nivel exportado exitosamente.</p>
        )}
        {exportStatus === 'error' && (
          <p className="text-red-600 font-medium text-sm">✗ Error al exportar. Asegúrate de haber añadido contenido.</p>
        )}

        <button type="submit"
          className="bg-[#28AD56] text-white px-6 py-2 rounded font-medium hover:opacity-90 transition-opacity">
          Exportar a Local
        </button>
      </form>
    </div>
  );
};
