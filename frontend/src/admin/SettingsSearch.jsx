import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum, EdNotice,
  TableSkeleton, EditorialError, ctl, btnGhost, btnSolid,
} from './settings/chrome';

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
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings };
        setS(next);
        setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  const dirty = useMemo(() => original && JSON.stringify(s) !== original, [s, original]);

  if (!s && !err) {
    return <AdminLayout title="Search"><PageHeader title="Search & Discovery" description="What customers can search." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Search">
        <PageHeader title="Search & Discovery" description="What customers can search." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

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
      <PageHeader
        title="Search & Discovery"
        description="What customers can search, how forgiving it is, and what the assistant understands."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Search' }]}
        actions={<Link to="/admin/search-analytics" className={btnGhost}>Analytics</Link>}
      />

      {problems.length > 0 && (
        <EdNotice>
          <ul className="list-disc space-y-1 pl-5">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </EdNotice>
      )}

      <EdSection index={1} title="General">
        <EdToggle label="Enable search" checked={S.enabled !== false} onChange={(v) => set('enabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Placeholder text" value={S.placeholder} onChange={(v) => set('placeholder', v)} />
          <EdNum label="Start searching after (characters)" value={S.minChars} onChange={(v) => set('minChars', v)} min="1" max="5" hint="Lower feels faster but costs more requests." />
          <EdNum label="Wait after typing (ms)" value={S.debounceMs} onChange={(v) => set('debounceMs', v)} min="0" max="1000" step="10" hint="Stops a request firing on every keystroke." />
          <EdNum label="Results per page" value={S.perPage} onChange={(v) => set('perPage', v)} min="6" max="60" />
        </div>
      </EdSection>

      <EdSection index={2} title="What gets searched" description="Turn a field off and its contents become invisible to search.">
        <div className="space-y-1">
          {Object.keys(FIELD_LABELS).map((k) => (
            <div key={k} className="flex flex-wrap items-center gap-3 border-b border-white/5 py-2 last:border-0">
              <label className="flex min-h-[44px] flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={S.fields?.[k] !== false} onChange={(e) => setG('fields', k, e.target.checked)} className="h-4 w-4 accent-white" />
                <span className="text-[13px] text-white/85">{FIELD_LABELS[k]}</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.16em] text-white/35" htmlFor={`w-${k}`}>Weight</label>
                <input
                  id={`w-${k}`} type="number" min="0" max="200"
                  className={`${ctl} w-[90px]`} value={S.weights?.[k] ?? 0}
                  disabled={S.fields?.[k] === false}
                  onChange={(e) => setG('weights', k, Number(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </div>
      </EdSection>

      <EdSection index={3} title="Spelling mistakes" description="When an exact search finds nothing, close spellings are tried instead.">
        <EdToggle label="Forgive typos" checked={S.fuzzy?.enabled !== false} onChange={(v) => setG('fuzzy', 'enabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <EdNum label="Only for words longer than" value={S.fuzzy?.minTermLen} onChange={(v) => setG('fuzzy', 'minTermLen', v)} min="3" max="10" disabled={S.fuzzy?.enabled === false} hint="Short words like “bra” would match too much." />
          <EdNum label="Letters allowed to differ" value={S.fuzzy?.maxDistance} onChange={(v) => setG('fuzzy', 'maxDistance', v)} min="1" max="3" disabled={S.fuzzy?.enabled === false} />
          <EdNum label="Score penalty per letter" value={S.fuzzy?.penalty} onChange={(v) => setG('fuzzy', 'penalty', v)} min="0" max="100" disabled={S.fuzzy?.enabled === false} hint="Keeps corrected matches below exact ones." />
        </div>
      </EdSection>

      <EdSection index={4} title="Synonyms" description="Teach the search that two words mean the same thing.">
        <div className="space-y-2">
          {synonyms.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 border-b border-white/5 py-2">
              <input className={`${ctl} max-w-[160px]`} value={x.from} aria-label={`Synonym ${i + 1}, first word`} onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, from: e.target.value.toLowerCase() } : y)))} />
              <span aria-hidden className="text-[13px] text-white/35">{x.both !== false ? '↔' : '→'}</span>
              <input className={`${ctl} max-w-[160px]`} value={x.to} aria-label={`Synonym ${i + 1}, second word`} onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, to: e.target.value.toLowerCase() } : y)))} />
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[12px] text-white/50">
                <input type="checkbox" checked={x.both !== false} className="h-4 w-4 accent-white" onChange={(e) => set('synonyms', synonyms.map((y, j) => (j === i ? { ...y, both: e.target.checked } : y)))} />
                Both ways
              </label>
              <button type="button" onClick={() => set('synonyms', synonyms.filter((_, j) => j !== i))} aria-label={`Remove synonym ${x.from} and ${x.to}`} className={`${btnGhost} ml-auto`}>Remove</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className={`${ctl} max-w-[160px]`} placeholder="customer's word" aria-label="New synonym, customer's word" value={newSyn.from} onChange={(e) => setNewSyn({ ...newSyn, from: e.target.value })} />
          <span aria-hidden className="text-[13px] text-white/35">↔</span>
          <input className={`${ctl} max-w-[160px]`} placeholder="your word" aria-label="New synonym, your word" value={newSyn.to} onChange={(e) => setNewSyn({ ...newSyn, to: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSyn(); } }} />
          <button type="button" onClick={addSyn} className={btnSolid}>Add</button>
        </div>
      </EdSection>

      <EdSection index={5} title="Ignored words" description="Words skipped when searching. A search made entirely of ignored words falls back to the original text.">
        <div className="flex flex-wrap gap-2">
          {stopWords.map((w, i) => (
            <span key={`${w}-${i}`} className="inline-flex min-h-[36px] items-center gap-2 border border-white/15 px-3 text-[12px] text-white/70">
              {w}
              <button type="button" onClick={() => set('stopWords', stopWords.filter((_, j) => j !== i))} aria-label={`Remove ignored word ${w}`} className="text-white/35 hover:text-white">×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label htmlFor="new-stop" className="sr-only">New ignored word</label>
          <input
            id="new-stop" className={`${ctl} max-w-[200px]`} placeholder="add a word" value={newStop}
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
            className={btnGhost}
          >
            Add
          </button>
        </div>
      </EdSection>

      <EdSection index={6} title="Suggestions">
        <EdToggle label="Show suggestions" checked={S.suggest?.enabled !== false} onChange={(v) => setG('suggest', 'enabled', v)} />
        <EdToggle label="Show product photos" checked={S.suggest?.showImages !== false} onChange={(v) => setG('suggest', 'showImages', v)} disabled={S.suggest?.enabled === false} />
        <EdToggle label="Show prices" checked={S.suggest?.showPrices !== false} onChange={(v) => setG('suggest', 'showPrices', v)} disabled={S.suggest?.enabled === false} />
        <EdToggle label="Highlight the matching letters" checked={S.suggest?.highlightMatch !== false} onChange={(v) => setG('suggest', 'highlightMatch', v)} disabled={S.suggest?.enabled === false} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <EdNum label="Products shown" value={S.suggest?.maxProducts} onChange={(v) => setG('suggest', 'maxProducts', v)} min="1" max="12" disabled={S.suggest?.enabled === false} />
          <EdNum label="Categories shown" value={S.suggest?.maxCategories} onChange={(v) => setG('suggest', 'maxCategories', v)} min="0" max="8" disabled={S.suggest?.enabled === false} />
          <EdNum label="Word suggestions" value={S.suggest?.maxTerms} onChange={(v) => setG('suggest', 'maxTerms', v)} min="0" max="8" disabled={S.suggest?.enabled === false} />
        </div>
      </EdSection>

      <EdSection index={7} title="Recent & trending">
        <EdToggle label="Remember recent searches on the customer's device" description="Kept only in their browser — never on your server." checked={S.history?.enabled !== false} onChange={(v) => setG('history', 'enabled', v)} />
        <EdToggle label="Show trending searches" checked={S.trending?.enabled !== false} onChange={(v) => setG('trending', 'enabled', v)} />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <EdNum label="Recent searches kept" value={S.history?.maxItems} onChange={(v) => setG('history', 'maxItems', v)} min="1" max="20" />
          <EdNum label="Trending counted over (days)" value={S.trending?.windowDays} onChange={(v) => setG('trending', 'windowDays', v)} min="1" max="90" />
          <EdNum label="Minimum searches to trend" value={S.trending?.minCount} onChange={(v) => setG('trending', 'minCount', v)} min="1" max="50" hint="Below this it is noise, not a trend." />
        </div>
        <div className="mt-4">
          <EdText
            label="Always show these terms first (comma separated)"
            value={(S.trending?.manual || []).join(', ')}
            onChange={(v) => setG('trending', 'manual', v.split(',').map((x) => x.trim()).filter(Boolean))}
            hint="A new store has no search history — this is how you seed it."
          />
        </div>
      </EdSection>

      <EdSection index={8} title="When nothing is found">
        <EdToggle label="Suggest trending searches" checked={S.noResults?.showTrending !== false} onChange={(v) => setG('noResults', 'showTrending', v)} />
        <EdToggle label="Show popular products" checked={S.noResults?.showPopular !== false} onChange={(v) => setG('noResults', 'showPopular', v)} />
        <div className="mt-4">
          <EdText label="Message" value={S.noResults?.message} onChange={(v) => setG('noResults', 'message', v)} />
        </div>
      </EdSection>

      <EdSection index={9} title="Shopping assistant" description="Answers questions like “a gift for my husband under 2000”. Runs on your own server.">
        <EdToggle label="Enable the assistant" checked={D.assistant?.enabled !== false} onChange={(v) => setD('assistant', 'enabled', v)} />
        <EdToggle label="Show it on search and shop pages" checked={D.assistant?.showOnShop !== false} onChange={(v) => setD('assistant', 'showOnShop', v)} disabled={D.assistant?.enabled === false} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Panel title" value={D.assistant?.title} onChange={(v) => setD('assistant', 'title', v)} disabled={D.assistant?.enabled === false} />
          <EdText label="Button label" value={D.assistant?.buttonLabel} onChange={(v) => setD('assistant', 'buttonLabel', v)} disabled={D.assistant?.enabled === false} />
          <EdText label="Opening line" value={D.assistant?.intro} onChange={(v) => setD('assistant', 'intro', v)} disabled={D.assistant?.enabled === false} />
          <EdNum label="Products per answer" value={D.assistant?.maxResults} onChange={(v) => setD('assistant', 'maxResults', v)} min="1" max="12" disabled={D.assistant?.enabled === false} />
        </div>
      </EdSection>

      <EdSection index={10} title="Recommendations">
        <EdToggle label="Show similar products" checked={D.similar?.enabled !== false} onChange={(v) => setD('similar', 'enabled', v)} />
        <EdToggle label="Show often bought together" checked={D.boughtTogether?.enabled !== false} onChange={(v) => setD('boughtTogether', 'enabled', v)} />
        <EdToggle label="Show popular right now" checked={D.popular?.enabled !== false} onChange={(v) => setD('popular', 'enabled', v)} />
        <EdToggle label="Personalised picks from browsing history" checked={D.personalized?.enabled !== false} onChange={(v) => setD('personalized', 'enabled', v)} />
      </EdSection>

      <EdSection index={11} title="Voice search" description="Architecture is in place but switched off.">
        <EdToggle label="Show the voice search button" checked={S.voice?.enabled === true} onChange={(v) => setG('voice', 'enabled', v)} />
      </EdSection>

      <EdSection index={12} title="Analytics">
        <EdToggle label="Record what customers search for" description="Anonymous. Powers the zero-result report." checked={S.analytics?.enabled !== false} onChange={(v) => setG('analytics', 'enabled', v)} />
        <EdToggle label="Record which results are clicked" checked={S.analytics?.logClicks !== false} onChange={(v) => setG('analytics', 'logClicks', v)} disabled={S.analytics?.enabled === false} />
        <div className="mt-4">
          <EdNum label="Keep records for (days)" value={S.analytics?.retainDays} onChange={(v) => setG('analytics', 'retainDays', v)} min="7" max="730" disabled={S.analytics?.enabled === false} />
        </div>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} disabled={problems.length > 0} />
    </AdminLayout>
  );
}
