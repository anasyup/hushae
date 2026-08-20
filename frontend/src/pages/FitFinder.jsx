import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, RotateCcw, ShieldCheck, Ruler, CheckCircle2,
  Sparkles, HelpCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE FIT STUDIO — Luxury Flagship Sizing & Fit Directory (SKIMS / CK Standard)
 * ========================================================================== */

const TABS = [
  { id: 'calculator', label: 'Fit Calculator' },
  { id: 'women', label: "Women's Size Charts" },
  { id: 'men', label: "Men's Size Charts" },
  { id: 'measure', label: 'How to Measure' },
];

const QUESTIONS = [
  {
    id: 'gender',
    stepNumber: '01',
    label: 'Who are you shopping for?',
    subtitle: 'Select department for pattern grading.',
    options: [
      {
        value: 'women',
        label: "Women's Collection",
        desc: 'Bras, seamless panties & silk-touch loungewear',
      },
      {
        value: 'men',
        label: "Men's Collection",
        desc: 'Modal briefs, boxers, trunks & ribbed undershirts',
      },
    ],
  },
  {
    id: 'height',
    stepNumber: '02',
    label: 'What is your height & build?',
    subtitle: 'Calibrates rise and torso proportions.',
    options: [
      { value: 'short', label: 'Petite / Under 5’4”', desc: 'Under 163 cm · Shorter rise & inseam' },
      { value: 'average', label: 'Standard / 5’4” – 5’8”', desc: '163 – 173 cm · Standard proportions' },
      { value: 'tall', label: 'Tall / Above 5’8”', desc: 'Above 173 cm · Extended torso & length' },
    ],
  },
  {
    id: 'build',
    stepNumber: '03',
    label: 'How would you describe your frame?',
    subtitle: 'Calculates waistband tension and fabric stretch.',
    options: [
      { value: 'slim', label: 'Slim / Lean Frame', desc: 'Slender contours & narrower frame' },
      { value: 'average', label: 'Medium / Athletic Frame', desc: 'Proportional athletic structure' },
      { value: 'broad', label: 'Full / Curvy Frame', desc: 'Fuller bust, hips, or broader shoulders' },
    ],
  },
  {
    id: 'preference',
    stepNumber: '04',
    label: 'How do you prefer your pieces to feel?',
    subtitle: 'Select your everyday hold preference.',
    options: [
      {
        value: 'snug',
        label: 'Second-Skin Snug',
        desc: 'Close to the body, zero bunching under clothes',
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
    'short-slim-snug': { size: 'XS', bra: '32A / 32B', panty: 'XS (24-25")', lounge: 'XS', us: 2, uk: 6, eu: 32 },
    'short-slim-regular': { size: 'S', bra: '32B / 34A', panty: 'S (26-27")', lounge: 'S', us: 4, uk: 8, eu: 34 },
    'short-slim-relaxed': { size: 'S', bra: '32B / 34A', panty: 'S (26-27")', lounge: 'S', us: 4, uk: 8, eu: 34 },
    'short-average-snug': { size: 'S', bra: '34A / 34B', panty: 'S (26-27")', lounge: 'S', us: 4, uk: 8, eu: 34 },
    'short-average-regular': { size: 'M', bra: '34B / 36A', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'short-average-relaxed': { size: 'M', bra: '34B / 36A', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'short-broad-snug': { size: 'M', bra: '36B / 36C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'short-broad-regular': { size: 'L', bra: '36C / 38B', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'short-broad-relaxed': { size: 'L', bra: '36C / 38B', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'average-slim-snug': { size: 'S', bra: '32B / 34A', panty: 'S (26-27")', lounge: 'S', us: 4, uk: 8, eu: 34 },
    'average-slim-regular': { size: 'M', bra: '34B / 34C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'average-slim-relaxed': { size: 'M', bra: '34B / 34C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'average-average-snug': { size: 'M', bra: '34B / 34C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'average-average-regular': { size: 'L', bra: '36B / 36C', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'average-average-relaxed': { size: 'L', bra: '36B / 36C', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'average-broad-snug': { size: 'L', bra: '36C / 38B', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'average-broad-regular': { size: 'XL', bra: '38C / 38D', panty: 'XL (32-34")', lounge: 'XL', us: 10, uk: 14, eu: 40 },
    'average-broad-relaxed': { size: 'XL', bra: '38C / 38D', panty: 'XL (32-34")', lounge: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-slim-snug': { size: 'S', bra: '34A / 34B', panty: 'S (26-27")', lounge: 'S', us: 4, uk: 8, eu: 34 },
    'tall-slim-regular': { size: 'M', bra: '34B / 34C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'tall-slim-relaxed': { size: 'M', bra: '34B / 34C', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'tall-average-snug': { size: 'M', bra: '34C / 36B', panty: 'M (28-29")', lounge: 'M', us: 6, uk: 10, eu: 36 },
    'tall-average-regular': { size: 'L', bra: '36C / 36D', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'tall-average-relaxed': { size: 'XL', bra: '38B / 38C', panty: 'XL (32-34")', lounge: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-broad-snug': { size: 'L', bra: '36D / 38C', panty: 'L (30-31")', lounge: 'L', us: 8, uk: 12, eu: 38 },
    'tall-broad-regular': { size: 'XL', bra: '38C / 38D', panty: 'XL (32-34")', lounge: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-broad-relaxed': { size: 'XXL', bra: '40C / 40D', panty: 'XXL (35-37")', lounge: 'XXL', us: 12, uk: 16, eu: 42 },
  },
  men: {
    'short-slim-snug': { size: 'S', waist: '28-30"', chest: '36-38"', us: '30', uk: '30', eu: '46' },
    'short-slim-regular': { size: 'M', waist: '31-33"', chest: '39-41"', us: '32', uk: '32', eu: '48' },
    'short-slim-relaxed': { size: 'M', waist: '31-33"', chest: '39-41"', us: '32', uk: '32', eu: '48' },
    'short-average-snug': { size: 'M', waist: '31-33"', chest: '39-41"', us: '32', uk: '32', eu: '48' },
    'short-average-regular': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'short-average-relaxed': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'short-broad-snug': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'short-broad-regular': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'short-broad-relaxed': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'average-slim-snug': { size: 'M', waist: '31-33"', chest: '39-41"', us: '32', uk: '32', eu: '48' },
    'average-slim-regular': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'average-slim-relaxed': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'average-average-snug': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'average-average-regular': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'average-average-relaxed': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'average-broad-snug': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'average-broad-regular': { size: 'XXL', waist: '40-42"', chest: '48-50"', us: '38', uk: '38', eu: '54' },
    'average-broad-relaxed': { size: 'XXL', waist: '40-42"', chest: '48-50"', us: '38', uk: '38', eu: '54' },
    'tall-slim-snug': { size: 'M', waist: '31-33"', chest: '39-41"', us: '32', uk: '32', eu: '48' },
    'tall-slim-regular': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'tall-slim-relaxed': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'tall-average-snug': { size: 'L', waist: '34-36"', chest: '42-44"', us: '34', uk: '34', eu: '50' },
    'tall-average-regular': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'tall-average-relaxed': { size: 'XXL', waist: '40-42"', chest: '48-50"', us: '38', uk: '38', eu: '54' },
    'tall-broad-snug': { size: 'XL', waist: '37-39"', chest: '45-47"', us: '36', uk: '36', eu: '52' },
    'tall-broad-regular': { size: 'XXL', waist: '40-42"', chest: '48-50"', us: '38', uk: '38', eu: '54' },
    'tall-broad-relaxed': { size: '3XL', waist: '43-45"', chest: '51-53"', us: '40', uk: '40', eu: '56' },
  },
};

export default function FitFinder() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

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
      setResult({ ...fit, gender: next.gender });
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[150px] pb-28 font-sans text-[#111111] antialiased">
      <Seo
        title="Fit Studio & Size Guide — HUSHAE"
        description="Find your precision size for bras, underwear, loungewear, and thermals. International conversion charts."
      />

      <div className="mx-auto max-w-[1280px] px-6 sm:px-10 lg:px-16">
        {/* ═══ 1. HEADER ════════════════════════════════════════════════════ */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-neutral-400">
            HUSHAE FIT STUDIO
          </p>
          <h1 className="text-3xl sm:text-4xl font-light uppercase tracking-[0.14em] text-[#000000]">
            Precision Fit & Sizing
          </h1>
          <p className="text-xs sm:text-[13px] text-neutral-500 font-light leading-relaxed">
            Engineered second-skin pattern grading for women and men. Use our interactive calculator or browse official international size charts below.
          </p>
        </div>

        {/* ═══ 2. STUDIO NAVIGATION TABS ════════════════════════════════════ */}
        <div className="mt-12 flex items-center justify-center border-b border-[#EAEAEA]">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-8">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`pb-4 text-xs font-medium uppercase tracking-[0.2em] transition-all border-b-2 ${
                  activeTab === t.id
                    ? 'border-black text-black'
                    : 'border-transparent text-neutral-400 hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ 3. TAB 1: INTERACTIVE FIT CALCULATOR ═════════════════════════ */}
        {activeTab === 'calculator' && (
          <div className="mt-12 mx-auto max-w-xl">
            {!result ? (
              <div className="space-y-8">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400 border-b border-[#EAEAEA] pb-3">
                  <span>Step {current.stepNumber}</span>
                  <span>{step + 1} of {QUESTIONS.length}</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-xl font-light text-[#000000] uppercase tracking-wide">
                        {current.label}
                      </h2>
                      <p className="mt-1 text-xs text-neutral-500 font-light">
                        {current.subtitle}
                      </p>
                    </div>

                    <div className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
                      {current.options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => pick(opt.value)}
                          className="group flex w-full items-center justify-between py-4 text-left transition-colors hover:pl-2"
                        >
                          <div>
                            <span className="text-sm font-normal text-black group-hover:text-neutral-500 transition-colors">
                              {opt.label}
                            </span>
                            {opt.desc && (
                              <span className="block text-[11.5px] text-neutral-400 font-light mt-0.5">
                                {opt.desc}
                              </span>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-neutral-300 group-hover:text-black transition-colors" />
                        </button>
                      ))}
                    </div>

                    {step > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        className="text-xs uppercase tracking-wider text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
                      >
                        &larr; Previous Step
                      </button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-8 sm:p-10 space-y-8 shadow-xs text-center"
              >
                <div>
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-neutral-400">
                    YOUR RECOMMENDED FIT
                  </p>
                  <p className="mt-3 font-sans text-5xl sm:text-6xl font-light text-[#000000] tracking-tight">
                    Size {result.size}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500 font-light">
                    International Conversions: UK {result.uk} &bull; US {result.us} &bull; EU {result.eu}
                  </p>
                </div>

                {/* Breakdown across categories */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y border-[#EAEAEA] py-6 text-left text-xs">
                  {result.gender === 'women' ? (
                    <>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Bras</p>
                        <p className="font-medium text-black text-sm">{result.bra}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Wireless & Balconette</p>
                      </div>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Panties</p>
                        <p className="font-medium text-black text-sm">{result.panty}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Hipsters & Thongs</p>
                      </div>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Loungewear</p>
                        <p className="font-medium text-black text-sm">{result.lounge}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Slips & Nightwear</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Underwear</p>
                        <p className="font-medium text-black text-sm">{result.waist}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Briefs, Trunks & Boxers</p>
                      </div>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Undershirts</p>
                        <p className="font-medium text-black text-sm">{result.chest}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Vests & Crew Necks</p>
                      </div>
                      <div className="space-y-1 bg-white p-3.5 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">Thermals</p>
                        <p className="font-medium text-black text-sm">Size {result.size}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Tops & Bottoms</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Action CTAs */}
                <div className="space-y-3 pt-2 max-w-sm mx-auto">
                  <Link
                    to={result.gender === 'women' ? '/women' : '/men'}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-all hover:scale-[1.01]"
                  >
                    <span>Shop In Your Size ({result.size})</span>
                    <ArrowRight size={14} />
                  </Link>

                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-400 hover:text-black transition-colors"
                  >
                    <RotateCcw size={12} /> Retake Calculator
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══ 4. TAB 2: WOMEN'S SIZE CHARTS ════════════════════════════════ */}
        {activeTab === 'women' && (
          <div className="mt-12 space-y-16 max-w-4xl mx-auto">
            {/* Panties & Shapewear Matrix */}
            <div className="space-y-4">
              <h2 className="text-lg font-light uppercase tracking-wider text-black">
                Panties, Briefs & Shapewear
              </h2>
              <div className="overflow-x-auto rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                      <th className="pb-3">HUSHAE Size</th>
                      <th className="pb-3">Waist (Inches)</th>
                      <th className="pb-3">Hips (Inches)</th>
                      <th className="pb-3">UK</th>
                      <th className="pb-3">US</th>
                      <th className="pb-3">EU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] text-neutral-700 font-light">
                    <tr><td className="py-3 font-medium text-black">XS</td><td>24 – 25"</td><td>34 – 35"</td><td>6</td><td>2</td><td>32</td></tr>
                    <tr><td className="py-3 font-medium text-black">S</td><td>26 – 27"</td><td>36 – 37"</td><td>8</td><td>4</td><td>34</td></tr>
                    <tr><td className="py-3 font-medium text-black">M</td><td>28 – 29"</td><td>38 – 39"</td><td>10</td><td>6</td><td>36</td></tr>
                    <tr><td className="py-3 font-medium text-black">L</td><td>30 – 31"</td><td>40 – 41"</td><td>12</td><td>8</td><td>38</td></tr>
                    <tr><td className="py-3 font-medium text-black">XL</td><td>32 – 34"</td><td>42 – 44"</td><td>14</td><td>10</td><td>40</td></tr>
                    <tr><td className="py-3 font-medium text-black">XXL</td><td>35 – 37"</td><td>45 – 47"</td><td>16</td><td>12</td><td>42</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bra Size Chart */}
            <div className="space-y-4">
              <h2 className="text-lg font-light uppercase tracking-wider text-black">
                Bras & Bralettes
              </h2>
              <div className="overflow-x-auto rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Underbust (Inches)</th>
                      <th className="pb-3">Bust Circumference (Cup A/B)</th>
                      <th className="pb-3">Bust Circumference (Cup C/D)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] text-neutral-700 font-light">
                    <tr><td className="py-3 font-medium text-black">32 (A–D)</td><td>27 – 29"</td><td>31 – 33"</td><td>33 – 35"</td></tr>
                    <tr><td className="py-3 font-medium text-black">34 (A–D)</td><td>29 – 31"</td><td>33 – 35"</td><td>35 – 37"</td></tr>
                    <tr><td className="py-3 font-medium text-black">36 (A–D)</td><td>31 – 33"</td><td>35 – 37"</td><td>37 – 39"</td></tr>
                    <tr><td className="py-3 font-medium text-black">38 (A–D)</td><td>33 – 35"</td><td>37 – 39"</td><td>39 – 41"</td></tr>
                    <tr><td className="py-3 font-medium text-black">40 (A–D)</td><td>35 – 37"</td><td>39 – 41"</td><td>41 – 43"</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 5. TAB 3: MEN'S SIZE CHARTS ══════════════════════════════════ */}
        {activeTab === 'men' && (
          <div className="mt-12 space-y-16 max-w-4xl mx-auto">
            {/* Briefs & Boxers */}
            <div className="space-y-4">
              <h2 className="text-lg font-light uppercase tracking-wider text-black">
                Briefs, Trunks & Boxers
              </h2>
              <div className="overflow-x-auto rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                      <th className="pb-3">HUSHAE Size</th>
                      <th className="pb-3">Waist (Inches)</th>
                      <th className="pb-3">Waist (CM)</th>
                      <th className="pb-3">US / UK</th>
                      <th className="pb-3">EU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] text-neutral-700 font-light">
                    <tr><td className="py-3 font-medium text-black">S</td><td>28 – 30"</td><td>71 – 76 cm</td><td>30</td><td>46</td></tr>
                    <tr><td className="py-3 font-medium text-black">M</td><td>31 – 33"</td><td>79 – 84 cm</td><td>32</td><td>48</td></tr>
                    <tr><td className="py-3 font-medium text-black">L</td><td>34 – 36"</td><td>86 – 91 cm</td><td>34</td><td>50</td></tr>
                    <tr><td className="py-3 font-medium text-black">XL</td><td>37 – 39"</td><td>94 – 99 cm</td><td>36</td><td>52</td></tr>
                    <tr><td className="py-3 font-medium text-black">XXL</td><td>40 – 42"</td><td>102 – 107 cm</td><td>38</td><td>54</td></tr>
                    <tr><td className="py-3 font-medium text-black">3XL</td><td>43 – 45"</td><td>109 – 114 cm</td><td>40</td><td>56</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vests & Undershirts */}
            <div className="space-y-4">
              <h2 className="text-lg font-light uppercase tracking-wider text-black">
                Vests & Undershirts
              </h2>
              <div className="overflow-x-auto rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EAEAEA] text-[11px] uppercase tracking-wider text-neutral-400 font-medium">
                      <th className="pb-3">HUSHAE Size</th>
                      <th className="pb-3">Chest Circumference (Inches)</th>
                      <th className="pb-3">Chest (CM)</th>
                      <th className="pb-3">Body Fit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] text-neutral-700 font-light">
                    <tr><td className="py-3 font-medium text-black">S</td><td>36 – 38"</td><td>91 – 96 cm</td><td>Tailored Slim</td></tr>
                    <tr><td className="py-3 font-medium text-black">M</td><td>39 – 41"</td><td>99 – 104 cm</td><td>Regular Comfort</td></tr>
                    <tr><td className="py-3 font-medium text-black">L</td><td>42 – 44"</td><td>107 – 112 cm</td><td>Regular Comfort</td></tr>
                    <tr><td className="py-3 font-medium text-black">XL</td><td>45 – 47"</td><td>114 – 119 cm</td><td>Relaxed Fit</td></tr>
                    <tr><td className="py-3 font-medium text-black">XXL</td><td>48 – 50"</td><td>122 – 127 cm</td><td>Relaxed Fit</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 6. TAB 4: HOW TO MEASURE AT HOME ═════════════════════════════ */}
        {activeTab === 'measure' && (
          <div className="mt-12 max-w-3xl mx-auto space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-2 shadow-xs">
                <span className="font-mono text-sm font-medium text-black">01</span>
                <h3 className="font-medium text-black uppercase tracking-wide text-sm">Bust / Chest</h3>
                <p className="text-neutral-500 font-light leading-relaxed">
                  Wrap the measuring tape around the fullest part of your chest or bust, keeping the tape comfortably horizontal.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-2 shadow-xs">
                <span className="font-mono text-sm font-medium text-black">02</span>
                <h3 className="font-medium text-black uppercase tracking-wide text-sm">Natural Waist</h3>
                <p className="text-neutral-500 font-light leading-relaxed">
                  Measure around the narrowest part of your waistline (usually just above the navel). Do not pull too tight.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-2 shadow-xs">
                <span className="font-mono text-sm font-medium text-black">03</span>
                <h3 className="font-medium text-black uppercase tracking-wide text-sm">Fullest Hips</h3>
                <p className="text-neutral-500 font-light leading-relaxed">
                  Stand with your feet together and measure around the fullest point of your hips and seat for optimal rise fit.
                </p>
              </div>
            </div>

            {/* Between Sizes Rule */}
            <div className="rounded-3xl border border-[#EAEAEA] bg-neutral-50 p-6 sm:p-8 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-black">
                The "Between Sizes?" Guideline
              </h4>
              <p className="text-xs text-neutral-600 font-light leading-relaxed">
                If your measurements fall between two sizes: choose the <strong>smaller size</strong> if you prefer a supportive, second-skin compression hold; choose the <strong>larger size</strong> for relaxed everyday drape.
              </p>
            </div>
          </div>
        )}

        {/* ═══ 7. BOTTOM REASSURANCE & FIT ASSURANCE STRIP ══════════════════ */}
        <div className="mt-20 border-t border-[#EAEAEA] pt-10 text-center space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs text-neutral-600 font-light">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-black" /> 14-Day Free Size Exchanges
            </span>
            <span className="inline-flex items-center gap-2">
              <Ruler size={14} className="text-black" /> International Pattern Grading
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-black" /> 100% Guaranteed Fit Support
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 font-light">
            Need bespoke advice? Contact our studio concierge on WhatsApp for personal sizing recommendations.
          </p>
        </div>

      </div>
    </div>
  );
}
