import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdNotice, EditorialError, TableSkeleton, btnGhost, btnSolid, MonoStatus,
} from './settings/chrome';

/* ============================================================================
 * CACHE — what the search engine is holding, and a way to drop it.
 *
 * The search engine keeps the settings document in-process for up to 60s so a
 * config read is not a database round-trip on every query. Saving settings
 * already invalidates it; this screen exists for the cases where a merchant
 * changed something out of band and wants the effect now.
 *
 * The caveat is stated on the screen rather than hidden: Vercel rotates across
 * several instances, so a clear reaches the instance that served the request
 * and the rest age out on their own. Claiming "all caches cleared" would be a
 * lie, so it does not.
 * ========================================================================== */

export default function SettingsCache() {
  const { auth, toast } = useApp();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastCleared, setLastCleared] = useState(null);

  const load = useCallback(() => {
    api('/settings/cache', { token: auth?.token })
      .then(setC)
      .catch((e) => setErr(e.message || 'Could not read cache state'));
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const clear = async () => {
    setBusy(true);
    try {
      const r = await api('/settings/cache/clear', { method: 'POST', token: auth?.token, body: {} });
      setLastCleared(new Date());
      toast(r.note || 'Cache cleared on this instance');
      load();
    } catch (e) { toast(e.message || 'Could not clear cache'); }
    setBusy(false);
  };

  if (err) {
    return (
      <AdminLayout title="Cache">
        <PageHeader title="Cache" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Cache' }]} />
        <EditorialError title="Could not read cache" description={err} />
      </AdminLayout>
    );
  }
  if (!c) {
    return (
      <AdminLayout title="Cache">
        <PageHeader title="Cache" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Cache' }]} />
        <TableSkeleton rows={3} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Cache">
      <PageHeader
        title="Cache"
        description="What the search engine is holding in memory, and how to drop it."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Cache' }]}
        actions={(
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={btnGhost} onClick={load}><RefreshCcw size={13} /> Refresh</button>
            <button type="button" className={btnSolid} onClick={clear} disabled={busy}>
              <Trash2 size={13} /> {busy ? 'Clearing…' : 'Clear cache'}
            </button>
          </div>
        )}
      />

      <EdNotice>
        Saving settings already clears this cache automatically. Use the button only when
        something was changed outside the admin and you want it to take effect immediately.
        <br /><br />
        <b>{c.scope}</b> — this clears the instance that served the request; the others age
        out on their own within {c.ttlSeconds}s. It is a nudge, not a guarantee.
      </EdNotice>

      <EdSection index={1} title="Search config cache">
        <table className="w-full text-[12px]">
          <tbody>
            <tr className="border-b border-[#F0F0F0]">
              <td className="py-2.5 text-[#777]">Status</td>
              <td className="py-2.5 text-right">
                <MonoStatus label={c.search?.loaded ? 'loaded' : 'not loaded'} dim={!c.search?.loaded} />
              </td>
            </tr>
            <tr className="border-b border-[#F0F0F0]">
              <td className="py-2.5 text-[#777]">Time to live</td>
              <td className="py-2.5 text-right font-medium">{c.ttlSeconds}s</td>
            </tr>
            <tr className="border-b border-[#F0F0F0]">
              <td className="py-2.5 text-[#777]">Config groups</td>
              <td className="py-2.5 text-right font-medium">{c.search?.groups?.length ?? 0}</td>
            </tr>
            <tr className="border-b border-[#F0F0F0]">
              <td className="py-2.5 text-[#777]">Synonyms</td>
              <td className="py-2.5 text-right font-medium">{c.search?.synonyms ?? 0}</td>
            </tr>
            <tr>
              <td className="py-2.5 text-[#777]">Discovery config</td>
              <td className="py-2.5 text-right">
                <MonoStatus label={c.discovery?.loaded ? `${c.discovery.keys} keys` : 'not loaded'} dim={!c.discovery?.loaded} />
              </td>
            </tr>
          </tbody>
        </table>
        {c.search?.groups?.length > 0 && (
          <p style={{ marginTop: 12, fontSize: 11.5, color: '#777', lineHeight: 1.7 }}>
            Groups held: {c.search.groups.join(', ')}
          </p>
        )}
      </EdSection>

      {lastCleared && (
        <EdSection index={2} title="Last cleared">
          <p className="text-[12px] text-[#555]">
            {lastCleared.toLocaleString('en-GB')} — on this instance only.
          </p>
        </EdSection>
      )}

      <EdSection index={lastCleared ? 3 : 2} title="Why this is small">
        <p className="text-[12px] leading-relaxed text-[#555]">
          The cache is deliberately in-process and tiny. A shared cache such as Redis would
          be a second service to run, monitor and pay for, in exchange for shaving a
          database read that already completes in milliseconds. For search config —
          presentation, not money — that trade is not worth it.
        </p>
      </EdSection>
    </AdminLayout>
  );
}
