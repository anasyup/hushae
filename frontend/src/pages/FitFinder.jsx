import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Ruler } from 'lucide-react';
import { useApp } from '../store/AppContext';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function FitFinder() {
  const { settings } = useApp();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ gender: '', frame: '', usual: '', fit: '', band: '', cup: '' });
  const set = (k, v) => setA((x) => ({ ...x, [k]: v }));

  const steps = [
    {
      key: 'gender', q: 'Who are we fitting?', opts: [['women', 'For her'], ['men', 'For him']],
    },
    {
      key: 'frame', q: 'How would you describe your build?',
      opts: a.gender === 'women'
        ? [['petite', 'Petite / slim'], ['regular', 'Regular'], ['curvy', 'Curvy / broad']]
        : [['slim', 'Slim'], ['regular', 'Regular'], ['broad', 'Broad / athletic']],
    },
    { key: 'usual', q: 'Your usual shirt / top size?', opts: SIZES.map((s) => [s, s]) },
    {
      key: 'fit', q: 'How do you like your fit?',
      opts: [['relaxed', 'Relaxed — easy and roomy'], ['regular', 'Regular — just right'], ['snug', 'Snug — supportive and close']],
    },
  ];

  const done = step >= steps.length;

  const recommend = () => {
    const i = SIZES.indexOf(a.usual);
    let size = i;
    if (['petite', 'slim'].includes(a.frame) && a.fit === 'snug') size = Math.max(0, i - 1);
    if (['curvy', 'broad'].includes(a.frame) && a.fit === 'relaxed') size = Math.min(SIZES.length - 1, i + 1);
    if (a.fit === 'snug' && i >= 2) size = Math.max(0, size - 0); // keep
    const letter = SIZES[Math.max(0, Math.min(SIZES.length - 1, size))];
    const bra = a.band && a.cup ? `${a.band}${a.cup}` : null;
    return { letter, bra };
  };
  const r = done ? recommend() : null;

  const canNext = !!a[steps[Math.min(step, steps.length - 1)].key];

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 md:px-8">
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-control border border-line bg-satin text-obsidian"><Ruler size={22} strokeWidth={1.4} /></span>
        <h1 className="mt-5 font-display text-4xl">Fit Finder</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ash">Four questions. One true size. {settings?.tagline}</p>
      </div>

      {/* Progress */}
      <div className="mx-auto mt-8 flex max-w-sm items-center gap-2">
        {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step - 1 || done ? 'bg-sagedeep' : i === step ? 'bg-ash/50' : 'bg-line'}`} />)}
      </div>

      <div className="mt-10">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              <p className="text-center font-display text-2xl">{steps[step].q}</p>
              <div className="mx-auto mt-8 grid max-w-md gap-3">
                {steps[step].opts.map(([v, l]) => (
                  <button key={v} onClick={() => { set(steps[step].key, v); }}
                    className={`rounded-control min-h-[44px] border px-5 py-4 text-left text-body-sm font-medium transition ${a[steps[step].key] === v ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line hover:border-obsidian/50'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {a.gender === 'women' && step === 2 && (
                <div className="mx-auto mt-8 max-w-md rounded-control bg-satin/50 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-ash">Optional — bra size? (band + cup)</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['32', '34', '36', '38'].map((b) => (
                      <button key={b} onClick={() => set('band', a.band === b ? '' : b)}
                        className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold ${a.band === b ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line bg-white/60'}`}>{b}</button>
                    ))}
                    {['A', 'B', 'C', 'D'].map((c) => (
                      <button key={c} onClick={() => set('cup', a.cup === c ? '' : c)}
                        className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold ${a.cup === c ? 'border-sagedeep bg-sage/25 text-sagedeep' : 'border-line bg-white/60'}`}>{c}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mx-auto mt-10 flex max-w-md justify-between">
                <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-outline !px-5 !py-2.5 !text-[11px] disabled:opacity-0"><ArrowLeft size={14} /> Back</button>
                <button onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary !px-5 !py-2.5 !text-[11px]">{step === steps.length - 1 ? 'See my size' : 'Next'} <ArrowRight size={14} /></button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-control bg-sage/25 text-sagedeep"><Check size={26} strokeWidth={2} /></span>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-ash">Your recommended size</p>
              <p className="mt-2 font-display text-6xl">{r.letter}</p>
              {r.bra && <p className="mt-2 text-sm text-ash">For bras, start from <b className="text-obsidian">{r.bra}</b> — sister sizes may also work.</p>}
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ash">
                Based on your build and how you like things to feel. Between sizes? Size down for {a.fit === 'snug' ? 'a cleaner line' : 'support'}, up for ease.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <Link to={`/${a.gender}`} className="btn-primary">Shop for {a.gender === 'women' ? 'her' : 'him'}</Link>
                <button onClick={() => { setStep(0); setA({ gender: '', frame: '', usual: '', fit: '', band: '', cup: '' }); }} className="btn-outline">Start over</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
