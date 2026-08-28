/**
 * Bildmarke von Unbindall.
 *
 * Ein aufgebrochener Ring, aus dem ein Glied gesprungen ist — die Geste hinter
 * dem Befehl, der jeder Autoexec vorausgeht: erst alles lösen, dann sauber neu
 * belegen.
 *
 * Die Platte übernimmt `currentColor`, das gelöste Glied bleibt immer im
 * Markenorange. Dadurch trägt das Zeichen auf hellem wie dunklem Untergrund,
 * ohne dass eine zweite Fassung gepflegt werden muss.
 *
 * Die Pfade sind auf ein 64er-Raster gerechnet; Ring und Glied halten überall
 * mindestens drei Rastereinheiten Abstand, damit die Form bis 16 px trägt.
 */

/** Platte mit ausgestanztem Ring — eine Fläche, `evenodd` schneidet das Loch. */
const PLATE =
  "M22 6H42A16 16 0 0 1 58 22V42A16 16 0 0 1 42 58H22A16 16 0 0 1 6 42V22A16 16 0 0 1 22 6Z" +
  "M49.36 26.36A18.25 18.25 0 1 1 37.64 14.64A3.25 3.25 0 0 1 35.63 20.83A11.75 11.75 0 1 0 43.17 28.37A3.25 3.25 0 0 1 49.36 26.36Z";

/** Das gelöste Glied, auf einer Bahn außerhalb des Rings. */
const FRAGMENT = "M46.11 12.58A24 24 0 0 1 51.42 17.89";

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
      <path d={PLATE} fill="currentColor" fillRule="evenodd" />
      <path
        d={FRAGMENT}
        fill="none"
        stroke="var(--brand, #e48717)"
        strokeWidth={5.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
