import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ruler, Check } from 'lucide-react';
import Seo from '../components/Seo';

/* ============================================================================
 * Fit Finder v2 — 4 questions, no tape measure.
 * Persists result to localStorage (hushae.fit).
 * Shows YOUR FIT marker on every product and product card.
 * ========================================================================== */

const QUESTIONS = [
  {
    id: 'gender', label: 'Who are you shopping for?',
    options: [
      { value: 'women', label: 'Women', desc: 'Bras, panties, shapewear & more' },
      { value: 'men', label: 'Men', desc: 'Briefs, boxers, trunks & vests' },
    ],
  },
  {
    id: 'height', label: 'What is your height?',
    hint: 'Nearest approximation is fine.',
    options: [
      { value: 'short', label: "Under 5'4\" (162cm)" },
      { value: 'average', label: "5'4\" – 5'8\" (162–172cm)" },
      { value: 'tall', label: "Above 5'8\" (172cm)" },
    ],
  },
  {
    id: 'build', label: 'How would you describe your build?',
    options: [
      { value: 'slim', label: 'Slim / Lean' },
      { value: 'average', label: 'Average / Athletic' },
      { value: 'broad', label: 'Broad / Curvy' },
    ],
  },
  {
    id: 'preference', label: 'How do you prefer your innerwear to fit?',
    options: [
      { value: 'snug', label: 'Snug — close to the body', desc: 'Second-skin feel' },
      { value: 'regular', label: 'Regular — comfortable', desc: 'Room to move' },
      { value: 'relaxed', label: 'Relaxed — a bit looser', desc: 'Easy, casual fit' },
    ],
  },
];

const SIZE_MAP = {
  women: {
    'short-slim-snug': { size: 'XS', us: 2, uk: 6, eu: 32 },
    'short-slim-regular': { size: 'S', us: 4, uk: 8, eu: 34 },
    'short-slim-relaxed': { size: 'S', us: 4, uk: 8, eu: 34 },
    'short-average-snug': { size: 'S', us: 4, uk: 8, eu: 34 },
    'short-average-regular': { size: 'M', us: 6, uk: 10, eu: 36 },
    'short-average-relaxed': { size: 'M', us: 6, uk: 10, eu: 36 },
    'short-broad-snug': { size: 'M', us: 6, uk: 10, eu: 36 },
    'short-broad-regular': { size: 'L', us: 8, uk: 12, eu: 38 },
    'short-broad-relaxed': { size: 'L', us: 8, uk: 12, eu: 38 },
    'average-slim-snug': { size: 'S', us: 4, uk: 8, eu: 34 },
    'average-slim-regular': { size: 'M', us: 6, uk: 10, eu: 36 },
    'average-slim-relaxed': { size: 'M', us: 6, uk: 10, eu: 36 },
    'average-average-snug': { size: 'M', us: 6, uk: 10, eu: 36 },
    'average-average-regular': { size: 'L', us: 8, uk: 12, eu: 38 },
    'average-average-relaxed': { size: 'L', us: 8, uk: 12, eu: 38 },
    'average-broad-snug': { size: 'L', us: 8, uk: 12, eu: 38 },
    'average-broad-regular': { size: 'XL', us: 10, uk: 14, eu: 40 },
    'average-broad-relaxed': { size: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-slim-snug': { size: 'S', us: 4, uk: 8, eu: 34 },
    'tall-slim-regular': { size: 'M', us: 6, uk: 10, eu: 36 },
    'tall-slim-relaxed': { size: 'M', us: 6, uk: 10, eu: 36 },
    'tall-average-snug': { size: 'M', us: 6, uk: 10, eu: 36 },
    'tall-average-regular': { size: 'L', us: 8, uk: 12, eu: 38 },
    'tall-average-relaxed': { size: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-broad-snug': { size: 'L', us: 8, uk: 12, eu: 38 },
    'tall-broad-regular': { size: 'XL', us: 10, uk: 14, eu: 40 },
    'tall-broad-relaxed': { size: 'XXL', us: 12, uk: 16, eu: 42 },
  },
  men: {
    'short-slim-snug': { size: 'S', us: 'S', uk: 'S', eu: 'S' },
    'short-slim-regular': { size: 'M', us: 'M', uk: 'M', eu: 'M' },
    'short-slim-relaxed': { size: 'M', us: 'M', uk: 'M', eu: 'M' },
    'short-average-snug': { size: 'M', us: 'M', uk: 'M', eu: 'M' },
    'short-average-regular': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'short-average-relaxed': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'short-broad-snug': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'short-broad-regular': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'short-broad-relaxed': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'average-slim-snug': { size: 'M', us: 'M', uk: 'M', eu: 'M' },
    'average-slim-regular': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'average-slim-relaxed': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'average-average-snug': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'average-average-regular': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'average-average-relaxed': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'average-broad-snug': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'average-broad-regular': { size: 'XXL', us: 'XXL', uk: 'XXL', eu: 'XXL' },
    'average-broad-relaxed': { size: 'XXL', us: 'XXL', uk: 'XXL', eu: 'XXL' },
    'tall-slim-snug': { size: 'M', us: 'M', uk: 'M', eu: 'M' },
    'tall-slim-regular': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'tall-slim-relaxed': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'tall-average-snug': { size: 'L', us: 'L', uk: 'L', eu: 'L' },
    'tall-average-regular': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'tall-average-relaxed': { size: 'XXL', us: 'XXL', uk: 'XXL', eu: 'XXL' },
    'tall-broad-snug': { size: 'XL', us: 'XL', uk: 'XL', eu: 'XL' },
    'tall-broad-regular': { size: 'XXL', us: 'XXL', uk: 'XXL', eu: 'XXL' },
    'tall-broad-relaxed': { size: '3XL', us: '3XL', uk: '3XL', eu: '3XL' },
  },
};

function loadResult() {
  try { return JSON.parse(localStorage.getItem('hushae.fit') || 'null'); } catch { return null; }
}
function saveResult(r) { localStorage.setItem('hushae.fit', JSON.stringify(r)); }

export default function FitFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(loadResult);

  const current = QUESTIONS[step];
  if (!current) return null;

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

  const previousAnswer = (field) => {
    if (field === 'gender') return answers[field] || 'women';
    return answers[field] || null;
  };

  return (
    <div style={{ background: '#F7F5F1', minHeight: '100vh' }}><Seo title="Fit Finder" description="Find your perfect HUSHAE size in under a minute — no tape measure needed." />
      <div className="container section pt-[190px]">
        {/* Header */}
        {step === 0 && !result && (
          <div className="mb-12 text-center">
            <Ruler size={28} className="mx-auto mb-4 text-obsidian" />
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">HUSHAE Fit Finder</p>
            <h1 className="mt-3 h1">Find your perfect fit</h1>
            <p className="mt-3 body-sm text-ash max-w-md mx-auto">Four questions. No tape measure. We'll calculate your true size across every HUSHAE piece.</p>
          </div>
        )}

        {/* Progress */}
        {!result && (
          <div className="mb-10 flex items-center gap-2 max-w-md mx-auto">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`h-[2px] flex-1 transition-colors ${i < step ? 'bg-obsidian' : i === step ? 'bg-obsidian' : 'bg-line'}`} />
            ))}
            <span className="ml-2 text-[11px] tabular-nums text-ash">{step + 1}/{QUESTIONS.length}</span>
          </div>
        )}

        {/* Question */}
        {!result && current && (
          <div className="max-w-md mx-auto">
            <h2 className="text-[18px] font-medium uppercase tracking-[0.06em] text-obsidian mb-1">{current.label}</h2>
            {current.hint && <p className="text-[13px] text-ash mb-6">{current.hint}</p>}
            <div className="space-y-3">
              {current.options.map((opt) => (
                <button key={opt.value} onClick={() => pick(opt.value)}
                  className="w-full border border-line bg-white p-4 text-left transition-colors hover:border-obsidian">
                  <span className="text-[15px] font-medium text-obsidian">{opt.label}</span>
                  {opt.desc && <span className="mt-1 block text-[12px] text-ash">{opt.desc}</span>}
                </button>
              ))}
            </div>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="mt-6 text-[12px] font-medium uppercase tracking-[0.10em] text-ash hover:text-obsidian">
                ← Back
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="max-w-md mx-auto text-center">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center border-2 border-obsidian">
              <span className="text-[28px] font-medium tabular-nums text-obsidian">{result.size}</span>
            </div>
            <h2 className="h2">Your HUSHAE size is {result.size}</h2>

            {/* Size conversions */}
            <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {[
                { label: 'US', value: result.us },
                { label: 'UK', value: result.uk },
                { label: 'EU', value: result.eu },
              ].map(({ label, value }) => (
                <div key={label} className="border border-line p-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ash">{label}</p>
                  <p className="mt-1 text-[16px] font-medium tabular-nums text-obsidian">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-[13px] text-ash max-w-sm mx-auto">
              This size is saved and will appear on every product page. You can retake anytime.
            </p>

            <div className="mt-8 flex flex-col gap-3 max-w-xs mx-auto">
              <Link to={result.gender === 'women' ? '/women' : '/men'}
                className="min-h-[44px] bg-obsidian text-[12px] font-medium uppercase tracking-[0.10em] text-white flex items-center justify-center transition-opacity hover:opacity-80">
                Shop {result.gender === 'women' ? "Women's" : "Men's"} <ArrowRight size={12} className="ml-1" />
              </Link>
              <button onClick={() => { setStep(0); setAnswers({}); setResult(null); }}
                className="min-h-[44px] border border-line text-[12px] font-medium uppercase tracking-[0.10em] text-ash hover:text-obsidian">
                Retake Fit Finder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
