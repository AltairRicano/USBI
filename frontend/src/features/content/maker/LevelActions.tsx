import { Button } from '../../../components/ui/Button';

export function LevelActions({ 
  onSave, onCancel, loading, isValid, isEditing 
}: { 
  onSave: () => void; 
  onCancel: () => void; 
  loading: boolean; 
  isValid: boolean;
  isEditing: boolean;
}) {
  return (
    <div className="flex gap-2 mt-6">
      <Button 
        onClick={onSave} 
        disabled={loading || !isValid} 
        className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
      >
        {isEditing ? 'Guardar Cambios' : 'Crear Nivel'}
      </Button>
      <Button variant="outline" onClick={onCancel} disabled={loading}>
        Cancelar
      </Button>
    </div>
  );
}
