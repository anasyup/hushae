import { useEffect, useState } from 'react';

/* ============================================================================
 * CustomerTestimonial — single voice, treatment like an editorial pull quote.
 *
 * WHY IT IS HERE
 *
 * A testimonial on a luxury homepage is not social proof — it is mood
 * setting. One correct voice beats five quotes. We use a single carefully
 * composed line and rotate approved quotes slowly; no name, no photo, no
 * star rating, no review platform badge. The voice belongs to a customer
 * who happens to have written in.
 *
 * DESIGN
 *
 * Centered, full-bleed section with a long-form quote set at H3 size. The
 * attribution sits below in a small tracked caps line. White background,
 * black ink — no background swatch, no decorative frame, no badge. The
 * section feels like a pause between product grids — the reader lands here,
 * breathes, and continues. */

const VOICES = [
  {
    quote:
      'I bought one set to test the quality. Six weeks later I cancelled two other subscriptions and ordered three more. The fit, the fabric, the discretion — everything about it is considered.',
    name: 'A. Q.',
    city: 'Lahore',
  },
  {
    quote:
      'The packaging arrived at my office unmarked. Inside, every detail was deliberate — the cotton drawstring, the care card, the confidence of the fit. I know what I will be recommending at brunch.',
    name: 'M. S.',
    city: 'Karachi',
  },
  {
    quote:
      'Most innerwear either treats you like a wardrobe problem or a billboard. HUSHAE treats it like a piece of clothing — which is exactly the standard the rest of the store has held for decades.',
    name: 'S. R.',
    city: 'Islamabad',
  },
];

export default function CustomerTestimonial() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % VOICES.length), 8000);
    return () => clearInterval(t);
  }, []);
  const v = VOICES[i];

  return (
    <section className="border-b border-[#e5e5e5] bg-white py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-[920px] px-6 text-center">
        {/* Open-quote mark — thin, decorative only */}
        <div
          aria-hidden="true"
          className="font-display text-[64px] font-light leading-[0.5] text-black md:text-[96px]"
        >
          &ldquo;
        </div>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="mt-2 font-display text-[22px] font-light leading-[1.4] tracking-[0.005em] text-black md:text-[34px] md:leading-[1.35] md:tracking-[0] lg:text-[38px]"
        >
          {v.quote}
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500 md:mt-10 md:text-[11px]">
          <span className="h-px w-8 bg-neutral-300 md:w-10" aria-hidden="true" />
          <span>{v.name} — {v.city}</span>
          <span className="h-px w-8 bg-neutral-300 md:w-10" aria-hidden="true" />
        </div>

        {/* Voice indicators — minimal hairline pips */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {VOICES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Read testimonial ${idx + 1}`}
              aria-current={idx === i}
              className={`h-px w-6 transition-all duration-300 md:w-8 ${
                idx === i ? 'bg-black' : 'bg-neutral-300 hover:bg-neutral-500'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}