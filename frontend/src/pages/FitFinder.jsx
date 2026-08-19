import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ruler, Check, RotateCcw, Sparkles, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE FIT FINDER — Interactive Bespoke Luxury Fit Studio (SKIMS / CK Register)
 *
 * Features:
 *   - 4 Tactile Interactive Steps (Gender, Height, Body Frame, Fit Preference)
 *   - Smooth Animated Transitions
 *   - International Conversion Matrix (US / UK / EU)
 *   - 1-Click Direct "Shop Your Size" Filter Routing
 *   - Stores result in localStorage ('hushae.fit') for persistent PDP recommendations
 * ========================================================================== */

const QUESTIONS = [
  {
    id: 'gender',
    stepTitle: 'Step 01',
    label: 'Who are you shopping for?',
    subtitle: 'Select your department to calibrate pattern cuts & grading.',
    options: [
      {
        value: 'women',
        label: 'Women’s Collection',
        desc: 'Bras, seamless panties, bodysuits & loungewear',
        tag: 'Second Skin Studio',
      },
      {
        value: 'men',
        label: 'Men’s Collection',
        desc: 'Modal briefs, classic boxers, trunks & undershirts',
        tag: 'Engineered Precision',
      },
    ],
  },
  {
    id: 'height',
    stepTitle: 'Step 02',
    label: 'What is your height?',
    subtitle: 'Helps us calibrate torso length, rise, and waistband drop.',
    options: [
      { value: 'short', label: 'Petite / Under 5’4”', desc: 'Under 163 cm · Shorter inseam & rise' },
      { value: 'average', label: 'Standard / 5’4” – 5’8”', desc: '163 – 173 cm · Standard proportions' },
      { value: 'tall', label: 'Tall / Above 5’8”', desc: 'Above 173 cm · Extended torso & leg length' },
    ],
  },
  {
    id: 'build',
    stepTitle: 'Step 03',
    label: 'How would you describe your frame?',
    subtitle: 'Calculates hip-to-waist ratio and underband tension.',
    options: [
      { value: 'slim', label: 'Slim / Lean Frame', desc: 'Narrower ribcage and slender contours' },
      { value: 'average', label: 'Medium / Athletic Frame', desc: 'Proportional athletic structure' },
      { value: 'broad', label: 'Full / Curvy Frame', desc: 'Fuller bust, hips, or broader shoulders' },
    ],
  },
  {
    id: 'preference',
    stepTitle: 'Step 04',
    label: 'How do you prefer your pieces to feel?',
    subtitle: 'Every HUSHAE piece is engineered to move with you.',
    options: [
      {
        value: 'snug',
        label: 'Second-Skin Snug',
        desc: 'Sculpted close to the body, zero bunching under clothing',
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
    <div className="min-h-screen bg-[#FFFFFF] pt-[130px] pb-20 font-sans text-[#111111]">
      <Seo
        title="Bespoke Fit Studio — HUSHAE"
        description="Calculate your precision HUSHAE size in under 60 seconds with our interactive tailoring algorithm."
        canonical="/fit-finder"
      />

      <div className="mx-auto max-w-2xl px-6 sm:px-8">
        {/* Top Eyebrow */}
        <div className="mb-10 text-center">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.32em] text-neutral-400">
            HUSHAE ATELIER
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-light uppercase tracking-tight text-[#000000]">
            Bespoke Fit Studio
          </h1>
          <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm font-light text-neutral-600 leading-relaxed">
            No tape measure required. Four guided calibrations to determine your true second-skin size.
          </p>
        </div>

        {/* Studio Progress Bar */}
        {!result && (
          <div className="mb-10">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-neutral-400 mb-2.5">
              <span>{current.stepTitle}</span>
              <span>{step + 1} of {QUESTIONS.length}</span>
            </div>
            <div className="flex gap-1.5 h-1 w-full bg-neutral-100">
              {QUESTIONS.map((_, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 transition-all duration-400 ${
                    i <= step ? 'bg-[#000000]' : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── QUESTION CARD ──────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {!result && current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-light uppercase tracking-tight text-[#000000]">
                  {current.label}
                </h2>
                <p className="mt-1 text-xs text-neutral-500 font-light">
                  {current.subtitle}
                </p>
              </div>

              <div className="space-y-3">
                {current.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => pick(opt.value)}
                    className="group flex w-full flex-col text-left border border-neutral-200 p-5 bg-white transition-all duration-200 hover:border-black hover:shadow-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[14px] sm:text-[15px] font-medium text-[#000000] group-hover:translate-x-1 transition-transform">
                        {opt.label}
                      </span>
                      {opt.tag && (
                        <span className="text-[9.5px] uppercase font-medium tracking-widest text-neutral-400 border border-neutral-200 px-2 py-0.5">
                          {opt.tag}
                        </span>
                      )}
                    </div>
                    {opt.desc && (
                      <span className="mt-1.5 text-xs text-neutral-500 font-light leading-relaxed">
                        {opt.desc}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors pt-2"
                >
                  &larr; Previous Step
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BESPOKE RESULT SCREEN ───────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="border border-neutral-200 bg-white p-8 sm:p-12 text-center shadow-xl space-y-6"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#000000]">
                <Sparkles size={12} /> True Fit Recommendation
              </span>

              {/* Big Jet Black Size Stamp */}
              <div className="py-3">
                <div className="mx-auto flex h-24 w-24 items-center justify-center border-2 border-black bg-white shadow-sm">
                  <span className="font-serif text-4xl font-normal text-[#000000]">
                    {result.size}
                  </span>
                </div>
                <p className="mt-4 text-xl sm:text-2xl font-light text-[#000000] uppercase tracking-wide">
                  Your HUSHAE Size is {result.label || result.size}
                </p>
                <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Calibrated for {result.gender === 'women' ? "Women's" : "Men's"} innerwear and second-skin loungewear.
                </p>
              </div>

              {/* International Conversions */}
              <div className="grid grid-cols-3 gap-3 border-y border-neutral-100 py-5 max-w-xs mx-auto text-center">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400">UK / AUS</p>
                  <p className="text-base font-medium text-[#000000]">{result.uk}</p>
                </div>
                <div className="space-y-1 border-x border-neutral-100">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400">US / CAN</p>
                  <p className="text-base font-medium text-[#000000]">{result.us}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400">EU</p>
                  <p className="text-base font-medium text-[#000000]">{result.eu}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2 max-w-sm mx-auto">
                <Link
                  to={result.gender === 'women' ? '/women' : '/men'}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] transition-all hover:bg-neutral-800"
                >
                  <span>Shop In Your Size ({result.size})</span>
                  <ArrowRight size={13} />
                </Link>

                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                >
                  <RotateCcw size={11} /> Recalibrate Measurements
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
