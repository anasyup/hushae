import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, ctlInline, EditorialEmpty, TableSkeleton } from './orders/orderUi';

const num = (n) => Number(n || 0).toLocaleString('en-PK');

function DataTable({ title, description, rows, cols, empty }) {
  return (
    <section className="mb-10">
      <p className="adm-index">{title}</p>
      {description && <p className="mb-4 text-[12px] leading-relaxed text-[#AAAAAA]">{description}</p>}
      {!rows?.length ? (
        <p className="border-y border-[#EAEAEA] py-8 text-center text-[12px] text-[#AAAAAA]">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-[#EAEAEA]">
                {cols.map((c) => (
                  <th key={c.key} scope="col" className={`py-2 ${c.align === 'right' ? 'text-right' : ''}`}>
                    <span className="adm-label">{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-[#F0F0F0]">
                  {cols.map((c) => (
                    <td key={c.key} className={`py-2.5 ${c.align === 'right' ? 'text-right tabular-nums text-[#555555]' : 'text-white'}`}>
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
      <PageHeader
        title="Search analytics"
        description="What customers look for, and what they fail to find."
        actions={(
          <>
            <select id="sa-days" value={days} onChange={(e) => setDays(Number(e.target.value))} className={ctlInline} aria-label="Time period">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
            <button type="button" onClick={exportCsv} className={btnGhost}><Download size={12} /> Export</button>
            <Link to="/admin/settings/search" className={btnGhost}>Rules</Link>
          </>
        )}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Performance</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] md:grid-cols-5">
          {[
            { label: 'Searches', value: d ? num(d.searches) : '—' },
            { label: 'Found nothing', value: d ? num(d.zeroResults) : '—', sub: d ? `${d.zeroRate}% of searches` : undefined },
            { label: 'Clicked a result', value: d ? `${d.clickRate}%` : '—', sub: d ? `${num(d.clicks)} clicks` : undefined },
            { label: 'Led to an order', value: d ? `${d.conversionRate}%` : '—', sub: d ? `${num(d.conversions)} orders` : undefined },
            { label: 'Typos corrected', value: d ? num(d.fuzzyUsed) : '—', sub: 'spelling forgiven' },
          ].map((x) => (
            <div key={x.label} className="px-4 py-6 sm:px-5">
              <p className="adm-label">{x.label}</p>
              <p className="adm-metric mt-3 text-[22px] leading-none text-white">{x.value}</p>
              {x.sub && <p className="mt-2 text-[11px] text-[#AAAAAA]">{x.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      {loading && !d ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {d?.searches === 0 && (
            <EditorialEmpty
              title="No searches recorded yet"
              description="Every search a customer runs from today appears here — what they typed, whether they found anything, and whether they bought."
            />
          )}

          <DataTable
            title="02 — Searched for nothing"
            description="These customers wanted something and left with an empty page. Each one is either a product to stock or a word to teach the search."
            rows={d?.zero || []}
            empty="Nothing yet — every search so far has returned results."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="text-white">{r.term}</span> },
              { key: 'count', label: 'Times', align: 'right', render: (r) => num(r.count) },
              { key: 'act', label: '', align: 'right', render: (r) => (
                <Link to={`/admin/settings/search?add=${encodeURIComponent(r.term)}`} className="text-[11px] uppercase tracking-[0.14em] text-[#999999] hover:text-white">
                  Add synonym
                </Link>
              ) },
            ]}
          />

          <DataTable
            title="03 — Most searched"
            description="What people are looking for. A term with searches but no clicks means the results are wrong, not the demand."
            rows={d?.top || []}
            empty="No searches in this period."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="text-white">{r.term}</span> },
              { key: 'count', label: 'Searches', align: 'right', render: (r) => num(r.count) },
              { key: 'clicks', label: 'Clicks', align: 'right', render: (r) => num(r.clicks) },
              { key: 'avgResults', label: 'Avg results', align: 'right', render: (r) => num(r.avgResults) },
            ]}
          />

          <DataTable
            title="04 — Most clicked"
            description="Searches that actually took someone to a product."
            rows={d?.clicked || []}
            empty="No result clicks recorded yet."
            cols={[
              { key: 'term', label: 'Search term', render: (r) => <span className="text-white">{r.term}</span> },
              { key: 'count', label: 'Clicks', align: 'right', render: (r) => num(r.count) },
            ]}
          />

          {d?.device && Object.keys(d.device).length > 0 && (
            <section className="mb-10">
              <p className="adm-index">05 — Device</p>
              <div className="adm-divide-x grid grid-cols-3 border-y border-[#EAEAEA]">
                {['mobile', 'tablet', 'desktop'].map((k) => (
                  <div key={k} className="px-5 py-6">
                    <p className="adm-label">{k}</p>
                    <p className="adm-metric mt-3 text-[24px] text-white">{num(d.device[k] || 0)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {quality && (quality.duplicateSizes?.length > 0 || quality.duplicateColors?.length > 0
            || quality.suspiciousColors?.length > 0 || quality.missingFabricCount > 0) && (
            <section>
              <p className="adm-index">06 — Catalogue</p>
              <p className="mb-4 text-[12px] text-[#AAAAAA]">Issues affecting search results.</p>
              <ul className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA] text-[12px] leading-relaxed text-[#555555]">
                {quality.duplicateSizes?.map((s) => (
                  <li key={s.canonical} className="py-3">
                    Size <span className="text-white">{s.canonical}</span> is stored {s.variants.length} different ways: {s.variants.map((v) => `"${v}"`).join(', ')} — shoppers see one filter, but the records disagree.
                  </li>
                ))}
                {quality.duplicateColors?.map((c) => (
                  <li key={c.canonical} className="py-3">
                    Colour <span className="text-white">{c.canonical}</span> is stored as {c.variants.map((v) => `"${v}"`).join(', ')}.
                  </li>
                ))}
                {quality.suspiciousColors?.length > 0 && (
                  <li className="py-3">Colour names that look like typos: {quality.suspiciousColors.map((c) => `"${c}"`).join(', ')} — these appear in the colour filter exactly as written.</li>
                )}
                {quality.missingFabricCount > 0 && (
                  <li className="py-3"><span className="text-white">{quality.missingFabricCount}</span> products have no fabric set, so a search for &quot;cotton&quot; or &quot;modal&quot; cannot find them.</li>
                )}
                {quality.missingTagsCount > 0 && (
                  <li className="py-3"><span className="text-white">{quality.missingTagsCount}</span> products have no tags.</li>
                )}
              </ul>
            </section>
          )}
        </>
      )}
    </AdminLayout>
  );
}
