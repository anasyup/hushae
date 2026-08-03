import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Download, MousePointerClick, Search, SettingsIcon, TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → SEARCH ANALYTICS
 *
 * The point of this screen is not the numbers, it is the decisions:
 *   · zero-result searches say what to stock, or what to add a synonym for
 *   · top keywords say what to feature on the home page
 *   · a keyword searched often but never clicked says the results are wrong
 *
 * Everything is read-only. The rules live in Settings → Search.
 * ========================================================================== */

const num = (n) => Number(n || 0).toLocaleString('en-PK');

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${tone === 'warn' ? 'border-amber-300' : 'border-neutral-200'}`}>
      <p className="text-[11px] uppercase tracking-wider text-neutral-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-600">{sub}</p>}
    </div>
  );
}

function Table({ title, description, rows, cols, empty }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-600">{title}</p>
      {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">{description}</p>}
      {!rows?.length ? (
        <p className="mt-4 rounded-xl bg-neutral-50 px-4 py-6 text-center text-[12px] text-neutral-600">{empty}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{title}</caption>
            <thead className="text-[11px] uppercase tracking-wider text-neutral-600">
              <tr>{cols.map((c) => (
                <th key={c.key} scope="col" className={`pb-2 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c.key} className={`py-2.5 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {c.render ? c.render(r) : r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function SearchAnalytics() {
  const { auth, toast } = useApp();
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!auth?.token) return;
    setLoading(true);
    api(`/search/admin/stats?days=${days}`, { token: auth.token })
      .then(setD)
      .catch(() => toast('Could not load search analytics'))
      .finally(() => setLoading(false));
  }, [auth?.token, days, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auth?.token) return;
    api('/search/admin/data-quality', { token: auth.token }).then(setQuality).catch(() => {});
  }, [auth?.token]);

  const exportCsv = async () => {
    try {
      const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/search/admin/export?days=${days}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `search-analytics-${days}d.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message || 'Export failed'); }
  };

  return (
    <AdminLayout title="Search analytics">
      <Link to="/admin/settings" className="mb-4 -ml-1 inline-flex min-h-[44px] items-center gap-1.5 px-1 text-[12px] font-semibold text-neutral-600 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-neutral-200 pb-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
            <Search size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="font-sans text-2xl leading-tight text-neutral-900">Search analytics</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">
              What customers look for, and what they fail to find.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="sa-days" className="sr-only">Time period</label>
          <select
            id="sa-days" value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-[44px] max-w-[150px]"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button type="button" onClick={exportCsv} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <Download size={13} /> Export CSV
          </button>
          <Link to="/admin/settings/search" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">
            <SettingsIcon size={13} /> Rules
          </Link>
        </div>
      </div>

      {/* The cards are always mounted, with a dash while loading. Mounting them
          only once data arrives shifts everything below them down. */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Searches" value={d ? num(d.searches) : '—'} />
        <Stat label="Found nothing" value={d ? num(d.zeroResults) : '—'} sub={d ? `${d.zeroRate}% of searches` : '\u00A0'} tone={d?.zeroRate > 20 ? 'warn' : undefined} />
        <Stat label="Clicked a result" value={d ? `${d.clickRate}%` : '—'} sub={d ? `${num(d.clicks)} clicks` : '\u00A0'} />
        <Stat label="Led to an order" value={d ? `${d.conversionRate}%` : '—'} sub={d ? `${num(d.conversions)} orders` : '\u00A0'} />
        <Stat label="Typos corrected" value={d ? num(d.fuzzyUsed) : '—'} sub="spelling forgiven" />
      </div>

      {loading && !d ? (
        <div className="animate-pulse rounded-xl bg-neutral-100 h-96 w-full" />
      ) : (
        <div className="space-y-5">
          {d?.searches === 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <p className="font-sans text-xl text-neutral-900">No searches recorded yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
                Every search a customer runs from today appears here — what they typed, whether
                they found anything, and whether they bought.
              </p>
            </div>
          )}

          <Table
            title="Searched for nothing"
            description="These customers wanted something and left with an empty page. Each one is either a product to stock or a word to teach the search."
            rows={d?.zero || []}
            empty="Nothing yet — every search so far has returned results."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="font-medium text-neutral-900">{r.term}</span> },
              { key: 'count', label: 'Times', align: 'right', render: (r) => num(r.count) },
              { key: 'act', label: '', align: 'right', render: (r) => (
                <Link to={`/admin/settings/search?add=${encodeURIComponent(r.term)}`} className="inline-flex min-h-[44px] items-center px-1 text-[12px] font-semibold text-neutral-700 underline-offset-2 hover:underline">
                  Add synonym
                </Link>
              ) },
            ]}
          />

          <Table
            title="Most searched"
            description="What people are looking for. A term with searches but no clicks means the results are wrong, not the demand."
            rows={d?.top || []}
            empty="No searches in this period."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="font-medium text-neutral-900">{r.term}</span> },
              { key: 'count', label: 'Searches', align: 'right', render: (r) => num(r.count) },
              { key: 'clicks', label: 'Clicks', align: 'right', render: (r) => num(r.clicks) },
              { key: 'avgResults', label: 'Avg results', align: 'right', render: (r) => num(r.avgResults) },
            ]}
          />

          <Table
            title="Most clicked"
            description="Searches that actually took someone to a product."
            rows={d?.clicked || []}
            empty="No result clicks recorded yet."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="font-medium text-neutral-900">{r.term}</span> },
              { key: 'count', label: 'Clicks', align: 'right', render: (r) => num(r.count) },
            ]}
          />

          {d?.device && Object.keys(d.device).length > 0 && (
            <section className="rounded-2xl border border-neutral-200 bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-600">Where they search from</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {['mobile', 'tablet', 'desktop'].map((k) => (
                  <div key={k} className="rounded-xl bg-neutral-50 px-4 py-3">
                    <p className="text-[11px] capitalize text-neutral-600">{k}</p>
                    <p className="mt-0.5 text-lg font-semibold text-neutral-900">{num(d.device[k] || 0)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---- data quality ----
              Facets merge "L" and "l" for display so shoppers see one chip.
              This is where the merchant finds out those records need fixing. */}
          {quality && (quality.duplicateSizes?.length > 0 || quality.duplicateColors?.length > 0
            || quality.suspiciousColors?.length > 0 || quality.missingFabricCount > 0) && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900">
                <AlertTriangle size={14} /> Catalogue issues affecting search
              </p>
              <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-amber-900">
                {quality.duplicateSizes?.map((s) => (
                  <li key={s.canonical}>
                    Size <strong>{s.canonical}</strong> is stored {s.variants.length} different ways: {s.variants.map((v) => `"${v}"`).join(', ')} — shoppers see one filter, but the records disagree.
                  </li>
                ))}
                {quality.duplicateColors?.map((c) => (
                  <li key={c.canonical}>
                    Colour <strong>{c.canonical}</strong> is stored as {c.variants.map((v) => `"${v}"`).join(', ')}.
                  </li>
                ))}
                {quality.suspiciousColors?.length > 0 && (
                  <li>Colour names that look like typos: {quality.suspiciousColors.map((c) => `"${c}"`).join(', ')} — these appear in the colour filter exactly as written.</li>
                )}
                {quality.missingFabricCount > 0 && (
                  <li><strong>{quality.missingFabricCount}</strong> products have no fabric set, so a search for "cotton" or "modal" cannot find them.</li>
                )}
                {quality.missingTagsCount > 0 && (
                  <li><strong>{quality.missingTagsCount}</strong> products have no tags.</li>
                )}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
