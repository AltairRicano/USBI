import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';

export function FakeNewsForm({ value, onChange }: { value: any, onChange: (val: any) => void, errors?: any }) {
  const news = value.news || [];
  
  const addNews = () => onChange({ ...value, news: [...news, { title: '', content: '', isFake: false, reference: '' }] });
  const removeNews = (idx: number) => onChange({ ...value, news: news.filter((_: any, i: number) => i !== idx) });
  const updateNews = (idx: number, updates: any) => {
    const next = [...news];
    next[idx] = { ...next[idx], ...updates };
    onChange({ ...value, news: next });
  };

  return (
    <div className="space-y-6">
      {news.map((n: any, idx: number) => (
        <div key={idx} className="p-4 border border-gray-200 rounded relative space-y-3">
          {news.length > 1 && <button onClick={() => removeNews(idx)} className="absolute top-2 right-2 text-red-500 text-sm">Eliminar</button>}
          
          <div className="flex items-center gap-4 mb-2">
             <span className="font-semibold">Noticia {idx + 1}</span>
             <label className="flex items-center gap-2 cursor-pointer bg-gray-100 p-2 rounded">
               <input type="checkbox" checked={n.isFake} onChange={(e: any) => updateNews(idx, { isFake: e.target.checked })} />
               {n.isFake ? <span className="text-red-600 font-bold">Falsa (Fake News)</span> : <span className="text-green-600 font-bold">Verdadera (Real)</span>}
             </label>
          </div>

          <Input label="Título" value={n.title} onChange={(e: any) => updateNews(idx, { title: e.target.value })} required />
          
          <label className="flex flex-col gap-1 text-sm font-medium">
            Contenido
            <textarea className="border border-gray-300 rounded p-2" rows={3} value={n.content} onChange={(e: any) => updateNews(idx, { content: e.target.value })} required />
          </label>
          
          <Input label="Referencia / Fuente (Obligatorio)" value={n.reference} onChange={(e: any) => updateNews(idx, { reference: e.target.value })} required />
          
          <Input label="Explicación (Opcional)" value={n.explanation || ''} onChange={(e: any) => updateNews(idx, { explanation: e.target.value })} />
          <Input label="URL de Imagen (Opcional)" type="url" value={n.imageUrl || ''} onChange={(e: any) => updateNews(idx, { imageUrl: e.target.value })} />
        </div>
      ))}
      <Button variant="outline" onClick={addNews}>+ Agregar Noticia</Button>
    </div>
  );
}
