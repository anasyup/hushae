import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → SETTINGS → SEARCH & DISCOVERY
 *
 * Writes exactly two top-level fields: `search` and `discovery`. Nothing else
 * on the settings document is touched, so this screen cannot clobber values
 * another page is editing.
 * ========================================================================== */

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex min-h-[44px] items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-55' : 'cursor-pointer hover:border-neutral-300'}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-neutral-600">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

const Num = ({ label, hint, value, onChange, disabled, ...rest }) => {
  const id = useId();
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={id}>{label}</label>
      <input
        id={id} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" value={value ?? 0} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} {...rest}
      />
      {hint && <p id={`${id}-h`} className="mt-1.5 text-[12px] leading-relaxed text-neutral-600">{hint}</p>}
    </div>
  );
};

const Text = ({ label, hint, value, onChange, disabled, ...rest }) => {
  const id = useId();
  return (
    <div>
      <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500" htmlFor={id}>{label}</label>
      <input
        id={id} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={value ?? ''} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)} {...rest}
      />
      {hint && <p id={`${id}-h`} className="mt-1.5 text-[12px] leading-relaxed text-neutral-600">{hint}</p>}
    </div>
  );
};

const FIELD_LABELS = {
  name: 'Product name', sku: 'SKU / product code', category: 'Category',
  tags: 'Tags', colors: 'Colour names', sizes: 'Sizes', fabric: 'Fabric',
  badges: 'Feature badges', description: 'Description',
};

export default function SettingsSearch() {
  const { auth, toast } = useApp();
  const [params] = useSearchParams();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [newSyn, setNewSyn] = useState({ from: params.get('add') || '', to: '' });
  const [newStop, setNewStop] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
  }, []); // eslint-disable-line

  const dirty = useMemo(() => original && JSON.stringify(s) !== original, [s, original]);
  if (!s) return <AdminLayout title="Search"><div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" /></AdminLayout>;

  const S = s.search || {};
  const D = s.discovery || {};
  const set = (k, v) => setS({ ...s, search: { ...S, [k]: v } });
  const setG = (g, k, v) => setS({ ...s, search: { ...S, [g]: { ...(S[g] || {}), [k]: v } } });
  const setD = (g, k, v) => setS({ ...s, discovery: { ...D, [g]: { ...(D[g] || {}), [k]: v } } });

  const synonyms = Array.isArray(S.synonyms) ? S.synonyms : [];
  const stopWords = Array.isArray(S.stopWords) ? S.stopWords : [];

  const addSyn = () => {
    const from = newSyn.from.trim().toLowerCase();
    const to = newSyn.to.trim().toLowerCase();
    if (!from || !to) { toast('Both words are needed'); return; }
    if (from === to) { toast('The two words are the same'); return; }
    set('synonyms', [...synonyms, { from, to, both: true }]);
    setNewSyn({ from: '', to: '' });
  };

  const problems = [];
  if (S.minChars < 1) problems.push('Minimum characters must be at least 1.');
  if (synonyms.some((x) => !x.from || !x.to)) problems.push('A synonym pair is missing a word.');

  const save = async () => {
    if (problems.length) { toast('Fix the problems first'); return; }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { search: S, discovery: D } });
      setOriginal(JSON.stringify(s));
      toast('Search settings saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Search & Discovery">
      <Link to="/admin/settings" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Search size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Search & Discovery</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
              What customers can search, how forgiving it is, and what the assistant understands.
            </p>
          </div>
        </div>
        <Link to="/admin/search-analytics" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
          <BarChart3 size={13} /> Analytics
        </Link>
      </div>

      {problems.length > 0 && (
        <div role="alert" className="mb-5 rounded-2xl border border-[#CDB98F] bg-[#F6F1E6] p-4">
          <ul className="list-disc space-y-1 pl-5 text-[12px] text-[#5C4A28]">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <Section title="General">
          <div className="space-y-3">
            <Toggle label="Enable search" checked={S.enabled !== false} onChange={(v) => set('enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Placeholder text" value={S.placeholder} onChange={(v) => set('placeholder', v)} />
            <Num label="Start searching after (characters)" value={S.minChars} onChange={(v) => set('minChars', v)} min="1" max="5" hint="Lower feels faster but costs more requests." />
            <Num label="Wait after typing (ms)" value={S.debounceMs} onChange={(v) => set('debounceMs', v)} min="0" max="1000" step="10" hint="Stops a request firing on every keystroke." />
            <Num label="Results per page" value={S.perPage} onChange={(v) => set('perPage', v)} min="6" max="60" />
          </div>
        </Section>

        <Section
          title="What gets searched"
          description="Turn a field off and its contents become invisible to search. The weight decides how much a match there counts — a name match should always beat a description match."
        >
          <div className="space-y-2">
            {Object.keys(FIELD_LABELS).map((k) => (
              <div key={k} className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 px-4 py-2.5">
                <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={S.fields?.[k] !== false}
                    onChange={(e) => setG('fields', k, e.target.checked)}
                    className="h-4 w-4 accent-neutral-900"
                  />
                  <span className="text-[13px] font-medium text-neutral-900">{FIELD_LABELS[k]}</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-neutral-600" htmlFor={`w-${k}`}>Weight</label>
                  <input
                    id={`w-${k}`} type="number" min="0" max="200"
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[90px]" value={S.weights?.[k] ?? 0}
                    disabled={S.fields?.[k] === false}
                    onChange={(e) => setG('weights', k, Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Spelling mistakes"
          description="When an exact search finds nothing, close spellings are tried instead. Measured before this existed: “coton” returned zero results."
        >
          <div className="space-y-3">
            <Toggle label="Forgive typos" checked={S.fuzzy?.enabled !== false} onChange={(v) => setG('fuzzy', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Num label="Only for words longer than" value={S.fuzzy?.minTermLen} onChange={(v) => setG('fuzzy', 'minTermLen', v)} min="3" max="10" disabled={S.fuzzy?.enabled === false} hint="Short words like “bra” would match too much." />
            <Num label="Letters allowed to differ" value={S.fuzzy?.maxDistance} onChange={(v) => setG('fuzzy', 'maxDistance', v)} min="1" max="3" disabled={S.fuzzy?.enabled === false} />
            <Num label="Score penalty per letter" value={S.fuzzy?.penalty} onChange={(v) => setG('fuzzy', 'penalty', v)} min="0" max="100" disabled={S.fuzzy?.enabled === false} hint="Keeps corrected matches below exact ones." />
          </div>
        </Section>

        {/* ---- synonyms ---- */}
        <Section
          title="Synonyms"
          description="Teach the search that two words mean the same thing. Your customers may not use your product names — “panty” finds briefs, “banyan” finds vests."
        >
          <div className="space-y-2">
            {synonyms.map((x, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[160px]" value={x.from} aria-label={`Synonym ${i + 1}, first word`}
                  onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, from: e.target.value.toLowerCase() } : y)))}
                />
                <span aria-hidden="true" className="text-[13px] text-neutral-600">{x.both !== false ? '↔' : '→'}</span>
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[160px]" value={x.to} aria-label={`Synonym ${i + 1}, second word`}
                  onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, to: e.target.value.toLowerCase() } : y)))}
                />
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[12px] text-neutral-600">
                  <input
                    type="checkbox" checked={x.both !== false} className="h-4 w-4 accent-neutral-900"
                    onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, both: e.target.checked } : y)))}
                  />
                  Both ways
                </label>
                <button
                  type="button"
                  onClick={() => set('synonyms', synonyms.filter((_, j) => j !== i))}
                  aria-label={`Remove synonym ${x.from} and ${x.to}`}
                  className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-[#9A5548] transition hover:bg-[#F5EDEB]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-2">
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[160px]" placeholder="customer's word" aria-label="New synonym, customer's word"
              value={newSyn.from} onChange={(e) => setNewSyn({ ...newSyn, from: e.target.value })}
            />
            <span aria-hidden="true" className="text-[13px] text-neutral-600">↔</span>
            <input
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[160px]" placeholder="your word" aria-label="New synonym, your word"
              value={newSyn.to} onChange={(e) => setNewSyn({ ...newSyn, to: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSyn(); } }}
            />
            <button type="button" onClick={addSyn} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[12px] font-semibold text-white transition hover:bg-neutral-800">
              <Plus size={13} /> Add
            </button>
          </div>
        </Section>

        {/* ---- stop words ---- */}
        <Section
          title="Ignored words"
          description="Words skipped when searching, so “a bra for me” searches for “bra”. Never all of them — a search made entirely of ignored words falls back to the original text."
        >
          <div className="flex flex-wrap gap-2">
            {stopWords.map((w, i) => (
              <span key={`${w}-${i}`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 text-[12px] text-neutral-700">
                {w}
                <button
                  type="button"
                  onClick={() => set('stopWords', stopWords.filter((_, j) => j !== i))}
                  aria-label={`Remove ignored word ${w}`}
                  className="grid h-11 w-11 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label htmlFor="new-stop" className="sr-only">New ignored word</label>
            <input
              id="new-stop" className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 max-w-[200px]" placeholder="add a word" value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const w = newStop.trim().toLowerCase();
                if (w && !stopWords.includes(w)) set('stopWords', [...stopWords, w]);
                setNewStop('');
              }}
            />
            <button
              type="button"
              onClick={() => {
                const w = newStop.trim().toLowerCase();
                if (w && !stopWords.includes(w)) set('stopWords', [...stopWords, w]);
                setNewStop('');
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              <Plus size={13} /> Add
            </button>
          </div>
        </Section>

        <Section title="Suggestions" description="The dropdown that appears as a customer types.">
          <div className="space-y-3">
            <Toggle label="Show suggestions" checked={S.suggest?.enabled !== false} onChange={(v) => setG('suggest', 'enabled', v)} />
            <Toggle label="Show product photos" checked={S.suggest?.showImages !== false} onChange={(v) => setG('suggest', 'showImages', v)} disabled={S.suggest?.enabled === false} />
            <Toggle label="Show prices" checked={S.suggest?.showPrices !== false} onChange={(v) => setG('suggest', 'showPrices', v)} disabled={S.suggest?.enabled === false} />
            <Toggle label="Highlight the matching letters" checked={S.suggest?.highlightMatch !== false} onChange={(v) => setG('suggest', 'highlightMatch', v)} disabled={S.suggest?.enabled === false} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Num label="Products shown" value={S.suggest?.maxProducts} onChange={(v) => setG('suggest', 'maxProducts', v)} min="1" max="12" disabled={S.suggest?.enabled === false} />
            <Num label="Categories shown" value={S.suggest?.maxCategories} onChange={(v) => setG('suggest', 'maxCategories', v)} min="0" max="8" disabled={S.suggest?.enabled === false} />
            <Num label="Word suggestions" value={S.suggest?.maxTerms} onChange={(v) => setG('suggest', 'maxTerms', v)} min="0" max="8" disabled={S.suggest?.enabled === false} />
          </div>
        </Section>

        <Section title="Recent & trending">
          <div className="space-y-3">
            <Toggle label="Remember recent searches on the customer's device" description="Kept only in their browser — never on your server." checked={S.history?.enabled !== false} onChange={(v) => setG('history', 'enabled', v)} />
            <Toggle label="Show trending searches" checked={S.trending?.enabled !== false} onChange={(v) => setG('trending', 'enabled', v)} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Num label="Recent searches kept" value={S.history?.maxItems} onChange={(v) => setG('history', 'maxItems', v)} min="1" max="20" />
            <Num label="Trending counted over (days)" value={S.trending?.windowDays} onChange={(v) => setG('trending', 'windowDays', v)} min="1" max="90" />
            <Num label="Minimum searches to trend" value={S.trending?.minCount} onChange={(v) => setG('trending', 'minCount', v)} min="1" max="50" hint="Below this it is noise, not a trend." />
          </div>
          <div className="mt-4">
            <Text
              label="Always show these terms first (comma separated)"
              value={(S.trending?.manual || []).join(', ')}
              onChange={(v) => setG('trending', 'manual', v.split(',').map((x) => x.trim()).filter(Boolean))}
              hint="A new store has no search history — this is how you seed it."
            />
          </div>
        </Section>

        <Section title="When nothing is found">
          <div className="space-y-3">
            <Toggle label="Suggest trending searches" checked={S.noResults?.showTrending !== false} onChange={(v) => setG('noResults', 'showTrending', v)} />
            <Toggle label="Show popular products" checked={S.noResults?.showPopular !== false} onChange={(v) => setG('noResults', 'showPopular', v)} />
          </div>
          <div className="mt-4">
            <Text label="Message" value={S.noResults?.message} onChange={(v) => setG('noResults', 'message', v)} />
          </div>
        </Section>

        <Section title="Shopping assistant" description="Answers questions like “a gift for my husband under 2000”. Runs entirely on your own server — no outside service, no per-question cost.">
          <div className="space-y-3">
            <Toggle label="Enable the assistant" checked={D.assistant?.enabled !== false} onChange={(v) => setD('assistant', 'enabled', v)} />
            <Toggle label="Show it on search and shop pages" checked={D.assistant?.showOnShop !== false} onChange={(v) => setD('assistant', 'showOnShop', v)} disabled={D.assistant?.enabled === false} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Panel title" value={D.assistant?.title} onChange={(v) => setD('assistant', 'title', v)} disabled={D.assistant?.enabled === false} />
            <Text label="Button label" value={D.assistant?.buttonLabel} onChange={(v) => setD('assistant', 'buttonLabel', v)} disabled={D.assistant?.enabled === false} />
            <Text label="Opening line" value={D.assistant?.intro} onChange={(v) => setD('assistant', 'intro', v)} disabled={D.assistant?.enabled === false} />
            <Num label="Products per answer" value={D.assistant?.maxResults} onChange={(v) => setD('assistant', 'maxResults', v)} min="1" max="12" disabled={D.assistant?.enabled === false} />
          </div>
        </Section>

        <Section title="Recommendations">
          <div className="space-y-3">
            <Toggle label="Show similar products" checked={D.similar?.enabled !== false} onChange={(v) => setD('similar', 'enabled', v)} />
            <Toggle label="Show “often bought together”" checked={D.boughtTogether?.enabled !== false} onChange={(v) => setD('boughtTogether', 'enabled', v)} />
            <Toggle label="Show “popular right now”" checked={D.popular?.enabled !== false} onChange={(v) => setD('popular', 'enabled', v)} />
            <Toggle label="Personalised picks from browsing history" checked={D.personalized?.enabled !== false} onChange={(v) => setD('personalized', 'enabled', v)} />
          </div>
        </Section>

        <Section title="Voice search" description="Architecture is in place but switched off. Turning it on shows a microphone button; browser support in Pakistan is uneven, so test before announcing it.">
          <div className="space-y-3">
            <Toggle label="Show the voice search button" checked={S.voice?.enabled === true} onChange={(v) => setG('voice', 'enabled', v)} />
          </div>
        </Section>

        <Section title="Analytics">
          <div className="space-y-3">
            <Toggle label="Record what customers search for" description="Anonymous. Powers the zero-result report, which is how you learn what to stock." checked={S.analytics?.enabled !== false} onChange={(v) => setG('analytics', 'enabled', v)} />
            <Toggle label="Record which results are clicked" checked={S.analytics?.logClicks !== false} onChange={(v) => setG('analytics', 'logClicks', v)} disabled={S.analytics?.enabled === false} />
          </div>
          <div className="mt-4">
            <Num label="Keep records for (days)" value={S.analytics?.retainDays} onChange={(v) => setG('analytics', 'retainDays', v)} min="7" max="730" disabled={S.analytics?.enabled === false} />
          </div>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="min-h-[44px] rounded-lg border border-white/20 px-3 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy || problems.length > 0} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white px-4 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
