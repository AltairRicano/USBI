import { cn } from '../../lib/utils';

/**
 * Emblema institucional USBI.
 *
 * Marca neutral (glifo de libro/biblioteca en una placa azul UV) para dar
 * presencia institucional a las pantallas de acceso. NO reproduce el escudo
 * oficial de la Universidad Veracruzana ni presenta el sistema como una marca
 * independiente — es un identificador tipográfico simple dentro de la zona
 * institucional (decisión C9).
 *
 * El glifo usa `--color-primary-foreground` (blanco en claro, oscuro en modo
 * oscuro) sobre `--color-primary`, de modo que mantiene contraste AA en ambos
 * temas — la misma razón por la que existe ese token (ver audit C3).
 */
export function UsbiEmblem({
  size = 56,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="USBI, Universidad Veracruzana"
      className={cn('inline-flex items-center justify-center rounded-2xl shadow-sm', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--color-primary)',
        color: 'var(--color-primary-foreground)',
      }}
    >
      <svg
        width={Math.round(size * 0.54)}
        height={Math.round(size * 0.54)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </svg>
    </span>
  );
}

/**
 * Indicador de carga en línea, accesible.
 *
 * Es decorativo (`aria-hidden`): el estado real se comunica con el texto del
 * botón y `aria-busy`. Bajo `prefers-reduced-motion` / html.reduce-motion la
 * regla global neutraliza la animación y queda un anillo estático — el texto
 * sigue transmitiendo el estado, así que no se pierde información.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-5 w-5 shrink-0 animate-spin rounded-full',
        'border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}
