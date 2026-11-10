/**
 * Decorative inverter illustration layered behind the engineer photo inside
 * the card banners. It is purely decorative, so it is hidden from assistive
 * technology and never intercepts clicks.
 *
 * The artwork is scaled to the banner height and anchored to the bottom-right
 * corner, so it always bleeds out of the card instead of being letterboxed.
 */
export function InverterBackdrop({
  src,
  opacity = 0.35,
  className = "",
}: {
  /** Image URL of the inverter illustration. */
  src: string;
  /** Layer opacity — keep it low so the photo and pills stay readable. */
  opacity?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: "auto 100%",
        backgroundPosition: "right bottom",
        backgroundRepeat: "no-repeat",
        opacity,
      }}
    />
  );
}
