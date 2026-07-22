import { useState, useEffect, Component, type ReactNode } from 'react';
import { levelTemplateRegistry } from './registry';
import { LevelMetadataForm } from './LevelMetadataForm';
import { LevelActions } from './LevelActions';
import { SectionDTO, TemplateType } from '../types';

interface LevelMakerFormProps {
  initialData?: any;
  sections: SectionDTO[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

// ErrorBoundary to prevent full blank screen if a sub-form crashes
class FormErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) { return { error: err.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Error al renderizar el formulario</p>
          <pre className="mt-2 text-xs whitespace-pre-wrap">{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function resolveTemplateType(data: any): TemplateType {
  // Backend sends snake_case: template_type. Local state may also store it that way.
  const raw = data?.template_type ?? data?.templateType ?? 'trivia';
  const valid: TemplateType[] = ['trivia','crossword','word_search','puzzle','fake_news','memory','snakes_ladders'];
  return valid.includes(raw as TemplateType) ? (raw as TemplateType) : 'trivia';
}

function resolveContent(data: any, registryEntry: { getDefaults: () => any }): any {
  if (!data) return registryEntry.getDefaults();
  const raw = data.content;
  if (raw === null || raw === undefined) return registryEntry.getDefaults();
  // Backend may return already-parsed object or a JSON string
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return registryEntry.getDefaults(); }
  }
  return raw;
}

function LevelMakerFormInner({ initialData, sections, onSave, onCancel }: LevelMakerFormProps) {
  const isEditing = !!initialData;
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [color, setColor] = useState(initialData?.color ?? '#28AD56');
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? 1);
  const [sectionId, setSectionId] = useState(initialData?.section_id ?? (sections[0]?.id ?? ''));
  const [templateType, setTemplateType] = useState<TemplateType>(() => resolveTemplateType(initialData));

  // If levelTemplateRegistry[templateType] is undefined for some reason, fallback to trivia to prevent crashes
  const registryEntry = levelTemplateRegistry[templateType] || levelTemplateRegistry['trivia'];
  
  const [content, setContent] = useState<any>(() => resolveContent(initialData, registryEntry));
  const [errors, setErrors] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // DEBUGGING ZOD SCHEMAS
  useEffect(() => {
    console.log("Checking all schemas in registry...");
    for (const [key, entry] of Object.entries(levelTemplateRegistry)) {
      if (!entry.schema) {
        console.error(`SCHEMA FOR ${key} IS UNDEFINED OR NULL!`);
      } else {
        try {
          console.log(`Schema for ${key}:`, entry.schema);
          entry.schema.safeParse(entry.getDefaults());
        } catch (err) {
          console.error(`ERROR parsing defaults for ${key}:`, err);
        }
      }
    }
  }, []);

  // Validate on content change
  useEffect(() => {
    const schema = registryEntry.schema;
    if (schema) {
      try {
        const result = schema.safeParse(content);
        if (!result.success) {
          setErrors(result.error.format());
        } else {
          setErrors(null);
        }
      } catch (err) {
        console.error("Zod safeParse crashed:", err);
        // Fallback to error state instead of crashing the React component
        setErrors({ _errors: ["Error interno de validación en la plantilla."] });
      }
    }
  }, [content, templateType, registryEntry]);

  // Handle template change (only in create mode) synchronously to prevent render crashes
  const handleTemplateChange = (newType: TemplateType) => {
    setTemplateType(newType);
    if (!isEditing && newType !== (initialData?.template_type || initialData?.templateType)) {
      const newEntry = levelTemplateRegistry[newType] || levelTemplateRegistry['trivia'];
      setContent(newEntry.getDefaults());
    }
  };

  const handleSave = async () => {
    if (errors || !title || !sectionId) return;
    setLoading(true);
    setSubmitError(null);
    try {
      await onSave({
        section_id: sectionId,
        title,
        color,
        difficulty,
        template_type: templateType,
        content
      });
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.response?.data?.detail || e.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const FormComponent = registryEntry.FormComponent as any;
  const PreviewComponent = registryEntry.PreviewComponent as any;

  return (
    <div className="bg-[--color-card] text-[--color-text-card] p-6 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Nivel' : 'Crear Nuevo Nivel'}</h2>
      
      <LevelMetadataForm 
        title={title} setTitle={setTitle}
        color={color} setColor={setColor}
        difficulty={difficulty} setDifficulty={setDifficulty}
        templateType={templateType} setTemplateType={handleTemplateChange}
        sectionId={sectionId} setSectionId={setSectionId}
        sections={sections} isEditing={isEditing}
      />

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Contenido del Nivel</h3>
        <button 
          onClick={() => setShowPreview(!showPreview)} 
          className="text-sm text-blue-600 underline"
        >
          {showPreview ? 'Ocultar Previsualización' : 'Mostrar Previsualización'}
        </button>
      </div>

      <FormErrorBoundary>
        {showPreview ? (
          <PreviewComponent value={content} />
        ) : (
          <FormComponent value={content} onChange={setContent} errors={errors} />
        )}
      </FormErrorBoundary>

      {errors && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded text-sm overflow-auto max-h-32">
          La configuración contiene errores y no puede guardarse. Revisa los campos.
        </div>
      )}
      {submitError && (
        <div className="mt-4 p-3 bg-red-500 text-white rounded text-sm overflow-auto max-h-32">
          Error del servidor: {submitError}
        </div>
      )}

      <LevelActions 
        onSave={handleSave} 
        onCancel={onCancel} 
        loading={loading} 
        isValid={!errors && !!title && !!sectionId} 
        isEditing={isEditing}
      />
    </div>
  );
}

export function LevelMakerForm(props: LevelMakerFormProps) {
  return (
    <FormErrorBoundary>
      <LevelMakerFormInner {...props} />
    </FormErrorBoundary>
  );
}
