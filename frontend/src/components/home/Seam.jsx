/* ============================================================================
 * Seam — the house mark, drawn as an SVG hairline.
 * "A line places, it does not enclose." The seam is HUSHAE's own signature:
 * a fine rule that draws itself into view (data-draw, driven by LuxuryEffects).
 * Inherits currentColor so it can sit on light or dark grounds.
 * ========================================================================== */

export default function Seam({ className = '' }) {
  return (
    <svg
      data-draw
      aria-hidden="true"
      className={`${className} block`}
      width="100%"
      height="2"
      viewBox="0 0 240 2"
      preserveAspectRatio="none"
      fill="none"
    >
      <path
        d="M0 1 H240"
        vectorEffect="non-scaling-stroke"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
