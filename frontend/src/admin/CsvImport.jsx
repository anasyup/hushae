import { useState } from 'react';
import { Download, FileUp, Loader2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

/* ============================================================================
 * CSV IMPORT / EXPORT modal — Shopify-style.
 * - Export: downloads all products as CSV
 * - Import: paste CSV text and create/update products in bulk
 * ========================================================================== */

export default function CsvImport({ onClose, onDone }) {
  const { auth, toast } = useApp();
  const [tab, setTab] = useState('import');
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const handleExport = async () => {
    setBusy(true);
    try {
      const data = await api('/products/admin/list?limit=1000', { token: auth.token });
      const rows = [['name','sku','gender','categorySlug','tier','price','compareAtPrice','costPrice','stock','sizes','fabric','description','tags','isActive']];
      (data.products || []).forEach((p) => rows.push([
        p.name||'', p.sku||'', p.gender||'', p.categorySlug||'', p.tier||'',
        p.price||'', p.compareAtPrice||'', p.costPrice||'', p.stock||0,
        (p.sizes||[]).join('; '), p.fabric||'', p.description||'',
        (p.tags||[]).join('; '), p.isActive ? 'true' : 'false'
      ]));
      const csvStr = rows.map((r) => r.map((c) => { const s = String(c).replace(/"/g,'""'); return /[",\n]/.test(s) ? `"${s}"` : s; }).join(',')).join('\n');
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `hushae-products-${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('CSV downloaded');
    } catch (e) { toast(e.message || 'Export failed'); }
    setBusy(false);
  };

  const handleImport = async () => {
    if (!csv.trim()) { toast('Paste CSV data first'); return; }
    setBusy(true); setResult(null);
    try {
      const lines = csv.trim().split('\n').filter(Boolean);
      if (lines.length < 2) { toast('CSV must have a header row + at least one product row'); setBusy(false); return; }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const products = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        const obj = {};
        headers.forEach((h, j) => { if (vals[j] !== undefined) obj[h] = vals[j].trim(); });
        if (obj.name) products.push(obj);
      }
      if (!products.length) { toast('No valid product rows found'); setBusy(false); return; }
      const res = await api('/products/csv-import', { method: 'POST', token: auth.token, body: { products } });
      setResult(res);
      toast(`Imported ${res.created || 0} · Updated ${res.updated || 0} · Skipped ${res.skipped || 0}`);
      if (onDone) onDone();
    } catch (e) { toast(e.message || 'Import failed'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 px-4 py-6 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{tab === 'import' ? 'Bulk import' : 'Export'}</p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-neutral-900">{tab === 'import' ? 'CSV product import' : 'Download products CSV'}</h2>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"><X size={15} /></button>
        </div>

        <div className="flex border-b border-neutral-100 bg-neutral-50">
          {[{ k: 'import', l: 'Import' }, { k: 'export', l: 'Export' }].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`flex-1 py-2.5 text-[12px] font-semibold transition border-b-2 ${tab === t.k ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>{t.l}</button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'import' ? (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-500">Paste CSV data below. First row = headers (name, sku, gender, categorySlug, tier, price, stock, etc.)</p>
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)}
                className="w-full min-h-[180px] rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[12px] font-mono outline-none focus:border-neutral-900"
                placeholder={`name,sku,gender,categorySlug,tier,price,stock\nCotton Brief,HS-001,men,briefs,Standard,650,50\nLace Bralette,HS-002,women,bras,Premium,1800,30`} />
              {result && (
                <div className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-800">
                  ✅ Created: {result.created || 0} · Updated: {result.updated || 0} · Skipped: {result.skipped || 0}
                </div>
              )}
              <button onClick={handleImport} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-black disabled:opacity-50">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                {busy ? 'Importing…' : 'Import products'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-500">Download all products as a CSV file. You can edit it in Excel and re-import.</p>
              <button onClick={handleExport} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-black disabled:opacity-50">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {busy ? 'Downloading…' : 'Download CSV'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}
