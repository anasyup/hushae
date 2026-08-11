/* ============================================================================
 * Category Hero Banner — exact client reference ("Hushae - Category Hero
 * Banner"). Pasted directly under the main navigation header on listing pages.
 *   · full-bleed, 380px (280px ≤768), #f4f0eb fallback
 *   · image object-cover, object-position center 30%
 *   · left-to-right dark gradient overlay (0.45 → 0.2 → 0)
 *   · content: tag (11px/500, ls 2px, uppercase) · title (42px/300, ls -0.5px,
 *     uppercase, lh 1.1) · description (13px, lh 1.6, #f0f0f0, max-w 420)
 * ========================================================================== */

export default function CategoryBanner({ img, tag, title, description }) {
  return (
    <section className="relative mb-5 flex h-[280px] w-full items-center overflow-hidden bg-[#f4f0eb] md:h-[380px]">
      {img && (
        <img
          src={img}
          alt={title}
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
      )}
      {/* Subtle left fade for text contrast */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)' }}
        aria-hidden="true"
      />
      <div className="relative z-[2] max-w-[600px] px-6 md:pl-[60px] md:pr-10">
        {tag && (
          <p className="mb-[10px] text-[11px] font-medium uppercase tracking-[2px] text-white opacity-90">{tag}</p>
        )}
        <h1 className="mb-3 text-[28px] font-light uppercase leading-[1.1] tracking-[-0.5px] text-white md:text-[42px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-[420px] text-[12px] font-normal leading-[1.6] text-[#f0f0f0] md:text-[13px]">{description}</p>
        )}
      </div>
    </section>
  );
}
