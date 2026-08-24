import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Settings, Shield, RefreshCw, Key, Webhook, Activity } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid } from './orders/orderUi';

/* ============================================================================
 * INTEGRATIONS DIRECTORY — Phase 9: Platform extensibility management
 * ========================================================================== */

const TYPE_LABELS = {
  payment: 'Payments', shipping: 'Shipping', communication: 'Communication',
  marketing: 'Marketing', analytics: 'Analytics', storage: 'Storage',
  search: 'Search', tax: 'Tax', other: 'Other',
};

const STATUS_STYLES = {
  active: { bg: 'bg-black', text: 'text-white', label: 'Active' },
  installed: { bg: 'bg-[#F5F5F5]', text: 'text-[#555555]', label: 'Installed' },
  configuring: { bg: 'bg-[#F5F5F5]', text: 'text-[#555555]', label: 'Configuring' },
  disabled: { bg: 'bg-[#FAFAFA]', text: 'text-[#999999]', label: 'Disabled' },
  error: { bg: 'bg-[#FAFAFA]', text: 'text-[#777777]', label: 'Error' },
  uninstalled: { bg: 'bg-[#FAFAFA]', text: 'text-[#AAAAAA]', label: 'Uninstalled' },
};

export default function Apps() {
  const { auth, toast } = useApp();
  const [integrations, setIntegrations] = useState(null);
  const [health, setHealth] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('integrations');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, h] = await Promise.all([
        api('/platform/integrations', { token: auth.token }),
        api('/platform/health', { token: auth.token }),
      ]);
      setIntegrations(d.integrations || []);
      setHealth(h);
    } catch { toast('Failed to load integrations'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggleIntegration = async (integration) => {
    try {
      await api(`/platform/integrations/${integration.id}`, {
        method: 'PUT', token: auth.token,
        body: { enabled: !integration.enabled },
      });
      toast(`${integration.name} ${integration.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast('Failed to update'); }
  };

  const testIntegration = async (integration) => {
    try {
      const r = await api(`/platform/integrations/${integration.id}/test`, { method: 'POST', token: auth.token });
      toast(r.message || (r.ok ? 'Connection OK' : 'Connection failed'));
      load();
    } catch { toast('Test failed'); }
  };

  if (loading) return <AdminLayout title="Integrations"><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-32 v2-skeleton rounded-md" />)}</div></AdminLayout>;

  // Group by type
  const grouped = {};
  for (const i of (integrations || [])) {
    if (!grouped[i.type]) grouped[i.type] = [];
    grouped[i.type].push(i);
  }

  return (
    <AdminLayout title="Integrations">
      <PageHeader
        title="Integrations"
        description="Manage payment gateways, shipping providers, communication channels and platform extensions."
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[#EAEAEA]">
        {[
          { k: 'integrations', l: 'Integrations', icon: Settings },
          { k: 'health', l: 'System Health', icon: Activity },
          { k: 'webhooks', l: 'Webhooks', icon: Webhook },
          { k: 'security', l: 'Security', icon: Shield },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${tab === t.k ? 'border-black text-black' : 'border-transparent text-[#AAAAAA] hover:text-[#777777]'}`}>
            <t.icon size={14} /> {t.l}
          </button>
        ))}
      </div>

      {tab === 'integrations' && (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{TYPE_LABELS[type] || type}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(i => {
                  const st = STATUS_STYLES[i.status] || STATUS_STYLES.installed;
                  return (
                    <div key={i.id} className="rounded-md border border-[#EAEAEA] bg-white p-5">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-black">{i.name}</p>
                          <p className="mt-1 text-[12px] text-[#999999]">{i.description}</p>
                        </div>
                        <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Permissions */}
                      {i.permissions?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {i.permissions.map(p => (
                            <span key={p} className="rounded-sm bg-[#F5F5F5] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#777777]">{p}</span>
                          ))}
                        </div>
                      )}

                      {/* Health */}
                      <div className="mt-3 text-[11px] text-[#AAAAAA]">
                        {i.lastSuccess && <span>Last OK: {new Date(i.lastSuccess).toLocaleDateString()}</span>}
                        {i.lastError && <span className="text-[#777777]"> · Error: {i.lastError}</span>}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => toggleIntegration(i)} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${i.enabled ? 'border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]' : 'bg-black text-white hover:bg-[#1a1a1a]'}`}>
                          {i.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {i.configFields?.length > 0 && (
                          <button onClick={() => setSelected(i)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#555555] transition hover:border-[#DCDCDC]">
                            Configure
                          </button>
                        )}
                        {i.type === 'payment' || i.id === 'smtp_email' ? (
                          <button onClick={() => testIntegration(i)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#555555] transition hover:border-[#DCDCDC]">
                            <RefreshCw size={11} className="inline mr-1" /> Test
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'health' && health && (
        <div className="space-y-6">
          {/* System Status */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Database', ok: health.database?.connected, icon: CheckCircle2 },
              { label: 'Email', ok: health.email?.configured, icon: CheckCircle2 },
              { label: 'Webhooks (24h)', value: `${health.webhooks?.total24h || 0} events`, sub: `${health.webhooks?.failed24h || 0} failed` },
              { label: 'Active API Keys', value: health.apiKeys?.active || 0 },
            ].map(h => (
              <div key={h.label} className="rounded-md border border-[#EAEAEA] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{h.label}</p>
                {h.ok !== undefined ? (
                  <div className="mt-2 flex items-center gap-2">
                    {h.ok ? <CheckCircle2 size={16} className="text-black" /> : <XCircle size={16} className="text-[#999999]" />}
                    <span className="text-[14px] font-semibold text-black">{h.ok ? 'Connected' : 'Not configured'}</span>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-[20px] font-semibold text-black">{h.value}</p>
                    {h.sub && <p className="text-[11px] text-[#AAAAAA]">{h.sub}</p>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Integration Health */}
          <div className="rounded-md border border-[#EAEAEA] bg-white">
            <div className="border-b border-[#EAEAEA] px-5 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Integration Health</p>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {(health.integrations || []).map(i => (
                <div key={i.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    {i.enabled ? <CheckCircle2 size={14} className="text-black" /> : <XCircle size={14} className="text-[#DCDCDC]" />}
                    <div>
                      <p className="text-[13px] font-medium text-black">{i.name}</p>
                      <p className="text-[11px] text-[#AAAAAA]">{TYPE_LABELS[i.type] || i.type}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    {i.lastSuccess && <p className="text-[#555555]">Last OK: {new Date(i.lastSuccess).toLocaleString()}</p>}
                    {i.lastError && <p className="text-[#777777]">{i.lastError}</p>}
                    {i.errorCount > 0 && <p className="text-[#999999]">{i.errorCount} errors</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'webhooks' && <WebhookLogs auth={auth} />}
      {tab === 'security' && <SecurityPanel auth={auth} />}

      {/* Configure Modal */}
      {selected && <ConfigureModal integration={selected} auth={auth} onClose={() => { setSelected(null); load(); }} />}
    </AdminLayout>
  );
}

/* ── Configure Modal ─────────────────────────────────────────────────────── */
function ConfigureModal({ integration, auth, onClose }) {
  const { toast } = useApp();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/platform/integrations/${integration.id}`, {
        method: 'PUT', token: auth.token,
        body: { config: form, enabled: true },
      });
      toast(`${integration.name} configured and enabled`);
      onClose();
    } catch { toast('Failed to save configuration'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-md border border-[#EAEAEA] bg-white" onClick={e => e.stopPropagation()}>
        <div className="border-b border-[#EAEAEA] px-6 py-4">
          <p className="text-[14px] font-semibold text-black">Configure {integration.name}</p>
          <p className="mt-1 text-[12px] text-[#999999]">{integration.description}</p>
        </div>
        <div className="p-6 space-y-4">
          {(integration.configFields || []).map(f => (
            <div key={f.key}>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">
                {f.label} {f.required && '*'}
              </label>
              {f.type === 'boolean' ? (
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={!!form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.checked })} className="h-4 w-4 accent-black" />
                  {f.hint || 'Enable'}
                </label>
              ) : (
                <input
                  type={f.type === 'password' ? 'password' : 'text'}
                  className="h-9 w-full rounded-md border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none focus:border-black"
                  placeholder={f.hint || ''}
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#EAEAEA] px-6 py-4">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save & Enable'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Webhook Logs ────────────────────────────────────────────────────────── */
function WebhookLogs({ auth }) {
  const { toast } = useApp();
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/platform/webhooks', { token: auth.token })
      .then(d => setEvents(d.events || []))
      .catch(() => toast('Failed to load webhook logs'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <div className="h-32 v2-skeleton rounded-md" />;

  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white">
      <div className="border-b border-[#EAEAEA] px-5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Webhook Events (Last 25)</p>
      </div>
      {events?.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No webhook events recorded yet.</div>
      ) : (
        <div className="divide-y divide-[#F0F0F0]">
          {(events || []).map(e => (
            <div key={e._id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-[13px] font-medium text-black">{e.provider} · {e.event}</p>
                <p className="text-[11px] text-[#AAAAAA]">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
              <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${e.status === 'processed' ? 'bg-black text-white' : e.status === 'failed' ? 'bg-[#F5F5F5] text-[#777777]' : 'bg-[#FAFAFA] text-[#999999]'}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Security Panel ──────────────────────────────────────────────────────── */
function SecurityPanel({ auth }) {
  const { toast } = useApp();
  const [keys, setKeys] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState([]);

  const loadKeys = () => {
    api('/platform/api-keys', { token: auth.token })
      .then(d => setKeys(d.keys || []))
      .catch(() => toast('Failed to load API keys'));
  };
  useEffect(loadKeys, []); // eslint-disable-line

  const createKey = async () => {
    if (!name.trim()) { toast('Name is required'); return; }
    try {
      const r = await api('/platform/api-keys', { method: 'POST', token: auth.token, body: { name, scopes } });
      setNewKey(r.plaintext);
      setShowCreate(false);
      setName('');
      setScopes([]);
      loadKeys();
    } catch { toast('Failed to create API key'); }
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Revoke this API key? It cannot be undone.')) return;
    try {
      await api(`/platform/api-keys/${id}`, { method: 'DELETE', token: auth.token });
      toast('API key revoked');
      loadKeys();
    } catch { toast('Failed to revoke'); }
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <div className="rounded-md border border-[#EAEAEA] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAEAEA] px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">API Keys</p>
          <button onClick={() => setShowCreate(true)} className={btnSolid}><Key size={12} /> New Key</button>
        </div>

        {newKey && (
          <div className="border-b border-[#EAEAEA] bg-[#FAFAFA] px-5 py-4">
            <p className="text-[12px] font-semibold text-black">⚠️ Save this key now — it will not be shown again:</p>
            <code className="mt-2 block rounded-md bg-white border border-[#EAEAEA] px-3 py-2 text-[13px] text-black break-all">{newKey}</code>
            <button onClick={() => { navigator.clipboard?.writeText(newKey); toast('Copied'); }} className="mt-2 text-[11px] font-medium text-[#777777] hover:text-black">Copy to clipboard</button>
          </div>
        )}

        {keys?.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No API keys created yet.</div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {(keys || []).map(k => (
              <div key={k._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-black">{k.name}</p>
                  <p className="text-[11px] text-[#AAAAAA]">
                    <code>{k.keyPrefix}…</code> · {k.scopes?.length || 0} scopes
                    {k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => revokeKey(k._id)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#777777] hover:border-[#DCDCDC] hover:text-black">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-md border border-[#EAEAEA] bg-white" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[14px] font-semibold text-black">Create API Key</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Name *</label>
                <input className="h-9 w-full rounded-md border border-[#DCDCDC] px-3 text-[13px] outline-none focus:border-black" value={name} onChange={e => setName(e.target.value)} placeholder="My App" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Scopes</label>
                <div className="flex flex-wrap gap-1.5">
                  {['products:read', 'orders:read', 'customers:read', 'analytics:read'].map(s => (
                    <button key={s} onClick={() => setScopes(scopes.includes(s) ? scopes.filter(x => x !== s) : [...scopes, s])}
                      className={`rounded-sm px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition ${scopes.includes(s) ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#777777]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EAEAEA] px-6 py-4">
              <button onClick={() => setShowCreate(false)} className={btnGhost}>Cancel</button>
              <button onClick={createKey} className={btnSolid}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
