import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminContentPage } from './AdminContentPage';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('AdminContentPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders sections and levels', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/sections')) {
        return Promise.resolve({ data: { items: [{ id: 'sec-1', title: 'Sección 1', color: '#ff0000', is_published: true }] } });
      }
      if (url.includes('/levels')) {
        return Promise.resolve({ data: { items: [{ id: 'lvl-1', title: 'Nivel 1', difficulty: 1, color: '#00ff00', template_type: 'trivia', is_published: false }] } });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });

    render(
      <BrowserRouter>
        <AdminContentPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Administración de Contenido')).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Sección 1').length).toBeGreaterThan(0);
      expect(screen.getByText('Nivel 1')).toBeDefined();
    });
  });

  it('can edit a level', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url.includes('/sections')) {
        return Promise.resolve({ data: { items: [] } });
      }
      if (url === '/levels/lvl-1') {
        return Promise.resolve({ data: { id: 'lvl-1', title: 'Nivel 1', color: '#00ff00', difficulty: 1, template_type: 'trivia', content: [{ question: 'Q?', options: ['1','2','3','4'], correct_index: 0 }] } });
      }
      if (url.includes('/levels')) {
        return Promise.resolve({ data: { items: [{ id: 'lvl-1', title: 'Nivel 1', difficulty: 1, color: '#00ff00', template_type: 'trivia', is_published: false }] } });
      }
      return Promise.resolve({ data: { items: [] } });
    });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });

    render(
      <BrowserRouter>
        <AdminContentPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nivel 1')).toBeDefined();
    });

    // Click edit
    fireEvent.click(screen.getByText('Editar'));

    await waitFor(() => {
      expect(screen.getByLabelText('Título del nivel')).toBeDefined();
    });

    const titleInput = screen.getAllByLabelText('Título del nivel')[1];
    fireEvent.change(titleInput, { target: { value: 'Nivel 1 Editado' } });

    fireEvent.click(screen.getByText('Guardar nivel'));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith('/levels/lvl-1', expect.objectContaining({
        title: 'Nivel 1 Editado'
      }));
    });
  });
});
