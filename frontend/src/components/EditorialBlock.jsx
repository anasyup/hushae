import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { pictureSources } from '../lib/responsiveImage';

/**
 * EditorialBlock — HUSHAE's own magazine-style storefront block.
 * Inspired by editorial fashion sites (CK / Everlane / Skims style) but with
 * a discreet, warm-neutral HUSHAE voice.
 *
 * Props:
 *  - eyebrow   : small caps label above the headline
 *  - title     : big serif headline (multiline supported, use \n)
 *  - subtitle  : one-line body copy
 *  - image     : hero image src for the block
 *  - ctas      : [{ label, to }] up to 2 buttons
 *  - imageSide : 'left' | 'right' — alternates the split
 *  - overlay   : boolean — dark overlay + text on image (full-bleed style)
 *  - tall      : boolean — make the media taller (for hero blocks)
 */
export default function EditorialBlock({
  eyebrow,
  title,
  subtitle,
  image,
  ctas = [],
  imageSide = 'left',
  overlay = false,
  tall = false,
}) {
  const media = (
    <div className={`relative overflow-hidden ${tall ? 'aspect-[4/5] md:aspect-[3/4]' : 'aspect-[4/5] md:aspect-[5/6]'} w-full`}>
      {/* The side-by-side branch. MEASURED: this one was missed on the first
          pass because it is a motion.img in a different code path from the
          full-bleed branch below — the home page renders it three times with
          150 KB JPEGs. `contents` keeps <picture> out of the layout so the
          absolute positioning still resolves against the sized parent. */}
      <picture className="contents">
        {pictureSources(image).map((so) => (
          <source key={so.type} type={so.type} srcSet={so.srcSet} sizes="(max-width: 768px) 100vw, 50vw" />
        ))}
        <motion.img
          src={image}
          alt={title}
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="lazy"
          decoding="async"
          initial={{ scale: 1.02 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      {overlay && <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/10 to-transparent" />}
    </div>
  );

  const copy = (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7 }}
      className="flex h-full flex-col justify-center px-6 py-14 md:px-14 md:py-24"
    >
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">{eyebrow}</p>
      )}
      <h2 className="mt-3 whitespace-pre-line font-display text-4xl leading-[1.05] text-obsidian md:text-5xl lg:text-6xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ash">{subtitle}</p>
      )}
      {ctas.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          {ctas.map((c, i) => (
            <Link
              key={c.label}
              to={c.to}
              className={
                i === 0
                  ? 'inline-flex items-center gap-2 rounded-full bg-obsidian px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-alabaster transition hover:bg-obsidian/85'
                  : 'inline-flex items-center gap-2 rounded-full border border-obsidian/25 px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-obsidian transition hover:border-obsidian hover:bg-obsidian hover:text-alabaster'
              }
            >
              {c.label} {i === 0 && <ArrowRight size={14} />}
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );

  // Overlay variant — text sits on top of full-bleed image
  if (overlay) {
    return (
      <section className="relative w-full">
        <div className={`relative w-full overflow-hidden ${tall ? 'min-h-[70vh]' : 'min-h-[60vh]'} bg-obsidian`}>
          <picture className="contents">
            {pictureSources(image).map((so) => (
              <source key={so.type} type={so.type} srcSet={so.srcSet} sizes="100vw" />
            ))}
            <img src={image} alt={title} sizes="100vw" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/30 to-transparent" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 mx-auto flex min-h-[60vh] max-w-6xl flex-col justify-end px-6 pb-14 pt-24 md:px-12 md:pb-20"
          >
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-alabaster/70">{eyebrow}</p>
            )}
            <h2 className="mt-3 whitespace-pre-line font-display text-4xl leading-[1.05] text-alabaster md:text-6xl lg:text-7xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-alabaster/80">{subtitle}</p>
            )}
            {ctas.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {ctas.map((c, i) => (
                  <Link
                    key={c.label}
                    to={c.to}
                    className={
                      i === 0
                        ? 'inline-flex items-center gap-2 rounded-full bg-alabaster px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-obsidian transition hover:bg-white'
                        : 'inline-flex items-center gap-2 rounded-full border border-alabaster/40 px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-alabaster transition hover:border-alabaster hover:bg-alabaster hover:text-obsidian'
                    }
                  >
                    {c.label} {i === 0 && <ArrowRight size={14} />}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    );
  }

  // Split variant — half image, half copy, alternating
  return (
    <section className="w-full">
      <div className={`grid gap-0 md:grid-cols-2 ${imageSide === 'right' ? 'md:[&>:first-child]:order-2' : ''}`}>
        {media}
        <div className="bg-cream">{copy}</div>
      </div>
    </section>
  );
}
