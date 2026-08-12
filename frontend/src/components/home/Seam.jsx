/* ============================================================================
 * Seam — the house mark, a fine SVG hairline.
 * "A line places, it does not enclose." A static, perfectly crisp rule that
 * inherits currentColor so it can sit on light or dark grounds. Crisp at any
 * DPI thanks to vector-effect: non-scaling-stroke.
 * ========================================================================== */

export default function Seam({ className = '' }) {
  return (
    <svg
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
