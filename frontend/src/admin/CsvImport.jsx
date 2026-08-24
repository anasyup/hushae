import { useState } from 'react';
import { Download, FileUp, Loader2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { btnSolid, ctl } from './orders/orderUi';

/* ===========================================================================
 * CSV IMPORT / EXPORT — editorial chrome. Endpoints unchanged.
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
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg border border-[#EAEAEA] bg-[#0D0D0D]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-[#EAEAEA] px-5 py-4">
          <div>
            <p className="adm-label">{tab === 'import' ? 'Bulk import' : 'Export'}</p>
            <p className="mt-1 text-[15px] font-medium text-black">{tab === 'import' ? 'CSV product import' : 'Download products CSV'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#AAAAAA] hover:text-black" aria-label="Close"><X size={15} /></button>
        </div>

        <div className="flex gap-5 border-b border-[#EAEAEA] px-5">
          {[{ k: 'import', l: 'Import' }, { k: 'export', l: 'Export' }].map((t) => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)}
              className={`py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] ${tab === t.k ? 'border-b border-white text-black' : 'border-b border-transparent text-[#AAAAAA] hover:text-[#555555]'}`}>
              {t.l}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'import' ? (
            <div className="space-y-3">
              <p className="text-[12px] text-[#999999]">Paste CSV data below. First row = headers (name, sku, gender, categorySlug, tier, price, stock, etc.)</p>
              <textarea value={csv} onChange={(e) => setCsv(e.target.value)}
                className={`${ctl} min-h-[180px] !h-auto py-3 font-mono`}
                placeholder={'name,sku,gender,categorySlug,tier,price,stock\nCotton Brief,HS-001,men,briefs,Standard,650,50'} />
              {result && (
                <p className="text-[12px] text-[#555555]">
                  Created {result.created || 0} · Updated {result.updated || 0} · Skipped {result.skipped || 0}
                </p>
              )}
              <button type="button" onClick={handleImport} disabled={busy} className={btnSolid}>
                {busy ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                {busy ? 'Importing…' : 'Import products'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[12px] text-[#999999]">Download all products as a CSV file. You can edit it in Excel and re-import.</p>
              <button type="button" onClick={handleExport} disabled={busy} className={btnSolid}>
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
