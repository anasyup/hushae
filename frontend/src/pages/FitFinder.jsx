import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE FIT FINDER — Minimalist Atelier Fit Studio (Pure, Airy & Borderless)
 *
 * No heavy boxes, no cluttered borders, no oversized elements.
 * Pure editorial typography, refined line dividers, and high-fashion grace.
 * ========================================================================== */

const QUESTIONS = [
  {
    id: 'gender',
    stepNumber: '01',
    label: 'Who are you shopping for?',
    subtitle: 'Select department for pattern grading.',
    options: [
      {
        value: 'women',
        label: 'Women’s Collection',
        desc: 'Bras, seamless panties & silk-touch loungewear',
      },
      {
        value: 'men',
        label: 'Men’s Collection',
        desc: 'Modal briefs, boxers, trunks & ribbed undershirts',
      },
    ],
  },
  {
    id: 'height',
    stepNumber: '02',
    label: 'What is your height?',
    subtitle: 'Calibrates rise and torso proportions.',
    options: [
      { value: 'short', label: 'Petite / Under 5’4”', desc: 'Under 163 cm · Shorter inseam & rise' },
      { value: 'average', label: 'Standard / 5’4” – 5’8”', desc: '163 – 173 cm · Standard proportions' },
      { value: 'tall', label: 'Tall / Above 5’8”', desc: 'Above 173 cm · Extended rise & leg length' },
    ],
  },
  {
    id: 'build',
    stepNumber: '03',
    label: 'How would you describe your frame?',
    subtitle: 'Calculates waistband tension and ease.',
    options: [
      { value: 'slim', label: 'Slim / Lean Frame', desc: 'Slender contours & narrower ribcage' },
      { value: 'average', label: 'Medium / Athletic Frame', desc: 'Proportional athletic structure' },
      { value: 'broad', label: 'Full / Curvy Frame', desc: 'Fuller bust, hips, or broader shoulders' },
    ],
  },
  {
    id: 'preference',
    stepNumber: '04',
    label: 'How do you prefer your pieces to feel?',
    subtitle: 'Select your preferred everyday hold.',
    options: [
      {
        value: 'snug',
        label: 'Second-Skin Snug',
        desc: 'Close to the body, zero bunching under clothing',
      },
      {
        value: 'regular',
        label: 'Tailored Regular',
        desc: 'Comfortable everyday hold with natural breathing room',
      },
      {
        value: 'relaxed',
        label: 'Relaxed Lounge',
        desc: 'Slightly looser drape for easy lounging and sleep',
      },
    ],
  },
];

const SIZE_MAP = {
  women: {
    'short-slim-snug': { size: 'XS', us: 2, uk: 6, eu: 32, label: 'Extra Small' },
    'short-slim-regular': { size: 'S', us: 4, uk: 8, eu: 34, label: 'Small' },
    'short-slim-relaxed': { size: 'S', us: 4, uk: 8, eu: 34, label: 'Small' },
    'short-average-snug': { size: 'S', us: 4, uk: 8, eu: 34, label: 'Small' },
    'short-average-regular': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'short-average-relaxed': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'short-broad-snug': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'short-broad-regular': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'short-broad-relaxed': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'average-slim-snug': { size: 'S', us: 4, uk: 8, eu: 34, label: 'Small' },
    'average-slim-regular': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'average-slim-relaxed': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'average-average-snug': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'average-average-regular': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'average-average-relaxed': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'average-broad-snug': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'average-broad-regular': { size: 'XL', us: 10, uk: 14, eu: 40, label: 'Extra Large' },
    'average-broad-relaxed': { size: 'XL', us: 10, uk: 14, eu: 40, label: 'Extra Large' },
    'tall-slim-snug': { size: 'S', us: 4, uk: 8, eu: 34, label: 'Small' },
    'tall-slim-regular': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'tall-slim-relaxed': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'tall-average-snug': { size: 'M', us: 6, uk: 10, eu: 36, label: 'Medium' },
    'tall-average-regular': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'tall-average-relaxed': { size: 'XL', us: 10, uk: 14, eu: 40, label: 'Extra Large' },
    'tall-broad-snug': { size: 'L', us: 8, uk: 12, eu: 38, label: 'Large' },
    'tall-broad-regular': { size: 'XL', us: 10, uk: 14, eu: 40, label: 'Extra Large' },
    'tall-broad-relaxed': { size: 'XXL', us: 12, uk: 16, eu: 42, label: '2X Large' },
  },
  men: {
    'short-slim-snug': { size: 'S', us: '30', uk: '30', eu: '46', label: 'Small (30")' },
    'short-slim-regular': { size: 'M', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-slim-relaxed': { size: 'M', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-average-snug': { size: 'M', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-average-regular': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-average-relaxed': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-broad-snug': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-broad-regular': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'short-broad-relaxed': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-slim-snug': { size: 'M', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'average-slim-regular': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-slim-relaxed': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-average-snug': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-average-regular': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-average-relaxed': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-broad-snug': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-broad-regular': { size: 'XXL', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'average-broad-relaxed': { size: 'XXL', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-slim-snug': { size: 'M', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'tall-slim-regular': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-slim-relaxed': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-average-snug': { size: 'L', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-average-regular': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'tall-average-relaxed': { size: 'XXL', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-broad-snug': { size: 'XL', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'tall-broad-regular': { size: 'XXL', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-broad-relaxed': { size: '3XL', us: '40', uk: '40', eu: '56', label: '3X Large (40")' },
  },
};

function loadResult() {
  try {
    return JSON.parse(localStorage.getItem('hushae.fit') || 'null');
  } catch {
    return null;
  }
}

function saveResult(r) {
  try {
    localStorage.setItem('hushae.fit', JSON.stringify(r));
    window.dispatchEvent(new Event('hushae:fit-updated'));
  } catch {}
}

export default function FitFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(loadResult);

  const current = QUESTIONS[step];

  const pick = (value) => {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const key = `${next.height}-${next.build}-${next.preference}`;
      const genderMap = SIZE_MAP[next.gender] || SIZE_MAP.women;
      const fit = genderMap[key] || genderMap['average-average-regular'];
      const full = { ...fit, gender: next.gender, key };
      setResult(full);
      saveResult(full);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    try {
      localStorage.removeItem('hushae.fit');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[140px] pb-24 font-sans text-[#111111]">
      <Seo
        title="Fit Guide — HUSHAE"
        description="Find your precision HUSHAE size in four quiet steps."
        canonical="/fit-finder"
      />

      <div className="mx-auto max-w-xl px-6 sm:px-8">
        {/* Subtle Header */}
        <div className="mb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            HUSHAE FIT GUIDE
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-[0.14em] text-[#000000]">
            Find Your Size
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-xs text-neutral-500 font-light leading-relaxed">
            Four guided steps to determine your true second-skin fit.
          </p>
        </div>

        {/* Minimal Progress Indicator */}
        {!result && (
          <div className="mb-8 flex items-center justify-between border-b border-neutral-100 pb-3 text-[11px] font-medium tracking-[0.2em] text-neutral-400 uppercase">
            <span>Step {current.stepNumber}</span>
            <span>{step + 1} of {QUESTIONS.length}</span>
          </div>
        )}

        {/* ── QUESTION STEP (Pure, Borderless Minimalist List) ───────────── */}
        <AnimatePresence mode="wait">
          {!result && current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-normal text-[#000000] tracking-tight">
                  {current.label}
                </h2>
                <p className="mt-1 text-xs text-neutral-400 font-light">
                  {current.subtitle}
                </p>
              </div>

              <div className="divide-y divide-neutral-100 border-y border-neutral-100">
                {current.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => pick(opt.value)}
                    className="group flex w-full items-center justify-between py-4 text-left transition-colors hover:pl-1.5"
                  >
                    <div>
                      <span className="text-[13.5px] sm:text-[14px] font-normal text-[#000000] group-hover:text-neutral-500 transition-colors">
                        {opt.label}
                      </span>
                      {opt.desc && (
                        <span className="block text-[11px] text-neutral-400 font-light mt-0.5">
                          {opt.desc}
                        </span>
                      )}
                    </div>
                    <span className="text-neutral-300 group-hover:text-black transition-colors pl-4">
                      &rarr;
                    </span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors pt-2"
                >
                  &larr; Back
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MINIMAL RESULT DISPLAY (Pure Typography, No Clunky Boxes) ───── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-8 pt-4"
            >
              <div>
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
                  RECOMMENDED FIT
                </span>
                <p className="mt-4 font-serif text-6xl md:text-7xl font-normal text-[#000000] tracking-tight">
                  {result.size}
                </p>
                <p className="mt-2 text-sm font-normal text-neutral-600">
                  {result.label || result.size}
                </p>
              </div>

              {/* Minimal Conversion Baseline */}
              <div className="flex items-center justify-center gap-8 text-[12px] border-y border-neutral-100 py-4 text-neutral-500">
                <span>UK {result.uk}</span>
                <span className="text-neutral-200">/</span>
                <span>US {result.us}</span>
                <span className="text-neutral-200">/</span>
                <span>EU {result.eu}</span>
              </div>

              <div className="space-y-4 max-w-xs mx-auto">
                <Link
                  to={result.gender === 'women' ? '/women' : '/men'}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] transition-opacity hover:opacity-80"
                >
                  <span>Shop {result.gender === 'women' ? "Women's" : "Men's"} ({result.size})</span>
                  <ArrowRight size={13} />
                </Link>

                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                >
                  <RotateCcw size={11} /> Retake Guide
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
