import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MakerPage } from './MakerPage';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn().mockResolvedValue('/mock/path/level.json'),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

describe('MakerPage', () => {
  it('renders the metadata form with correct labels', () => {
    render(<MakerPage />);

    expect(screen.getByText('Maker — Creación de Niveles')).toBeDefined();
    expect(screen.getByLabelText('Título')).toBeDefined();
    expect(screen.getByLabelText('Autor')).toBeDefined();
    expect(screen.getByLabelText('Dificultad (1–10)')).toBeDefined();
    expect(screen.getByLabelText('Tipo de Plantilla')).toBeDefined();
    expect(screen.getByRole('button', { name: /Exportar a Local/i })).toBeDefined();
  });

  it('shows Zod validation errors when submitting empty metadata', async () => {
    render(<MakerPage />);

    // Clear the title field specifically — title has min(1) in schema.
    const titleInput = screen.getByLabelText('Título');
    fireEvent.change(titleInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Exportar a Local/i }));

    await waitFor(() => {
      expect(screen.getByText('El título es requerido')).toBeDefined();
    });
  });

  it('renders Trivia sub-editor by default', () => {
    render(<MakerPage />);
    expect(screen.getByPlaceholderText('¿Cuál es...?')).toBeDefined();
  });

  it('exports successfully when form is filled correctly', async () => {
    render(<MakerPage />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mi Nivel de Prueba' } });
    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: 'Profe UV' } });

    fireEvent.change(screen.getByPlaceholderText('¿Cuál es...?'), {
      target: { value: '¿Capital de México?' },
    });
    fireEvent.change(screen.getByPlaceholderText('Opción 1'), { target: { value: 'Ciudad de México' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 2'), { target: { value: 'Guadalajara' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 3'), { target: { value: 'Monterrey' } });
    fireEvent.change(screen.getByPlaceholderText('Opción 4'), { target: { value: 'Puebla' } });

    fireEvent.click(screen.getByRole('button', { name: /Exportar a Local/i }));

    await waitFor(() => {
      expect(screen.getByText(/✓ Nivel exportado exitosamente/i)).toBeDefined();
    });
  });
});
