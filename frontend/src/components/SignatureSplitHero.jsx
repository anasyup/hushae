import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
<<<<<<< ours

/**
 * SignatureSplitHero — HUSHAE's "Classic Calvins"-inspired half/half hero.
 * Left half: Women signature image with "Shop Women" CTA
 * Right half: Men signature image with "Shop Men" CTA
 * Centre overlay: brand headline + subhead
 *
 * Fully original composition — layout inspired by CK's Classic Calvins block
 * (side-by-side model shots with a single title anchoring the middle) but the
 * imagery, colours, typography and copy are all HUSHAE's own.
 */
export default function SignatureSplitHero() {
  return (
    <section className="relative w-full overflow-hidden bg-obsidian">
      {/* Two image halves */}
      <div className="grid grid-cols-2">
        <Link to="/women" className="group relative block">
          <motion.img
            src="/images/products/gemini/bra-blush-lace.png"
            alt="HUSHAE Women — signature edit"
            initial={{ scale: 1.05 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
            className="aspect-[3/4] w-full object-cover transition-transform duration-700 md:aspect-[4/5] group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian/40 via-obsidian/10 to-transparent md:from-obsidian/25" />
        </Link>
        <Link to="/men" className="group relative block">
          <motion.img
            src="/images/products/gemini/boxer-white-premium.png"
            alt="HUSHAE Men — signature edit"
            initial={{ scale: 1.05 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
            className="aspect-[3/4] w-full object-cover transition-transform duration-700 md:aspect-[4/5] group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-obsidian/40 via-obsidian/10 to-transparent md:from-obsidian/25" />
        </Link>
      </div>

      {/* Centre overlay — brand statement + dual CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-alabaster"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-alabaster/70 sm:text-[11px]">
          The Signature Edit
        </p>
        <h2 className="mt-4 font-display text-[40px] leading-[0.95] drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-6xl md:text-7xl lg:text-8xl">
          Premium,
          <br />
          perfected.
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-alabaster/80 sm:mt-5 sm:text-[15px]">
          Silk-touch fabrics. Bonded seamless edges. Discreet packaging always.
          The HUSHAE house edit, made for the pieces you'll reach for daily.
        </p>
        <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
          <Link
            to="/women"
            className="inline-flex items-center justify-center rounded-full bg-alabaster px-7 py-3 text-[11px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-white sm:px-8 sm:py-3.5 sm:text-[12px]"
          >
            Shop Women
          </Link>
          <Link
            to="/men"
            className="inline-flex items-center justify-center rounded-full border border-alabaster/50 px-7 py-3 text-[11px] font-semibold uppercase tracking-widest text-alabaster transition hover:border-alabaster hover:bg-alabaster hover:text-obsidian sm:px-8 sm:py-3.5 sm:text-[12px]"
          >
            Shop Men
          </Link>
=======
import { useApp } from '../store/AppContext';

/**
 * SignatureSplitHero — fully admin-editable half/half hero.
 * Reads its settings from `settings.signatureSplit`. Every field
 * (images, videos, copy, colours, CTAs, overlay strength) is
 * editable from Admin → Content → Signature Split Hero.
 *
 * If enabled === false the whole section renders nothing.
 */
export default function SignatureSplitHero() {
  const { settings } = useApp();
  const s = settings?.signatureSplit;

  // Safe defaults for the very first render (before settings load)
  const cfg = {
    enabled:        true,
    eyebrow:        'The Signature Edit',
    title:          'Premium,\nperfected.',
    subtitle:       'Silk-touch fabrics. Bonded seamless edges. Discreet packaging always.',
    textColor:      '#F7F5F1',
    textShadow:     true,
    titleFont:      'display',
    leftImage:      '/images/products/gemini/bra-blush-lace.png',
    leftVideo:      '',
    leftCtaLabel:   'Shop Women',
    leftCtaHref:    '/women',
    rightImage:     '/images/products/gemini/boxer-white-premium.png',
    rightVideo:     '',
    rightCtaLabel:  'Shop Men',
    rightCtaHref:   '/men',
    overlayOpacity: 25,
    ...(s || {}),
  };

  if (cfg.enabled === false) return null;

  const overlay = Math.max(0, Math.min(100, cfg.overlayOpacity)) / 100;
  const titleClass = cfg.titleFont === 'sans'
    ? 'font-sans font-semibold tracking-tight'
    : 'font-display';
  const textShadowStyle = cfg.textShadow ? { textShadow: '0 2px 20px rgba(0,0,0,0.4)' } : {};

  const Media = ({ image, video, alt }) => (
    <>
      {video ? (
        <video
          src={video}
          autoPlay muted loop playsInline preload="metadata"
          className="aspect-[3/4] w-full object-cover transition-transform duration-700 md:aspect-[4/5] group-hover:scale-[1.02]"
        />
      ) : (
        <motion.img
          src={image}
          alt={alt}
          initial={{ scale: 1.05 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
          className="aspect-[3/4] w-full object-cover transition-transform duration-700 md:aspect-[4/5] group-hover:scale-[1.02]"
        />
      )}
    </>
  );

  return (
    <section className="relative w-full overflow-hidden bg-obsidian">
      <div className="grid grid-cols-2">
        <Link to={cfg.leftCtaHref} className="group relative block">
          <Media image={cfg.leftImage} video={cfg.leftVideo} alt="HUSHAE Women — signature edit" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(17,17,17,${overlay + 0.05}), rgba(17,17,17,${overlay - 0.15}) 60%, transparent)` }} />
        </Link>
        <Link to={cfg.rightCtaHref} className="group relative block">
          <Media image={cfg.rightImage} video={cfg.rightVideo} alt="HUSHAE Men — signature edit" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to left, rgba(17,17,17,${overlay + 0.05}), rgba(17,17,17,${overlay - 0.15}) 60%, transparent)` }} />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
        style={{ color: cfg.textColor }}
      >
        {cfg.eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] sm:text-[11px]" style={{ opacity: 0.8, ...textShadowStyle }}>
            {cfg.eyebrow}
          </p>
        )}
        <h2
          className={`mt-4 whitespace-pre-line text-[40px] leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl ${titleClass}`}
          style={textShadowStyle}
        >
          {cfg.title}
        </h2>
        {cfg.subtitle && (
          <p className="mt-4 max-w-xl text-[13px] leading-relaxed sm:mt-5 sm:text-[15px]" style={{ opacity: 0.85, ...textShadowStyle }}>
            {cfg.subtitle}
          </p>
        )}
        <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-3 sm:mt-8">
          {cfg.leftCtaLabel && (
            <Link to={cfg.leftCtaHref} className="inline-flex items-center justify-center rounded-full bg-alabaster px-7 py-3 text-[11px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-white sm:px-8 sm:py-3.5 sm:text-[12px]">
              {cfg.leftCtaLabel}
            </Link>
          )}
          {cfg.rightCtaLabel && (
            <Link to={cfg.rightCtaHref} className="inline-flex items-center justify-center rounded-full border border-current px-7 py-3 text-[11px] font-semibold uppercase tracking-widest transition hover:bg-alabaster hover:text-obsidian sm:px-8 sm:py-3.5 sm:text-[12px]" style={{ borderColor: cfg.textColor + 'AA' }}>
              {cfg.rightCtaLabel}
            </Link>
          )}
>>>>>>> theirs
        </div>
      </motion.div>
    </section>
  );
}
