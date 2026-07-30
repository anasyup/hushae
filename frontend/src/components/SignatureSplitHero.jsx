import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    leftImage:      '/images/products/gemini/hero-women-bra.png',
    leftVideo:      '',
    leftCtaLabel:   'Shop Women',
    leftCtaHref:    '/women',
    rightImage:     '/images/products/gemini/hero-men-boxer.png',
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
          autoPlay muted loop playsInline preload="none"
          aria-hidden="true"
          className="aspect-[3/4] w-full object-cover transition-transform duration-media md:aspect-[4/5] group-hover:scale-[1.02]"
        />
      ) : (
        <motion.img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          initial={{ scale: 1.05 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }}
          className="aspect-[3/4] w-full object-cover transition-transform duration-media md:aspect-[4/5] group-hover:scale-[1.02]"
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
            <Link to={cfg.rightCtaHref} className="inline-flex items-center justify-center rounded-full border border-current px-7 py-3 text-[11px] font-semibold uppercase tracking-widest transition hover:bg-alabaster hover:text-obsidian sm:px-8 sm:py-3.5 sm:text-[12px]" style={{ borderColor: (cfg.textColor || '#F7F5F1') + 'AA' }}>
              {cfg.rightCtaLabel}
            </Link>
          )}
        </div>
      </motion.div>
    </section>
  );
}
