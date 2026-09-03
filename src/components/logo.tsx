/** Schlichte U-Bildmarke von Unbindall. */
export const MARK =
  "M15.5 9.5V35.5C15.5 46 22.9 54.5 32 54.5S48.5 46 48.5 35.5V9.5";

export const MARK_STROKE_WIDTH = 7;

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
      <path
        d={MARK}
        fill="none"
        stroke="currentColor"
        strokeWidth={MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
