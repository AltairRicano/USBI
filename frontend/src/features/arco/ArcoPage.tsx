import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { apiClient } from '../../lib/apiClient';

type ArcoRequestType = 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion';

interface ArcoResponse {
  request_id: string;
  status: string;
  message: string;
}

interface ArcoPendingItem {
  id: string;
  requester_type: string;
  request_type: ArcoRequestType;
  status: string;
  received_at: string;
}

interface ArcoPendingList {
  items: ArcoPendingItem[];
}

export function ArcoRequestPage() {
  const [requestType, setRequestType] = useState<ArcoRequestType>('acceso');
  const [details, setDetails] = useState('');
  const [requestID, setRequestID] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const { data } = await apiClient.post<ArcoResponse>('/arco', {
        request_type: requestType,
        details: details.trim() || undefined,
      });
      setRequestID(data.request_id);
      setStatus(data.status);
      setDetails('');
    } catch (err) {
      setError(errorMessage(err, 'No se pudo registrar la solicitud ARCO.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Derechos ARCO</h1>
            <p className="text-sm text-[--color-muted]">Solicitudes sobre datos personales de la cuenta.</p>
          </div>
          <Button variant="outline" size="sm">
            <Link to="/profile">Perfil</Link>
          </Button>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-white p-3 text-[--color-error]">{error}</p>}
        {requestID && (
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Solicitud registrada</h2>
            <p className="mt-2 text-sm text-[--color-muted]">Folio: {requestID}</p>
            <p className="text-sm text-[--color-muted]">Estado: {status ?? 'pending'}</p>
          </section>
        )}

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <form onSubmit={submitRequest} className="space-y-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Tipo de solicitud
              <select
                className="min-h-[44px] rounded-lg border border-[--color-border] bg-white px-3"
                value={requestType}
                onChange={(e) => setRequestType(e.currentTarget.value as ArcoRequestType)}
                required
              >
                <option value="acceso">Acceso</option>
                <option value="rectificacion">Rectificación</option>
                <option value="cancelacion">Cancelación</option>
                <option value="oposicion">Oposición</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="arco-details">
              Detalles
              <textarea
                id="arco-details"
                className="min-h-[160px] rounded-lg border border-[--color-border] bg-white p-3 text-sm"
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.currentTarget.value)}
              />
            </label>
            <Button type="submit" disabled={loading}>
              Enviar solicitud
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

export function ArcoAdminPage() {
  const queryClient = useQueryClient();
  const [requestID, setRequestID] = useState('');
  const [approved, setApproved] = useState(true);
  const [responseSummary, setResponseSummary] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pendingQuery = useQuery({
    queryKey: ['arco-pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<ArcoPendingList>('/arco/pending?limit=50');
      return data.items;
    },
  });

  async function resolveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient.post(`/arco/${requestID.trim()}/resolve`, {
        approved,
        response_summary: responseSummary.trim(),
      });
      setMessage('Solicitud resuelta.');
      setRequestID('');
      setResponseSummary('');
      setApproved(true);
      await queryClient.invalidateQueries({ queryKey: ['arco-pending'] });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo resolver la solicitud ARCO.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Resolver ARCO</h1>
            <p className="text-sm text-[--color-muted]">Resolución administrativa por folio.</p>
          </div>
          <Button variant="outline" size="sm">
            <Link to="/admin">Admin</Link>
          </Button>
        </header>

        {error && <p className="rounded border border-[--color-error] bg-white p-3 text-[--color-error]">{error}</p>}
        {message && <p className="rounded border border-[--color-border] bg-white p-3 text-[--color-primary]">{message}</p>}

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Pendientes</h2>
            <Button variant="outline" size="sm" onClick={() => void pendingQuery.refetch()}>
              Actualizar
            </Button>
          </div>
          {pendingQuery.isError && <p className="text-sm text-[--color-error]">No se pudieron cargar las solicitudes pendientes.</p>}
          {pendingQuery.isLoading && <p className="text-sm text-[--color-muted]">Cargando solicitudes...</p>}
          <div className="divide-y">
            {(pendingQuery.data ?? []).map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left"
                onClick={() => setRequestID(item.id)}
              >
                <span>
                  <span className="block font-semibold">{item.request_type}</span>
                  <span className="block text-sm text-[--color-muted]">
                    {new Date(item.received_at).toLocaleString()} · {item.requester_type}
                  </span>
                </span>
                <span className="rounded-full border border-[--color-border] px-3 py-1 text-sm">{item.status}</span>
              </button>
            ))}
            {!pendingQuery.isLoading && (pendingQuery.data ?? []).length === 0 && (
              <p className="py-3 text-sm text-[--color-muted]">No hay solicitudes pendientes.</p>
            )}
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <form onSubmit={resolveRequest} className="space-y-4">
            <Input
              label="Folio"
              value={requestID}
              onChange={(e) => setRequestID(e.currentTarget.value)}
              required
            />
            <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.currentTarget.checked)}
              />
              Aprobada
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="arco-response-summary">
              Resumen de respuesta
              <textarea
                id="arco-response-summary"
                className="min-h-[160px] rounded-lg border border-[--color-border] bg-white p-3 text-sm"
                value={responseSummary}
                onChange={(e) => setResponseSummary(e.currentTarget.value)}
                required
              />
            </label>
            <Button type="submit" disabled={loading}>
              Resolver solicitud
            </Button>
          </form>
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
