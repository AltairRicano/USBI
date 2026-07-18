# Fase 5 y 6: Juegos y Creador de Niveles

> [!WARNING]
> **Gestión de Memoria Crítica:** En esta fase, el manejo de memoria (especialmente con Phaser) es fundamental para evitar crashes y memory leaks en el frontend (Tauri). Limpia y destruye siempre las instancias al desmontar los componentes.

## 1. Plantillas de Minijuegos (React Puro)

- [ ] Implementa `TriviaGame.tsx` en `src/features/games/components/`.
- [ ] Renderiza una tarjeta central blanca con texto oscuro y botones `primary`.
- [ ] Maneja los estados `currentQuestion`, `score` y `timeLeft`.
- [ ] Desarrolla `FakeNewsGame.tsx` en `src/features/games/components/`.
- [ ] Integra la librería `framer-motion` para crear una animación de swipe (estilo Tinder) con botones "VERDADERO" y "FALSO".
- [ ] Construye `MemoryGame.tsx` utilizando animaciones CSS puras con `transform: rotateY(180deg)` y `perspective: 1000px`.
- [ ] Gestiona el estado de `flippedCards` y `matchedPairs`.

## 2. Plantillas Complejas (Phaser 3) y Algoritmos de Generación

- [ ] Crea las escenas de juego en `src/features/games/phaser/`: `WordSearchScene.ts` (Sopa de letras), `PuzzleScene.ts` (Rompecabezas), `CrosswordScene.ts` (Crucigrama) y `SnakesLaddersScene.ts` (Serpientes y Escaleras).
- [ ] Implementa el algoritmo de **Backtracking** para la generación procedural de la cuadrícula del Crucigrama basado en el array de palabras provisto.
- [ ] Implementa el algoritmo de **Shuffling Espacial** para el Rompecabezas, asegurando que cada corte (slice) se mezcle de manera resolvible (solvability check) y rastreable.
- [ ] Implementa el algoritmo de **Intersección Lineal Aleatoria** para inyectar palabras horizontal, vertical y diagonalmente en la Sopa de Letras.
- [ ] Desarrolla la **Lógica de Inteligencia Artificial** para el Oponente en Serpientes y Escaleras utilizando un modelo de Probabilidad Ponderada (Weighted Random). La IA debe simular aciertos/errores en preguntas con una probabilidad de acierto del 60%, variando el peso si está cerca de ganar para dar un sentido de progresión natural y no invencible. **Específicamente: Aumenta la probabilidad de fallo al 80% cuando la IA está en las últimas 10 casillas.**
- [ ] Destruye explícitamente la instancia del juego en el ciclo de vida de React para evitar memory leaks.
- [ ] Utiliza el siguiente boilerplate crítico en todos tus componentes contenedores de juegos usando `@phaserjs/react` para prevenir memory leaks y manejar eventos:

```tsx
import { useRef, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from '@phaserjs/react';
import { MinigameScene } from './MinigameScene';

export const PhaserGameContainer = () => {
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    const handleWin = (data: { score: number }) => {
      console.log("Victoria del jugador. Score:", data.score);
    };

    if (phaserRef.current) {
      phaserRef.current.scene?.events.on('GAME_WIN', handleWin);
    }
    
    return () => {
      // @phaserjs/react maneja internamente game.destroy(true)
      if (phaserRef.current?.scene) {
          phaserRef.current.scene.events.off('GAME_WIN', handleWin);
      }
    };
  }, []);

  return (
    <PhaserGame
      ref={phaserRef}
      config={{
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        scene: [MinigameScene]
      }}
    />
  );
};
```

## 3. Creador de Niveles (Módulo Admin / Maker)

> [!CAUTION]
> **RESTRICCIÓN LEGAL Y ARQUITECTÓNICA:** El servidor (Backend Go / PostgreSQL) **NUNCA** aloja, procesa ni almacena los archivos JSON generados por la comunidad en el modo Maker. El Creador de Niveles exporta los JSON *exclusivamente* al sistema de archivos local del usuario mediante Tauri IPC. Los niveles oficiales de la USBI sí se guardan en la DB mediante endpoints estándar.

- [ ] Diseña el formulario de creación de niveles en `/admin/maker` con `react-hook-form`.
- [ ] Valida estrictamente la configuración del nivel utilizando Zod para asegurar la integridad de la estructura de datos.
- [ ] Emplea el siguiente esquema JSON de validación:

```typescript
import { z } from 'zod';

export const LevelDataSchema = z.object({
  template_type: z.enum(['TRIVIA', 'FAKE_NEWS', 'MEMORY', 'WORD_SEARCH', 'PUZZLE', 'CROSSWORD', 'SNAKES']),
  questions: z.array(
    z.object({
      question: z.string().min(5).max(200),
      options: z.array(z.string().min(1).max(100)).min(2).max(4),
      correctIndex: z.number().int().min(0).max(3),
      imageUrl: z.string().url().optional()
    })
  ).min(1).max(20).optional(),
});

export type LevelData = z.infer<typeof LevelDataSchema>;
```

- [ ] Verifica que los archivos `nivel_custom.json` subidos en el modo Maker (comunidad offline) no superen los 5MB para prevenir memory overloads.
- [ ] Rechaza el archivo de inmediato si falla o tiene campos no reconocidos.
- [ ] Guarda exportaciones de niveles comunitarios en formato local utilizando Tauri (`@tauri-apps/plugin-dialog` y `@tauri-apps/plugin-fs`).
- [ ] Envía la información al Backend (PostgreSQL) usando el siguiente contrato API (JSON) para niveles oficiales:

```json
// POST /api/v1/levels
{
  "title": "Nivel de Prueba 1",
  "section_id": "uuid-de-la-seccion",
  "template_type": "TRIVIA",
  "difficulty": 5,
  "color": "#FF5733",
  "is_published": true,
  "created_by_admin_id": "uuid-del-creador",
  "content": {
    "questions": [
      {
        "question": "¿Cuál es la capital de Veracruz?",
        "options": ["Xalapa", "Veracruz", "Córdoba", "Orizaba"],
        "correctIndex": 0
      }
    ]
  }
}
```

- [ ] Inserta el nuevo nivel en la base de datos del Backend (PostgreSQL) ejecutando la siguiente query de escritura crítica:

```sql
INSERT INTO levels (title, section_id, template_type, difficulty, color, is_published, created_by_admin_id, content, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING id;
```

## 4. Finalización de Juego y Cálculo XP

- [ ] Implementa el hook `useGameCompletion(score, maxScore, levelId)`.
- [ ] Renderiza un modal brillante de "Nivel Completado" detallando estrellas obtenidas (0 a 3) y la XP ganada, siguiendo el diseño gráfico de la USBI.
- [ ] Evalúa la conectividad de la aplicación de Tauri.
- [ ] Registra cada intento en la tabla `level_attempts` para aplicar la regla RF15: otorga 100% de XP en el primer intento, 50% en los 2 siguientes (segundo y tercer intento), y 0% después del tercer intento.
- [ ] Guarda el progreso de la partida en el Frontend Tauri (Base de datos SQLite local) de forma offline utilizando la tabla `local_player_progress` y respetando `xp_total_for_level`:

```sql
-- Insertar el intento a nivel local
-- Nota: xp_awarded se guarda temporalmente en SQLite como referencia visual, 
-- pero el backend es la fuente de la verdad para el progreso total real.
INSERT INTO local_level_attempts (id, user_id, level_id, completed, xp_awarded, attempt_number, attempt_date) 
VALUES ($1, $2, $3, $4, 0, $5, CURRENT_TIMESTAMP);

-- Actualiza o inserta el progreso a nivel local
-- Respetando el uso de xp_total_for_level e incluyendo user_id
INSERT INTO local_player_progress (id, user_id, level_id, best_score, xp_total_for_level, synced)
VALUES ($1, $2, $3, $4, $5, 0)
ON CONFLICT(user_id, level_id) DO UPDATE 
SET best_score = MAX(local_player_progress.best_score, EXCLUDED.best_score), 
    xp_total_for_level = local_player_progress.xp_total_for_level + EXCLUDED.xp_total_for_level, 
    synced = 0;

-- El frontend encola el evento en `sync_events` con `payload` JSON estricto.
-- [ ] OBLIGATORIO: El JSON `payload` debe incluir ÚNICAMENTE:
--   - `attempt_id` (Generado vía UUIDv7 en frontend)
--   - `history_id` (Generado vía UUIDv7 en frontend)
--   - `level_id` (UUID del nivel)
--   - `best_score` (Integer)
--   - `attempt_number` (Integer)
--   - `completed` (Boolean)
--   - `attempt_date` (CURRENT_DATE)
-- La `xp_awarded` se calcula EN EL SERVIDOR por motivos de seguridad.
```

- [ ] Registra la finalización de la partida en el Backend (PostgreSQL) si hay conexión a internet, ejecutando las siguientes queries reales (`level_attempts`, `experience_history` y `player_progress`).
- [ ] Asegúrate de que al insertar en `experience_history`, el campo `source` sea `'online'` o `'offline_sync'` y el `verification_method` sea `'online_direct'` o `'hmac_offline'`.

```sql
-- Registra el intento en la tabla level_attempts para la regla RF15 (id debe ser UUIDv7 generado en la capa de negocio)
INSERT INTO level_attempts (id, user_id, level_id, completed, xp_awarded, attempt_number, attempt_date)
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE);

-- Registra el historial de experiencia obtenida
INSERT INTO experience_history (id, user_id, level_id, event_type, xp_gained, source, verification_method, sync_event_id, created_at)
VALUES ($1, $2, $3, 'LEVEL_COMPLETED', $4, 'online', 'online_direct', $5, CURRENT_TIMESTAMP);

-- Guarda (Upsert) el progreso máximo del jugador en el nivel respetando xp_total_for_level y actualizando attempts_count
INSERT INTO player_progress (user_id, level_id, best_score, xp_total_for_level, attempts_count, first_completed_at, last_completed_at)
VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (user_id, level_id) 
DO UPDATE SET 
    best_score = GREATEST(player_progress.best_score, EXCLUDED.best_score),
    xp_total_for_level = player_progress.xp_total_for_level + EXCLUDED.xp_total_for_level,
    attempts_count = player_progress.attempts_count + 1,
    last_completed_at = CURRENT_TIMESTAMP;
```
