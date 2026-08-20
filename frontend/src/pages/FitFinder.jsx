import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, CheckCircle2, RotateCcw, ShieldCheck,
  Sparkles, HelpCircle, Ruler, MessageCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE FIT STUDIO — Luxury Sizing & Pattern Directory (SKIMS / Calvin Klein)
 *
 * ARCHITECTURE:
 *   1. Clean Top Header & Segmented Switcher (Calculator / Size Charts / How to Measure)
 *   2. Interactive Precision Fit Calculator (4-Step Atelier Grading Engine)
 *   3. Official International Sizing Matrix (Women & Men Tabs with exact Inches/CM)
 *   4. "How to Measure at Home" Atelier Guide (Bust, Waist, Hips, In-between sizes)
 *   5. 14-Day Free Exchange Guarantee & Studio Concierge Strip
 * ========================================================================== */

const QUESTIONS = [
  {
    id: 'gender',
    stepNumber: '01',
    label: 'Select Department',
    subtitle: 'Choose for precise anatomical pattern grading.',
    options: [
      {
        value: 'women',
        label: 'Women’s Studio Collection',
        desc: 'Bras, seamless panties, shapewear & silk loungewear',
      },
      {
        value: 'men',
        label: 'Men’s Studio Collection',
        desc: 'Modal briefs, combed cotton boxers, trunks & ribbed vests',
      },
    ],
  },
  {
    id: 'height',
    stepNumber: '02',
    label: 'Height & Torso Proportion',
    subtitle: 'Calibrates rise, inseam, and strap lengths.',
    options: [
      { value: 'short', label: 'Petite (Under 5’4”)', desc: 'Under 163 cm · Optimized rise & shorter torso' },
      { value: 'average', label: 'Standard (5’4” – 5’8”)', desc: '163 – 173 cm · Proportional anatomical grading' },
      { value: 'tall', label: 'Tall (Above 5’8”)', desc: 'Above 173 cm · Extended torso & inseam clearance' },
    ],
  },
  {
    id: 'build',
    stepNumber: '03',
    label: 'Body Frame & Silhouette',
    subtitle: 'Calculates waistband tension and side compression.',
    options: [
      { value: 'slim', label: 'Slim / Lean Frame', desc: 'Slender contours with narrower ribcage and hips' },
      { value: 'average', label: 'Medium / Athletic Frame', desc: 'Balanced athletic proportions and standard ease' },
      { value: 'broad', label: 'Full / Curvy Frame', desc: 'Fuller bust, wider hips, or broader shoulders' },
    ],
  },
  {
    id: 'preference',
    stepNumber: '04',
    label: 'Desired Everyday Hold',
    subtitle: 'Select your preferred tension against skin.',
    options: [
      {
        value: 'snug',
        label: 'Second-Skin Snug',
        desc: 'Contoured hold, smooth compression, zero bunching under clothing',
      },
      {
        value: 'regular',
        label: 'Tailored Regular',
        desc: 'Natural support with comfortable breathing room for 24/7 wear',
      },
      {
        value: 'relaxed',
        label: 'Relaxed Lounge',
        desc: 'Slightly looser drape designed for sleeping and easy lounging',
      },
    ],
  },
];

const SIZE_MAP = {
  women: {
    'short-slim-snug': { size: 'XS', bra: '32A / 32B', bottom: 'XS (Waist 24–25")', uk: 6, us: 2, eu: 32, label: 'Extra Small' },
    'short-slim-regular': { size: 'S', bra: '32B / 34A', bottom: 'S (Waist 26–27")', uk: 8, us: 4, eu: 34, label: 'Small' },
    'short-slim-relaxed': { size: 'S', bra: '32B / 34B', bottom: 'S (Waist 26–27")', uk: 8, us: 4, eu: 34, label: 'Small' },
    'short-average-snug': { size: 'S', bra: '34B / 32C', bottom: 'S (Waist 26–27")', uk: 8, us: 4, eu: 34, label: 'Small' },
    'short-average-regular': { size: 'M', bra: '34C / 36B', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'short-average-relaxed': { size: 'M', bra: '36B / 34C', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'short-broad-snug': { size: 'M', bra: '36C / 34D', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'short-broad-regular': { size: 'L', bra: '36D / 38C', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'short-broad-relaxed': { size: 'L', bra: '38C / 36D', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'average-slim-snug': { size: 'S', bra: '32B / 34A', bottom: 'S (Waist 26–27")', uk: 8, us: 4, eu: 34, label: 'Small' },
    'average-slim-regular': { size: 'M', bra: '34B / 34C', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'average-slim-relaxed': { size: 'M', bra: '34C / 36B', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'average-average-snug': { size: 'M', bra: '34C / 34D', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'average-average-regular': { size: 'L', bra: '36C / 36D', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'average-average-relaxed': { size: 'L', bra: '36D / 38C', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'average-broad-snug': { size: 'L', bra: '38C / 36D', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'average-broad-regular': { size: 'XL', bra: '38D / 40C', bottom: 'XL (Waist 33–35")', uk: 14, us: 10, eu: 40, label: 'Extra Large' },
    'average-broad-relaxed': { size: 'XL', bra: '40C / 40D', bottom: 'XL (Waist 33–35")', uk: 14, us: 10, eu: 40, label: 'Extra Large' },
    'tall-slim-snug': { size: 'S', bra: '34B / 32C', bottom: 'S (Waist 26–27")', uk: 8, us: 4, eu: 34, label: 'Small' },
    'tall-slim-regular': { size: 'M', bra: '34C / 36B', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'tall-slim-relaxed': { size: 'M', bra: '36B / 36C', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'tall-average-snug': { size: 'M', bra: '36C / 34D', bottom: 'M (Waist 28–29")', uk: 10, us: 6, eu: 36, label: 'Medium' },
    'tall-average-regular': { size: 'L', bra: '36D / 38C', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'tall-average-relaxed': { size: 'XL', bra: '38D / 40C', bottom: 'XL (Waist 33–35")', uk: 14, us: 10, eu: 40, label: 'Extra Large' },
    'tall-broad-snug': { size: 'L', bra: '38C / 38D', bottom: 'L (Waist 30–32")', uk: 12, us: 8, eu: 38, label: 'Large' },
    'tall-broad-regular': { size: 'XL', bra: '40C / 40D', bottom: 'XL (Waist 33–35")', uk: 14, us: 10, eu: 40, label: 'Extra Large' },
    'tall-broad-relaxed': { size: 'XXL', bra: '42C / 42D', bottom: 'XXL (Waist 36–38")', uk: 16, us: 12, eu: 42, label: '2X Large' },
  },
  men: {
    'short-slim-snug': { size: 'S', waist: '28" – 30"', chest: '36" – 38"', us: '30', uk: '30', eu: '46', label: 'Small (30")' },
    'short-slim-regular': { size: 'M', waist: '31" – 32"', chest: '38" – 40"', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-slim-relaxed': { size: 'M', waist: '31" – 32"', chest: '38" – 40"', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-average-snug': { size: 'M', waist: '31" – 32"', chest: '38" – 40"', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'short-average-regular': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-average-relaxed': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-broad-snug': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'short-broad-regular': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'short-broad-relaxed': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-slim-snug': { size: 'M', waist: '31" – 32"', chest: '38" – 40"', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'average-slim-regular': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-slim-relaxed': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-average-snug': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'average-average-regular': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-average-relaxed': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-broad-snug': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'average-broad-regular': { size: 'XXL', waist: '37" – 39"', chest: '44" – 46"', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'average-broad-relaxed': { size: 'XXL', waist: '37" – 39"', chest: '44" – 46"', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-slim-snug': { size: 'M', waist: '31" – 32"', chest: '38" – 40"', us: '32', uk: '32', eu: '48', label: 'Medium (32")' },
    'tall-slim-regular': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-slim-relaxed': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-average-snug': { size: 'L', waist: '33" – 34"', chest: '40" – 42"', us: '34', uk: '34', eu: '50', label: 'Large (34")' },
    'tall-average-regular': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'tall-average-relaxed': { size: 'XXL', waist: '37" – 39"', chest: '44" – 46"', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-broad-snug': { size: 'XL', waist: '35" – 36"', chest: '42" – 44"', us: '36', uk: '36', eu: '52', label: 'Extra Large (36")' },
    'tall-broad-regular': { size: 'XXL', waist: '37" – 39"', chest: '44" – 46"', us: '38', uk: '38', eu: '54', label: '2X Large (38")' },
    'tall-broad-relaxed': { size: '3XL', waist: '40" – 42"', chest: '46" – 48"', us: '40', uk: '40', eu: '56', label: '3X Large (40")' },
  },
};

/* Official Sizing Tables Data */
const WOMEN_BRA_MATRIX = [
  { size: '32A', underbustIn: '26"–28"', underbustCm: '68–72 cm', bustIn: '31"–32"', bustCm: '79–82 cm', uk: '32A', us: '32A', eu: '70A' },
  { size: '32B', underbustIn: '26"–28"', underbustCm: '68–72 cm', bustIn: '32"–33"', bustCm: '82–85 cm', uk: '32B', us: '32B', eu: '70B' },
  { size: '34A', underbustIn: '28"–30"', underbustCm: '73–77 cm', bustIn: '33"–34"', bustCm: '84–87 cm', uk: '34A', us: '34A', eu: '75A' },
  { size: '34B', underbustIn: '28"–30"', underbustCm: '73–77 cm', bustIn: '34"–35"', bustCm: '87–90 cm', uk: '34B', us: '34B', eu: '75B' },
  { size: '34C', underbustIn: '28"–30"', underbustCm: '73–77 cm', bustIn: '35"–36"', bustCm: '90–93 cm', uk: '34C', us: '34C', eu: '75C' },
  { size: '36B', underbustIn: '30"–32"', underbustCm: '78–82 cm', bustIn: '36"–37"', bustCm: '92–95 cm', uk: '36B', us: '36B', eu: '80B' },
  { size: '36C', underbustIn: '30"–32"', underbustCm: '78–82 cm', bustIn: '37"–38"', bustCm: '95–98 cm', uk: '36C', us: '36C', eu: '80C' },
  { size: '36D', underbustIn: '30"–32"', underbustCm: '78–82 cm', bustIn: '38"–39"', bustCm: '98–101 cm', uk: '36D', us: '36D', eu: '80D' },
  { size: '38B', underbustIn: '32"–34"', underbustCm: '83–87 cm', bustIn: '38"–39"', bustCm: '97–100 cm', uk: '38B', us: '38B', eu: '85B' },
  { size: '38C', underbustIn: '32"–34"', underbustCm: '83–87 cm', bustIn: '39"–40"', bustCm: '100–103 cm', uk: '38C', us: '38C', eu: '85C' },
  { size: '38D', underbustIn: '32"–34"', underbustCm: '83–87 cm', bustIn: '40"–41"', bustCm: '103–106 cm', uk: '38D', us: '38D', eu: '85D' },
];

const WOMEN_BOTTOMS_MATRIX = [
  { size: 'XS', waistIn: '24"–25"', waistCm: '60–64 cm', hipIn: '34"–35"', hipCm: '86–90 cm', uk: '6', us: '2', eu: '32' },
  { size: 'S', waistIn: '26"–27"', waistCm: '65–70 cm', hipIn: '36"–37"', hipCm: '91–95 cm', uk: '8', us: '4', eu: '34' },
  { size: 'M', waistIn: '28"–29"', waistCm: '71–75 cm', hipIn: '38"–39"', hipCm: '96–100 cm', uk: '10', us: '6', eu: '36' },
  { size: 'L', waistIn: '30"–32"', waistCm: '76–82 cm', hipIn: '40"–42"', hipCm: '101–107 cm', uk: '12', us: '8', eu: '38' },
  { size: 'XL', waistIn: '33"–35"', waistCm: '83–90 cm', hipIn: '43"–45"', hipCm: '108–115 cm', uk: '14', us: '10', eu: '40' },
  { size: 'XXL', waistIn: '36"–38"', waistCm: '91–98 cm', hipIn: '46"–48"', hipCm: '116–122 cm', uk: '16', us: '12', eu: '42' },
];

const MEN_UNDERWEAR_MATRIX = [
  { size: 'S (30")', waistIn: '28"–30"', waistCm: '71–76 cm', hipIn: '34"–36"', hipCm: '86–92 cm', uk: '30', us: '30', eu: '46' },
  { size: 'M (32")', waistIn: '31"–32"', waistCm: '78–82 cm', hipIn: '37"–38"', hipCm: '94–98 cm', uk: '32', us: '32', eu: '48' },
  { size: 'L (34")', waistIn: '33"–34"', waistCm: '84–88 cm', hipIn: '39"–41"', hipCm: '100–104 cm', uk: '34', us: '34', eu: '50' },
  { size: 'XL (36")', waistIn: '35"–36"', waistCm: '89–93 cm', hipIn: '42"–44"', hipCm: '106–112 cm', uk: '36', us: '36', eu: '52' },
  { size: 'XXL (38")', waistIn: '37"–39"', waistCm: '94–99 cm', hipIn: '45"–47"', hipCm: '114–120 cm', uk: '38', us: '38', eu: '54' },
  { size: '3XL (40")', waistIn: '40"–42"', waistCm: '101–107 cm', hipIn: '48"–50"', hipCm: '122–128 cm', uk: '40', us: '40', eu: '56' },
];

const MEN_TOPS_MATRIX = [
  { size: 'S', chestIn: '36"–38"', chestCm: '91–96 cm', lengthIn: '27"', lengthCm: '69 cm', uk: '36', us: '36', eu: '46' },
  { size: 'M', chestIn: '38"–40"', chestCm: '97–102 cm', lengthIn: '28"', lengthCm: '71 cm', uk: '38', us: '38', eu: '48' },
  { size: 'L', chestIn: '40"–42"', chestCm: '103–108 cm', lengthIn: '29"', lengthCm: '73 cm', uk: '40', us: '40', eu: '50' },
  { size: 'XL', chestIn: '42"–44"', chestCm: '109–114 cm', lengthIn: '30"', lengthCm: '76 cm', uk: '42', us: '42', eu: '52' },
  { size: 'XXL', chestIn: '44"–46"', chestCm: '115–120 cm', lengthIn: '31"', lengthCm: '78 cm', uk: '44', us: '44', eu: '54' },
];

export default function FitFinder() {
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator' | 'charts' | 'measure'
  const [chartGender, setChartGender] = useState('women'); // 'women' | 'men'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hushae.fit') || 'null'); } catch { return null; }
  });

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
      try {
        localStorage.setItem('hushae.fit', JSON.stringify(full));
        window.dispatchEvent(new Event('hushae:fit-updated'));
      } catch {}
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    try { localStorage.removeItem('hushae.fit'); } catch {}
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[150px] sm:pt-[170px] pb-28 font-sans text-[#111111] antialiased">
      <Seo
        title="Fit Studio & Sizing Matrix — HUSHAE"
        description="Official international size directory, measurement guide, and precision fit engine for HUSHAE luxury innerwear."
        canonical="/fit-finder"
      />

      <div className="mx-auto max-w-4xl px-6 sm:px-8">

        {/* ═══ 1. ATELIER HEADER & NAVIGATION ═══════════════════════════════ */}
        <div className="text-center space-y-3 pb-8 border-b border-[#EAEAEA]">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.3em] text-neutral-400">
            ATELIER FIT STUDIO
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light uppercase tracking-tight text-[#000000]">
            Precision Sizing & Fit Directory
          </h1>
          <p className="text-xs sm:text-[13px] text-neutral-500 font-light max-w-lg mx-auto pt-1 leading-relaxed">
            Engineered pattern grading for second-skin comfort. Explore our interactive fit calculator, official measurement tables, and atelier sizing guide.
          </p>

          {/* Segmented Luxury Navigation Tabs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'calculator', label: 'Interactive Fit Finder' },
              { id: 'charts', label: 'Official Size Charts' },
              { id: 'measure', label: 'How to Measure' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#000000] text-[#FFFFFF] shadow-xs'
                    : 'border border-neutral-200 bg-[#FFFFFF] text-neutral-600 hover:border-black hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ 2. SEGMENT: INTERACTIVE FIT CALCULATOR ════════════════════════ */}
        {activeTab === 'calculator' && (
          <div className="mt-12 max-w-xl mx-auto space-y-8">
            {!result ? (
              <div className="space-y-6">
                {/* Step indicator */}
                <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 text-xs tracking-wider uppercase text-neutral-400">
                  <span>Step {current.stepNumber} of 04</span>
                  <span>{current.label}</span>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-normal text-black tracking-tight">
                    {current.label}
                  </h2>
                  <p className="text-xs text-neutral-500 font-light">
                    {current.subtitle}
                  </p>
                </div>

                {/* Question Options */}
                <div className="space-y-3 pt-2">
                  {current.options.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pick(opt.value)}
                      className="group flex w-full items-center justify-between p-5 rounded-2xl border border-[#EAEAEA] bg-[#FBFBFB] text-left transition-all hover:border-black hover:bg-white shadow-xs"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-black group-hover:text-black transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-xs text-neutral-500 font-light">
                          {opt.desc}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-neutral-300 group-hover:text-black transition-colors shrink-0 ml-4" />
                    </button>
                  ))}
                </div>

                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-400 hover:text-black transition-colors pt-2"
                  >
                    &larr; Previous Step
                  </button>
                )}
              </div>
            ) : (
              /* ── CALCULATOR RESULT (MATCHING ATELIER CONCIERGE) ── */
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-8 sm:p-10 text-center space-y-8 shadow-xs"
              >
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
                    YOUR RECOMMENDED FIT
                  </span>
                  <p className="mt-3 font-serif text-6xl md:text-7xl font-light text-[#000000]">
                    {result.size}
                  </p>
                  <p className="mt-2 text-sm font-medium text-neutral-700">
                    {result.label || result.size}
                  </p>
                </div>

                {/* Specific Category Predictions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left border-y border-[#EAEAEA] py-6">
                  {result.gender === 'women' ? (
                    <>
                      <div className="space-y-1 bg-white p-4 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-medium">Bras & Bralettes</p>
                        <p className="font-semibold text-black text-sm">{result.bra || '34B'}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Underbust & cup calibrated</p>
                      </div>
                      <div className="space-y-1 bg-white p-4 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-medium">Panties & Shapewear</p>
                        <p className="font-semibold text-black text-sm">{result.bottom || result.size}</p>
                        <p className="text-[11px] text-neutral-500 font-light">Second-skin modal waistband</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1 bg-white p-4 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-medium">Briefs, Trunks & Boxers</p>
                        <p className="font-semibold text-black text-sm">{result.size} ({result.waist || '32"'})</p>
                        <p className="text-[11px] text-neutral-500 font-light">No-ride ergonomic contouring</p>
                      </div>
                      <div className="space-y-1 bg-white p-4 rounded-2xl border border-[#EAEAEA]">
                        <p className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-medium">Vests & Undershirts</p>
                        <p className="font-semibold text-black text-sm">{result.size} ({result.chest || '38"–40"'})</p>
                        <p className="text-[11px] text-neutral-500 font-light">Tailored rib length</p>
                      </div>
                    </>
                  )}
                </div>

                {/* International Conversion Baseline */}
                <div className="flex items-center justify-center gap-6 text-xs text-neutral-500 font-light">
                  <span>UK {result.uk}</span>
                  <span className="text-neutral-300">&bull;</span>
                  <span>US {result.us}</span>
                  <span className="text-neutral-300">&bull;</span>
                  <span>EU {result.eu}</span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 max-w-xs mx-auto pt-2">
                  <Link
                    to={result.gender === 'women' ? '/women' : '/men'}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-all hover:scale-[1.01]"
                  >
                    <span>Shop {result.gender === 'women' ? "Women's" : "Men's"} ({result.size})</span>
                    <ArrowRight size={14} />
                  </Link>

                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-400 hover:text-black transition-colors pt-1"
                  >
                    <RotateCcw size={12} /> Recalculate Sizing
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ═══ 3. SEGMENT: OFFICIAL SIZE CHARTS & CONVERSIONS ═══════════════ */}
        {activeTab === 'charts' && (
          <div className="mt-10 space-y-12">
            {/* Gender Toggle for Charts */}
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setChartGender('women')}
                className={`rounded-full px-6 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
                  chartGender === 'women'
                    ? 'bg-black text-white'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:border-black'
                }`}
              >
                Women's Size Matrix
              </button>
              <button
                type="button"
                onClick={() => setChartGender('men')}
                className={`rounded-full px-6 py-2 text-xs font-medium uppercase tracking-wider transition-all ${
                  chartGender === 'men'
                    ? 'bg-black text-white'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:border-black'
                }`}
              >
                Men's Size Matrix
              </button>
            </div>

            {chartGender === 'women' ? (
              <div className="space-y-10">
                {/* 1. Women Bra Sizing Table */}
                <div className="space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                      1. Bras, Balconettes & Wireless Comfort
                    </h3>
                    <p className="text-xs text-neutral-500 font-light">Measurements in inches and centimeters for band & cup sizing.</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#EAEAEA] bg-[#FBFBFB]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#EAEAEA] bg-white text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        <tr>
                          <th className="p-3.5 pl-5">HUSHAE Size</th>
                          <th className="p-3.5">Underbust (Inches)</th>
                          <th className="p-3.5">Underbust (CM)</th>
                          <th className="p-3.5">Bust (Inches)</th>
                          <th className="p-3.5">UK / US</th>
                          <th className="p-3.5 pr-5">EU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAEAEA] font-light">
                        {WOMEN_BRA_MATRIX.map((row) => (
                          <tr key={row.size} className="hover:bg-white transition-colors">
                            <td className="p-3.5 pl-5 font-medium text-black">{row.size}</td>
                            <td className="p-3.5 text-neutral-600">{row.underbustIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.underbustCm}</td>
                            <td className="p-3.5 text-neutral-600">{row.bustIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.uk}</td>
                            <td className="p-3.5 pr-5 text-neutral-600">{row.eu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Women Panties & Shapewear Table */}
                <div className="space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                      2. Panties, Briefs & Shapewear Matrix
                    </h3>
                    <p className="text-xs text-neutral-500 font-light">Waist and hip measurements for second-skin tailored fits.</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#EAEAEA] bg-[#FBFBFB]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#EAEAEA] bg-white text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        <tr>
                          <th className="p-3.5 pl-5">Size</th>
                          <th className="p-3.5">Waist (Inches)</th>
                          <th className="p-3.5">Waist (CM)</th>
                          <th className="p-3.5">Hips (Inches)</th>
                          <th className="p-3.5">UK</th>
                          <th className="p-3.5">US</th>
                          <th className="p-3.5 pr-5">EU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAEAEA] font-light">
                        {WOMEN_BOTTOMS_MATRIX.map((row) => (
                          <tr key={row.size} className="hover:bg-white transition-colors">
                            <td className="p-3.5 pl-5 font-medium text-black">{row.size}</td>
                            <td className="p-3.5 text-neutral-600">{row.waistIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.waistCm}</td>
                            <td className="p-3.5 text-neutral-600">{row.hipIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.uk}</td>
                            <td className="p-3.5 text-neutral-600">{row.us}</td>
                            <td className="p-3.5 pr-5 text-neutral-600">{row.eu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* 1. Men Underwear Table */}
                <div className="space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                      1. Men's Briefs, Trunks & Boxers
                    </h3>
                    <p className="text-xs text-neutral-500 font-light">Waistband tension and hip circumference guide.</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#EAEAEA] bg-[#FBFBFB]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#EAEAEA] bg-white text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        <tr>
                          <th className="p-3.5 pl-5">Size</th>
                          <th className="p-3.5">Waist (Inches)</th>
                          <th className="p-3.5">Waist (CM)</th>
                          <th className="p-3.5">Hips (Inches)</th>
                          <th className="p-3.5">UK / US</th>
                          <th className="p-3.5 pr-5">EU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAEAEA] font-light">
                        {MEN_UNDERWEAR_MATRIX.map((row) => (
                          <tr key={row.size} className="hover:bg-white transition-colors">
                            <td className="p-3.5 pl-5 font-medium text-black">{row.size}</td>
                            <td className="p-3.5 text-neutral-600">{row.waistIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.waistCm}</td>
                            <td className="p-3.5 text-neutral-600">{row.hipIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.uk}</td>
                            <td className="p-3.5 pr-5 text-neutral-600">{row.eu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Men Vests & Tops Table */}
                <div className="space-y-4">
                  <div className="border-b border-[#EAEAEA] pb-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                      2. Vests, Undershirts & Thermal Tops
                    </h3>
                    <p className="text-xs text-neutral-500 font-light">Chest circumference and standard body length.</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#EAEAEA] bg-[#FBFBFB]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#EAEAEA] bg-white text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                        <tr>
                          <th className="p-3.5 pl-5">Size</th>
                          <th className="p-3.5">Chest (Inches)</th>
                          <th className="p-3.5">Chest (CM)</th>
                          <th className="p-3.5">Length (Inches)</th>
                          <th className="p-3.5 pr-5">UK / US</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAEAEA] font-light">
                        {MEN_TOPS_MATRIX.map((row) => (
                          <tr key={row.size} className="hover:bg-white transition-colors">
                            <td className="p-3.5 pl-5 font-medium text-black">{row.size}</td>
                            <td className="p-3.5 text-neutral-600">{row.chestIn}</td>
                            <td className="p-3.5 text-neutral-600">{row.chestCm}</td>
                            <td className="p-3.5 text-neutral-600">{row.lengthIn}</td>
                            <td className="p-3.5 pr-5 text-neutral-600">{row.uk}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ 4. SEGMENT: HOW TO MEASURE AT HOME ═══════════════════════════ */}
        {activeTab === 'measure' && (
          <div className="mt-10 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-3 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Step 01</span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Chest / Bust</h3>
                <p className="text-xs text-neutral-600 font-light leading-relaxed">
                  Wrap a soft measuring tape around the fullest part of your chest or bust, keeping the tape level and snug without pulling tight.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-3 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Step 02</span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Natural Waist</h3>
                <p className="text-xs text-neutral-600 font-light leading-relaxed">
                  Measure around your natural waistline (the narrowest section just above your navel), breathing naturally.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 space-y-3 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Step 03</span>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Hips & Seat</h3>
                <p className="text-xs text-neutral-600 font-light leading-relaxed">
                  Stand with feet together and measure around the fullest circumference of your hips and seat for bottom grading.
                </p>
              </div>
            </div>

            {/* In-Between Sizes Advice Card */}
            <div className="rounded-3xl border border-black bg-black text-white p-8 space-y-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">ATELIER FIT TIP</span>
              <h4 className="text-lg font-light uppercase tracking-wider text-white">Between Two Sizes?</h4>
              <p className="text-xs text-neutral-300 font-light leading-relaxed max-w-2xl">
                Because HUSHAE uses high-elasticity Lenzing modal and premium elastane blends, choosing your size depends on preferred hold:
                select the <strong>smaller size</strong> for a sculpted second-skin compression fit under close-fitting clothes;
                select the <strong>larger size</strong> for relaxed everyday breathing room and loungewear comfort.
              </p>
            </div>
          </div>
        )}

        {/* ═══ 5. 14-DAY FREE SIZE EXCHANGES & CONCIERGE FOOTER ══════════════ */}
        <div className="mt-16 rounded-3xl border border-[#EAEAEA] bg-[#FBFBFB] p-6 sm:p-8 space-y-5 text-center shadow-xs">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-2">
              <RotateCcw size={14} className="text-black" />
              <span>14-Day Hassle-Free Size Exchanges</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-black" />
              <span>100% Plain Unmarked Discreet Packaging</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} className="text-black" />
              <span>Cash on Delivery Nationwide</span>
            </span>
          </div>

          <p className="text-[11.5px] text-neutral-400 font-light pt-1">
            Need personal fitting advice? Contact our master atelier concierge on WhatsApp or at{' '}
            <a href="mailto:care@hushae.pk" className="text-black underline underline-offset-2">
              care@hushae.pk
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
