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

  it('renders Flashcards sub-editor by default', () => {
    render(<MakerPage />);
    // The Flashcards editor shows a field for "Pregunta / Frente"
    expect(screen.getByPlaceholderText('¿Cuál es la capital de México?')).toBeDefined();
  });

  it('switches sub-editor when template type changes', async () => {
    render(<MakerPage />);

    const templateSelect = screen.getByLabelText('Tipo de Plantilla');
    fireEvent.change(templateSelect, { target: { value: 'multiple_choice' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('¿Cuál es...?')).toBeDefined();
    });
  });

  it('exports successfully when form is filled correctly', async () => {
    render(<MakerPage />);

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Mi Nivel de Prueba' } });
    fireEvent.change(screen.getByLabelText('Autor'), { target: { value: 'Profe UV' } });

    // Fill the flashcard sub-form (default template is flashcards)
    fireEvent.change(screen.getByPlaceholderText('¿Cuál es la capital de México?'), {
      target: { value: '¿Capital de México?' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ciudad de México'), {
      target: { value: 'Ciudad de México' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Exportar a Local/i }));

    await waitFor(() => {
      expect(screen.getByText(/✓ Nivel exportado exitosamente/i)).toBeDefined();
    });
  });
});
