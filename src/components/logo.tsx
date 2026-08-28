/**
 * Bildmarke von Unbindall.
 *
 * Ein Zug ohne Absetzen: die Linie läuft aus, kehrt um und schließt sich zur
 * Schleife, ohne je den Kreis zu vollenden — die Geste hinter dem Befehl, der
 * jeder Autoexec vorausgeht: erst alles lösen, dann sauber neu belegen.
 *
 * Die Kontur übernimmt `currentColor`. Im Produkt sitzt sie in `.brand-symbol`
 * und erbt dort `--on-brand` auf der orangefarbenen Kachel; dadurch trägt das
 * Zeichen auf hellem wie dunklem Untergrund, ohne dass eine zweite Fassung
 * gepflegt werden muss.
 *
 * Gezeichnet ist der Pfad auf einem 35×38-Raster. `MARK_TRANSFORM` rechnet ihn
 * mittig auf das 64er-Raster und füllt dort 81 % der Fläche — dasselbe Maß, das
 * die Marke in `.brand-symbol` auf 72 % der Kachel bringt. `src/app/icon.svg`
 * und die gerenderten PNGs halten dieselben 72 %; wird der Pfad getauscht,
 * müssen sie über `scripts/render-icons.mjs` neu erzeugt werden.
 */

/** Der Zug, wie gezeichnet: 35×38, Konturstärke 5, runde Enden. */
export const MARK =
  "M14.2082 2.50011C14.2082 2.50011 31.5 24.5001 32 25.0001C32.5 25.5001 7.20823 8.50011 7.20823 8.50011C3.5 6.50011 2.5 17.3075 2.5 20.9551C2.5 24.6027 3.949 28.1009 6.52823 30.6801C9.10746 33.2593 12.6056 34.7083 16.2532 34.7083C19.9008 34.7083 6 17.0001 9.5 19.0001L26.7082 30.0001";

/** Vom Zeichenraster mittig auf das 64er-Raster; die Marke füllt 81 % davon. */
export const MARK_TRANSFORM = "translate(7.82 6) scale(1.3975)";

export function Logo({
  size = 34,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <g transform={MARK_TRANSFORM}>
        <path d={MARK} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      </g>
    </svg>
  );
}
