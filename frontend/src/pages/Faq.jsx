import { useEffect, useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Seo from '../components/Seo';

const DEFAULT_FAQS = [
  {
    question: 'What is HUSHAE’s delivery timeframe & shipping fee?',
    answer: 'We offer Express Delivery nationwide across Pakistan in 2–4 business days. Orders above PKR 4,999 qualify for complimentary shipping. Standard shipping for smaller orders is flat PKR 250.',
  },
  {
    question: 'Is discreet packaging guaranteed?',
    answer: 'Yes, 100%. All HUSHAE orders are dispatched in unmarked, plain, tamper-proof courier packaging with no external product markings.',
  },
  {
    question: 'What is your exchange and return policy?',
    answer: 'We provide a 14-day hassle-free size exchange policy. For hygiene standards, innerwear items must be unworn, unwashed, and in original packaging with tags attached.',
  },
  {
    question: 'Do you offer Cash on Delivery (COD)?',
    answer: 'Yes, Cash on Delivery is available across all cities and towns nationwide in Pakistan.',
  },
  {
    question: 'How do I choose the right size?',
    answer: 'Please consult our interactive Fit Finder tool or reference the size charts on each product detail page for precision sizing.',
  },
];

// Public FAQ page — content comes from Settings (admin-editable via /admin/content).
// Also emits FAQPage JSON-LD schema for Google rich results.
export default function Faq() {
  const { settings } = useApp();
  const [open, setOpen] = useState(0);
  const [items, setItems] = useState(DEFAULT_FAQS);
  const [heading, setHeading] = useState('Frequently Asked Questions');
  const [subheading, setSubheading] = useState('Everything you need to know about sizing, delivery, exchanges, and discreet packaging.');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const f = settings?.faq;
    if (f) {
      setEnabled(f.enabled !== false);
      setHeading(f.heading || 'Frequently Asked Questions');
      setSubheading(f.subheading || 'Everything you need to know about sizing, delivery, exchanges, and discreet packaging.');
      const custom = Array.isArray(f.items) ? f.items.filter((x) => x?.question && x?.answer) : [];
      setItems(custom.length > 0 ? custom : DEFAULT_FAQS);
    }
  }, [settings]);

  const jsonLd = items.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  } : null;

  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-[130px] pb-16 text-center">
        <p className="text-ash">FAQ page currently unavailable.</p>
      </div>
    );
  }

  return (
    <>
      <Seo
        title={heading}
        description={subheading || 'Sizing, shipping, returns, payments — sab sawaal ka jawab yahan mojood hai.'}
        canonical="/faq"
        jsonLd={jsonLd}
        jsonLdId="faq"
      />
      <div className="mx-auto max-w-3xl px-4 pt-[130px] pb-12 md:pb-16">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-satin">
            <HelpCircle size={22} className="text-obsidian" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl">{heading}</h1>
          {subheading && <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ash">{subheading}</p>}
        </div>

        {items.length === 0 ? (
          <p className="py-12 text-center text-ash">Koi FAQ mojood nahi — jald hi update karengay.</p>
        ) : (
          <div className="space-y-3">
            {items.map((it, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-alabaster"
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-[15px] md:text-base">{it.question}</span>
                    <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line bg-alabaster/50 px-5 py-4 text-sm leading-relaxed text-obsidian/80">
                      {it.answer.split('\n').map((line, k) => (
                        <p key={k} className={k > 0 ? 'mt-2' : ''}>{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-14 rounded-2xl border border-line bg-alabaster/60 p-6 text-center">
          <p className="text-sm text-obsidian/80">Aur koi sawaal hai?</p>
          <p className="mt-1 text-xs text-ash">Hum se seedha rabta karein — jawab jaldi milega.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href="/track" className="btn-ghost text-xs">Track your order</a>
            <a href="/fit-finder" className="btn-ghost text-xs">Fit Finder</a>
          </div>
        </div>
      </div>
    </>
  );
}
