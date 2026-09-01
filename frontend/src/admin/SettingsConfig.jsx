import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdNotice, EditorialError, TableSkeleton, btnGhost, ctl,
} from './settings/chrome';

/* ============================================================================
 * CONFIG — read-only view of the effective settings document.
 *
 * Reads GET /settings/config, which redacts credential-shaped values on the
 * server. This screen never receives a plaintext secret, so it cannot leak one
 * into a screenshot, a browser extension or a support conversation.
 *
 * Editing is deliberately not offered here. A single flat JSON box would let a
 * typo break checkout, and the same values already have purpose-built editors
 * with validation. This is for seeing what is actually in effect.
 * ========================================================================== */

function Row({ k, v, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  const isObj = v && typeof v === 'object' && !Array.isArray(v);
  const isArr = Array.isArray(v);
  const pad = { paddingLeft: depth * 14 };

  if (isObj || isArr) {
    const entries = isArr ? v.map((x, i) => [String(i), x]) : Object.entries(v);
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...pad, display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '6px 8px', borderBottom: '1px solid #F0F0F0', background: 'none', border: 0, borderBottomStyle: 'solid', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontSize: 10, color: '#999', width: 10 }}>{open ? '−' : '+'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{k}</span>
          <span style={{ fontSize: 10.5, color: '#999', marginLeft: 'auto' }}>
            {entries.length} {isArr ? 'items' : 'fields'}
          </span>
        </button>
        {open && entries.map(([kk, vv]) => <Row key={kk} k={kk} v={vv} depth={depth + 1} />)}
      </div>
    );
  }

  const str = v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
  const redacted = str === '[redacted]' || str === '[redacted object]';
  return (
    <div style={{ ...pad, display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 8px', borderBottom: '1px solid #FAFAFA' }}>
      <span style={{ fontSize: 11.5, color: '#555', minWidth: 160 }}>{k}</span>
      <span style={{
        fontSize: 11.5, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word',
        color: redacted ? '#999' : '#111', fontStyle: redacted ? 'italic' : 'normal',
      }}
      >
        {str}
      </span>
    </div>
  );
}

export default function SettingsConfig() {
  const { auth } = useApp();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    api('/settings/config', { token: auth?.token })
      .then(setC)
      .catch((e) => setErr(e.message || 'Could not load config'));
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!c?.redacted) return [];
    const term = q.trim().toLowerCase();
    const entries = Object.entries(c.redacted);
    if (!term) return entries;
    return entries.filter(([k, v]) => k.toLowerCase().includes(term) || JSON.stringify(v).toLowerCase().includes(term));
  }, [c, q]);

  if (err) {
    return (
      <AdminLayout title="Configuration">
        <PageHeader title="Configuration" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Configuration' }]} />
        <EditorialError title="Could not load configuration" description={err} />
      </AdminLayout>
    );
  }
  if (!c) {
    return (
      <AdminLayout title="Configuration">
        <PageHeader title="Configuration" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Configuration' }]} />
        <TableSkeleton rows={8} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuration">
      <PageHeader
        title="Configuration"
        description="Every effective setting, in one read-only view."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Configuration' }]}
        actions={<button type="button" className={btnGhost} onClick={load}><RefreshCcw size={13} /> Refresh</button>}
      />

      <EdNotice>
        Read-only. Credential-shaped values are redacted on the server, so no plaintext
        secret ever reaches this screen. To change a value, use its own settings page —
        those have validation, and a typo in a flat box here could break checkout.
      </EdNotice>

      <EdSection index={1} title="Overview" description={`${c.groups.length} top-level groups in the settings document.`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
          {c.groups.map((g) => (
            <div key={g.key} style={{ border: '1px solid #F0F0F0', padding: '9px 11px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{g.key}</div>
              <div style={{ fontSize: 10.5, color: '#999', marginTop: 2 }}>
                {g.kind}{g.fields ? ` · ${g.fields} fields` : ''}
              </div>
            </div>
          ))}
        </div>
      </EdSection>

      <EdSection index={2} title="Values" description="Click a group to expand it.">
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: 10, color: '#999' }} />
          <input
            className={ctl}
            style={{ paddingLeft: 30 }}
            placeholder="Filter by key or value…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-[12px] text-[#777]">No setting matches “{q}”.</p>
        ) : (
          <div style={{ border: '1px solid #F0F0F0' }}>
            {filtered.map(([k, v]) => <Row key={k} k={k} v={v} />)}
          </div>
        )}
      </EdSection>
    </AdminLayout>
  );
}
