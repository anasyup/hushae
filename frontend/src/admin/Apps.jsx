import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Settings, Shield, RefreshCw, Key, Webhook, Activity, Database, Play, Trash2, Upload, Clock, RotateCcw, Plus, Package } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid } from './orders/orderUi';

/* ============================================================================
 * INTEGRATIONS + PLATFORM — Phase 9 (Enhanced)
 *
 * Tabs:
 * 1. Integrations — card grid with lifecycle management
 * 2. Extensions — install/uninstall from manifests
 * 3. System Health — database, email, webhook, backup health
 * 4. Webhooks — event log, dead letter queue, retry management
 * 5. Backups — schedule, trigger, verify, restore
 * 6. Security — API keys, audit log
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

const TABS = [
  { k: 'integrations', l: 'Integrations', icon: Package },
  { k: 'extensions', l: 'Extensions', icon: Plus },
  { k: 'health', l: 'Health', icon: Activity },
  { k: 'webhooks', l: 'Webhooks', icon: Webhook },
  { k: 'backups', l: 'Backups', icon: Database },
  { k: 'security', l: 'Security', icon: Shield },
];

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

  const toggleIntegration = async (i) => {
    try {
      await api(`/platform/integrations/${i.id}`, { method: 'PUT', token: auth.token, body: { enabled: !i.enabled } });
      toast(`${i.name} ${i.enabled ? 'disabled' : 'enabled'}`);
      load();
    } catch { toast('Failed to update'); }
  };

  const testIntegration = async (i) => {
    try {
      const r = await api(`/platform/integrations/${i.id}/test`, { method: 'POST', token: auth.token });
      toast(r.message || (r.ok ? 'Connection OK' : 'Connection failed'));
      load();
    } catch { toast('Test failed'); }
  };

  if (loading) return <AdminLayout title="Integrations"><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-32 v2-skeleton rounded-md" />)}</div></AdminLayout>;

  const grouped = {};
  for (const i of (integrations || [])) {
    if (!grouped[i.type]) grouped[i.type] = [];
    grouped[i.type].push(i);
  }

  return (
    <AdminLayout title="Platform">
      <PageHeader title="Platform & Integrations" description="Manage payment gateways, extensions, webhooks, backups and security." />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-[#EAEAEA]">
        {TABS.map(t => (
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
                        <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      {i.permissions?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {i.permissions.map(p => <span key={p} className="rounded-sm bg-[#F5F5F5] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#777777]">{p}</span>)}
                        </div>
                      )}
                      <div className="mt-3 text-[11px] text-[#AAAAAA]">
                        {i.lastSuccess && <span>Last OK: {new Date(i.lastSuccess).toLocaleDateString()}</span>}
                        {i.lastError && <span className="text-[#777777]"> · Error: {i.lastError}</span>}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => toggleIntegration(i)} className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition ${i.enabled ? 'border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]' : 'bg-black text-white hover:bg-[#1a1a1a]'}`}>
                          {i.enabled ? 'Disable' : 'Enable'}
                        </button>
                        {i.configFields?.length > 0 && <button onClick={() => setSelected(i)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#555555] transition hover:border-[#DCDCDC]">Configure</button>}
                        {i.type === 'payment' || i.id === 'smtp_email' ? <button onClick={() => testIntegration(i)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#555555] transition hover:border-[#DCDCDC]"><RefreshCw size={11} className="inline mr-1" />Test</button> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'extensions' && <ExtensionManager auth={auth} integrations={integrations} onReload={load} />}
      {tab === 'health' && health && <HealthPanel health={health} />}
      {tab === 'webhooks' && <WebhookManager auth={auth} />}
      {tab === 'backups' && <BackupManager auth={auth} health={health} />}
      {tab === 'security' && <SecurityPanel auth={auth} />}

      {selected && <ConfigureModal integration={selected} auth={auth} onClose={() => { setSelected(null); load(); }} />}
    </AdminLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * EXTENSION MANAGER — Install/Uninstall lifecycle
 * ══════════════════════════════════════════════════════════════════════════ */
function ExtensionManager({ auth, integrations, onReload }) {
  const { toast } = useApp();
  const [showInstall, setShowInstall] = useState(false);
  const [manifestJson, setManifestJson] = useState('');
  const [validateResult, setValidateResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    try {
      const manifest = JSON.parse(manifestJson);
      const r = await api('/platform/extensions/validate', { method: 'POST', token: auth.token, body: manifest });
      setValidateResult(r);
    } catch (e) {
      setValidateResult({ valid: false, errors: [e.message] });
    }
  };

  const install = async () => {
    setBusy(true);
    try {
      const manifest = JSON.parse(manifestJson);
      await api('/platform/extensions/install', { method: 'POST', token: auth.token, body: manifest });
      toast('Extension installed successfully');
      setShowInstall(false);
      setManifestJson('');
      setValidateResult(null);
      onReload();
    } catch (e) { toast(e.message || 'Install failed'); }
    setBusy(false);
  };

  const uninstall = async (id) => {
    if (!window.confirm(`Uninstall extension "${id}"? Configuration will be removed. Historical records are preserved.`)) return;
    try {
      await api(`/platform/extensions/${id}/uninstall`, { method: 'POST', token: auth.token });
      toast(`${id} uninstalled`);
      onReload();
    } catch (e) { toast(e.message || 'Uninstall failed'); }
  };

  const lifecycleAction = async (id, action) => {
    try {
      await api(`/platform/extensions/${id}/${action}`, { method: 'POST', token: auth.token });
      toast(`${id} ${action}d`);
      onReload();
    } catch (e) { toast(e.message || `${action} failed`); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#555555]">Manage extension lifecycle: install from manifest, configure, enable, disable, uninstall.</p>
        <button onClick={() => setShowInstall(true)} className={btnSolid}><Plus size={12} /> Install Extension</button>
      </div>

      {/* Installed extensions with lifecycle controls */}
      <div className="rounded-md border border-[#EAEAEA] bg-white">
        <div className="border-b border-[#EAEAEA] px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Installed Extensions</p>
        </div>
        <div className="divide-y divide-[#F0F0F0]">
          {(integrations || []).map(i => (
            <div key={i.id} className="flex items-center justify-between px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-black">{i.name}</p>
                  <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${(STATUS_STYLES[i.status] || {}).bg || ''} ${(STATUS_STYLES[i.status] || {}).text || ''}`}>{i.status}</span>
                </div>
                <p className="text-[11px] text-[#AAAAAA]">{i.type} · v{i.version || '1.0.0'} · {i.permissions?.length || 0} permissions</p>
              </div>
              <div className="flex gap-1.5">
                {i.status === 'installed' && <button onClick={() => lifecycleAction(i.id, 'enable')} className="rounded-md bg-black px-2.5 py-1 text-[10px] font-medium text-white">Enable</button>}
                {i.status === 'active' && <button onClick={() => lifecycleAction(i.id, 'disable')} className="rounded-md border border-[#EAEAEA] px-2.5 py-1 text-[10px] font-medium text-[#555555]">Disable</button>}
                {i.status === 'disabled' && <button onClick={() => lifecycleAction(i.id, 'enable')} className="rounded-md bg-black px-2.5 py-1 text-[10px] font-medium text-white">Re-enable</button>}
                <button onClick={() => uninstall(i.id)} className="rounded-md border border-[#EAEAEA] px-2.5 py-1 text-[10px] font-medium text-[#777777] hover:text-black"><Trash2 size={10} className="inline mr-1" />Uninstall</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Install Modal */}
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={() => setShowInstall(false)}>
          <div className="w-full max-w-lg rounded-md border border-[#EAEAEA] bg-white" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[14px] font-semibold text-black">Install Extension</p>
              <p className="mt-1 text-[12px] text-[#999999]">Paste the extension manifest JSON below.</p>
            </div>
            <div className="p-6">
              <textarea className="h-48 w-full rounded-md border border-[#DCDCDC] bg-[#FAFAFA] p-3 font-mono text-[12px] text-black outline-none focus:border-black" placeholder={'{\n  "id": "my-extension",\n  "name": "My Extension",\n  "type": "analytics",\n  "permissions": ["analytics:read"],\n  "eventSubscriptions": ["order.created"]\n}'} value={manifestJson} onChange={e => setManifestJson(e.target.value)} />
              {validateResult && (
                <div className={`mt-3 rounded-md border p-3 text-[12px] ${validateResult.valid ? 'border-black bg-[#FAFAFA] text-black' : 'border-[#EAEAEA] bg-[#FAFAFA] text-[#555555]'}`}>
                  {validateResult.valid ? '✅ Manifest is valid' : `❌ ${validateResult.errors?.join('; ')}`}
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-[#EAEAEA] px-6 py-4">
              <button onClick={validate} className={btnGhost}>Validate</button>
              <div className="flex gap-2">
                <button onClick={() => setShowInstall(false)} className={btnGhost}>Cancel</button>
                <button onClick={install} disabled={busy || !validateResult?.valid} className={btnSolid}>{busy ? 'Installing…' : 'Install'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * HEALTH PANEL
 * ══════════════════════════════════════════════════════════════════════════ */
function HealthPanel({ health }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Database', ok: health.database?.connected },
          { label: 'Email', ok: health.email?.configured },
          { label: 'Webhooks (24h)', value: `${health.webhooks?.total24h || 0} events`, sub: `${health.webhooks?.failed24h || 0} failed · ${health.webhooks?.deadLetters || 0} dead` },
          { label: 'Active API Keys', value: health.apiKeys?.active || 0 },
        ].map(h => (
          <div key={h.label} className="rounded-md border border-[#EAEAEA] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{h.label}</p>
            {h.ok !== undefined ? (
              <div className="mt-2 flex items-center gap-2">
                {h.ok ? <CheckCircle2 size={16} className="text-black" /> : <XCircle size={16} className="text-[#999999]" />}
                <span className="text-[14px] font-semibold text-black">{h.ok ? 'OK' : 'Not configured'}</span>
              </div>
            ) : (
              <><p className="mt-2 text-[20px] font-semibold text-black">{h.value}</p>{h.sub && <p className="text-[11px] text-[#AAAAAA]">{h.sub}</p>}</>
            )}
          </div>
        ))}
      </div>

      {/* Backup health */}
      {health.backup && (
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Backup Schedule</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4 text-[13px]">
            <div><span className="text-[#999999]">Frequency:</span> <span className="font-medium text-black">{health.backup.frequency}</span></div>
            <div><span className="text-[#999999]">Last Run:</span> <span className="font-medium text-black">{health.backup.lastRunAt ? new Date(health.backup.lastRunAt).toLocaleString() : 'Never'}</span></div>
            <div><span className="text-[#999999]">Status:</span> <span className={`font-medium ${health.backup.lastRunStatus === 'success' ? 'text-black' : 'text-[#777777]'}`}>{health.backup.lastRunStatus || '—'}</span></div>
            <div><span className="text-[#999999]">Last Verified:</span> <span className="font-medium text-black">{health.backup.lastVerifiedAt ? new Date(health.backup.lastVerifiedAt).toLocaleString() : 'Never'}</span></div>
          </div>
        </div>
      )}

      {/* Integration health */}
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
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * WEBHOOK MANAGER — Event log + Dead Letter + Retry
 * ══════════════════════════════════════════════════════════════════════════ */
function WebhookManager({ auth }) {
  const { toast } = useApp();
  const [events, setEvents] = useState(null);
  const [deadLetters, setDeadLetters] = useState(null);
  const [retrying, setRetrying] = useState(null);
  const [subTab, setSubTab] = useState('recent');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, dl, rt] = await Promise.all([
        api('/platform/webhooks', { token: auth.token }),
        api('/platform/webhooks/dead-letter', { token: auth.token }),
        api('/platform/webhooks/retrying', { token: auth.token }),
      ]);
      setEvents(ev.events || []);
      setDeadLetters(dl.events || []);
      setRetrying(rt.events || []);
    } catch { toast('Failed to load webhook data'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const processRetries = async () => {
    try {
      const r = await api('/platform/webhooks/process-retries', { method: 'POST', token: auth.token });
      toast(`Processed: ${r.processed} ok, ${r.failed} failed, ${r.deadLettered} dead-lettered`);
      load();
    } catch { toast('Retry processing failed'); }
  };

  const manualRetry = async (id) => {
    try {
      const r = await api(`/platform/webhooks/${id}/retry`, { method: 'POST', token: auth.token });
      toast(r.ok ? 'Retry successful' : `Retry failed: ${r.error}`);
      load();
    } catch { toast('Retry failed'); }
  };

  const discard = async (id) => {
    if (!window.confirm('Discard this dead-lettered event? It cannot be retried again.')) return;
    try {
      await api(`/platform/webhooks/${id}/discard`, { method: 'POST', token: auth.token });
      toast('Event discarded');
      load();
    } catch { toast('Discard failed'); }
  };

  if (loading) return <div className="h-32 v2-skeleton rounded-md" />;

  const STATUS_COLORS = {
    received: 'bg-[#F5F5F5] text-[#555555]',
    processing: 'bg-[#F5F5F5] text-[#555555]',
    processed: 'bg-black text-white',
    failed: 'bg-[#FAFAFA] text-[#777777]',
    retrying: 'bg-[#F5F5F5] text-[#555555]',
    dead_letter: 'bg-[#FAFAFA] text-[#777777]',
    duplicate: 'bg-[#FAFAFA] text-[#AAAAAA]',
    rejected: 'bg-[#FAFAFA] text-[#AAAAAA]',
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-3">
        {[
          { k: 'recent', l: `Recent (${events?.length || 0})` },
          { k: 'dead', l: `Dead Letter (${deadLetters?.length || 0})` },
          { k: 'retrying', l: `Retrying (${retrying?.length || 0})` },
        ].map(t => (
          <button key={t.k} onClick={() => setSubTab(t.k)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition ${subTab === t.k ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#555555] hover:border-[#DCDCDC]'}`}>
            {t.l}
          </button>
        ))}
        <button onClick={processRetries} className="ml-auto rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[12px] font-medium text-[#555555] transition hover:border-[#DCDCDC]">
          <RotateCcw size={11} className="inline mr-1" /> Process Retries
        </button>
      </div>

      {/* Recent Events */}
      {subTab === 'recent' && (
        <div className="rounded-md border border-[#EAEAEA] bg-white">
          {events?.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No webhook events recorded yet.</div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {(events || []).map(e => (
                <div key={e._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-black">{e.provider} · {e.event}</p>
                    <p className="text-[11px] text-[#AAAAAA]">{new Date(e.createdAt).toLocaleString()}{e.retryCount > 0 && ` · ${e.retryCount} retries`}{e.errorSummary && ` · ${e.errorSummary}`}</p>
                  </div>
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[e.status] || ''}`}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dead Letter Queue */}
      {subTab === 'dead' && (
        <div className="rounded-md border border-[#EAEAEA] bg-white">
          {deadLetters?.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#AAAAAA]">Dead letter queue is empty. All webhooks processed or retried successfully.</div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {(deadLetters || []).map(e => (
                <div key={e._id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-black">{e.provider} · {e.event}</p>
                    <p className="text-[11px] text-[#AAAAAA]">Dead at {new Date(e.deadLetteredAt).toLocaleString()} · {e.retryCount}/{e.maxRetries} retries</p>
                    {e.deadLetterReason && <p className="mt-1 text-[11px] text-[#777777]">{e.deadLetterReason}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => manualRetry(e._id)} className="rounded-md bg-black px-2.5 py-1 text-[10px] font-medium text-white"><RotateCcw size={10} className="inline mr-1" />Retry</button>
                    <button onClick={() => discard(e._id)} className="rounded-md border border-[#EAEAEA] px-2.5 py-1 text-[10px] font-medium text-[#777777] hover:text-black"><Trash2 size={10} className="inline mr-1" />Discard</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Retrying */}
      {subTab === 'retrying' && (
        <div className="rounded-md border border-[#EAEAEA] bg-white">
          {retrying?.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No events pending retry.</div>
          ) : (
            <div className="divide-y divide-[#F0F0F0]">
              {(retrying || []).map(e => (
                <div key={e._id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-black">{e.provider} · {e.event}</p>
                    <p className="text-[11px] text-[#AAAAAA]">Retry {e.retryCount}/{e.maxRetries} · Next at {e.nextRetryAt ? new Date(e.nextRetryAt).toLocaleString() : '—'}</p>
                  </div>
                  <span className="rounded-sm bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#555555]">Retrying</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * BACKUP MANAGER — Schedule + Trigger + Verify
 * ══════════════════════════════════════════════════════════════════════════ */
function BackupManager({ auth, health }) {
  const { toast } = useApp();
  const [schedule, setSchedule] = useState(null);
  const [busy, setBusy] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  const load = async () => {
    try {
      const d = await api('/platform/backup/schedule', { token: auth.token });
      setSchedule(d.schedule);
    } catch { toast('Failed to load schedule'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const updateSchedule = async (patch) => {
    try {
      const d = await api('/platform/backup/schedule', { method: 'PUT', token: auth.token, body: patch });
      setSchedule(d.schedule);
      toast('Schedule updated');
    } catch { toast('Failed to update schedule'); }
  };

  const triggerBackup = async () => {
    setBusy('trigger');
    try {
      const r = await api('/platform/backup/schedule/trigger', { method: 'POST', token: auth.token });
      toast(r.ok ? `Backup complete: ${r.totalDocs} docs, ${(r.sizeBytes / 1024).toFixed(1)}KB in ${r.durationMs}ms` : `Backup failed: ${r.message}`);
      load();
    } catch { toast('Backup trigger failed'); }
    setBusy('');
  };

  const verifyBackup = async () => {
    setBusy('verify');
    try {
      const r = await api('/platform/backup/verify', { method: 'POST', token: auth.token });
      setVerifyResult(r);
      toast(r.ok ? 'Verification passed — all collections healthy' : 'Verification found issues — check details below');
      load();
    } catch { toast('Verification failed'); }
    setBusy('');
  };

  return (
    <div className="space-y-6">
      {/* Schedule Config */}
      <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Backup Schedule</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Frequency</label>
            <select className="h-9 w-full rounded-md border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none focus:border-black"
              value={schedule?.frequency || 'daily'} onChange={e => updateSchedule({ frequency: e.target.value })}>
              {['hourly', 'daily', 'weekly', 'monthly', 'disabled'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Max Snapshots</label>
            <input type="number" className="h-9 w-full rounded-md border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none focus:border-black"
              value={schedule?.maxSnapshots || 30} onChange={e => updateSchedule({ maxSnapshots: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Retention (days)</label>
            <input type="number" className="h-9 w-full rounded-md border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none focus:border-black"
              value={schedule?.maxAgeDays || 90} onChange={e => updateSchedule({ maxAgeDays: Number(e.target.value) })} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-[12px] text-[#777777]">
          <span>Last run: {schedule?.lastRunAt ? new Date(schedule.lastRunAt).toLocaleString() : 'Never'}</span>
          <span>Status: <span className={schedule?.lastRunStatus === 'success' ? 'font-medium text-black' : 'text-[#777777]'}>{schedule?.lastRunStatus || '—'}</span></span>
          <span>Next: {schedule?.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : '—'}</span>
          <span>Runs: {schedule?.runCount || 0} · Fails: {schedule?.failCount || 0}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={triggerBackup} disabled={busy === 'trigger'} className={btnSolid}>
          {busy === 'trigger' ? <RefreshCw size={12} className="animate-spin inline mr-1" /> : <Play size={12} className="inline mr-1" />}
          Trigger Backup Now
        </button>
        <button onClick={verifyBackup} disabled={busy === 'verify'} className={btnGhost}>
          {busy === 'verify' ? <RefreshCw size={12} className="animate-spin inline mr-1" /> : <CheckCircle2 size={12} className="inline mr-1" />}
          Verify Restore Integrity
        </button>
      </div>

      {/* Verification Results */}
      {verifyResult && (
        <div className={`rounded-md border p-5 ${verifyResult.ok ? 'border-black bg-[#FAFAFA]' : 'border-[#EAEAEA] bg-[#FAFAFA]'}`}>
          <p className="text-[14px] font-semibold text-black">{verifyResult.ok ? '✅ Verification Passed' : '⚠️ Verification Issues Found'}</p>
          <p className="mt-1 text-[12px] text-[#777777]">Verified at {new Date(verifyResult.timestamp).toLocaleString()}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(verifyResult.results || {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[12px]">
                {v.ok ? <CheckCircle2 size={12} className="text-black" /> : <XCircle size={12} className="text-[#777777]" />}
                <span className="text-[#555555]">{k}</span>
                {v.count !== undefined && <span className="text-[#999999]">({v.count} docs)</span>}
                {v.label && <span className="text-[#999999]">({v.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * CONFIGURE MODAL (existing, preserved)
 * ══════════════════════════════════════════════════════════════════════════ */
function ConfigureModal({ integration, auth, onClose }) {
  const { toast } = useApp();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/platform/integrations/${integration.id}`, { method: 'PUT', token: auth.token, body: { config: form, enabled: true } });
      toast(`${integration.name} configured and enabled`);
      onClose();
    } catch { toast('Failed to save'); }
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
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{f.label} {f.required && '*'}</label>
              {f.type === 'boolean' ? (
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.checked })} className="h-4 w-4 accent-black" />{f.hint || 'Enable'}</label>
              ) : (
                <input type={f.type === 'password' ? 'password' : 'text'} className="h-9 w-full rounded-md border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none focus:border-black" placeholder={f.hint || ''} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
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

/* ══════════════════════════════════════════════════════════════════════════
 * SECURITY PANEL — API Keys + Audit (existing, preserved)
 * ══════════════════════════════════════════════════════════════════════════ */
function SecurityPanel({ auth }) {
  const { toast } = useApp();
  const [keys, setKeys] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState([]);
  const [auditLogs, setAuditLogs] = useState(null);

  const loadKeys = () => api('/platform/api-keys', { token: auth.token }).then(d => setKeys(d.keys || [])).catch(() => toast('Failed to load'));
  const loadAudit = () => api('/platform/audit?limit=25', { token: auth.token }).then(d => setAuditLogs(d.logs || [])).catch(() => {});
  useEffect(() => { loadKeys(); loadAudit(); }, []); // eslint-disable-line

  const createKey = async () => {
    if (!name.trim()) { toast('Name required'); return; }
    try {
      const r = await api('/platform/api-keys', { method: 'POST', token: auth.token, body: { name, scopes } });
      setNewKey(r.plaintext); setShowCreate(false); setName(''); setScopes([]); loadKeys();
    } catch { toast('Failed'); }
  };
  const revokeKey = async (id) => {
    if (!window.confirm('Revoke this key?')) return;
    try { await api(`/platform/api-keys/${id}`, { method: 'DELETE', token: auth.token }); toast('Revoked'); loadKeys(); } catch { toast('Failed'); }
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
            <button onClick={() => { navigator.clipboard?.writeText(newKey); toast('Copied'); }} className="mt-2 text-[11px] font-medium text-[#777777] hover:text-black">Copy</button>
          </div>
        )}
        {keys?.length === 0 ? <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No API keys.</div> : (
          <div className="divide-y divide-[#F0F0F0]">
            {(keys || []).map(k => (
              <div key={k._id} className="flex items-center justify-between px-5 py-3">
                <div><p className="text-[13px] font-medium text-black">{k.name}</p><p className="text-[11px] text-[#AAAAAA]"><code>{k.keyPrefix}…</code> · {k.scopes?.length || 0} scopes{k.lastUsedAt && ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`}</p></div>
                <button onClick={() => revokeKey(k._id)} className="rounded-md border border-[#EAEAEA] px-3 py-1.5 text-[11px] font-medium text-[#777777] hover:text-black">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md rounded-md border border-[#EAEAEA] bg-white" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[#EAEAEA] px-6 py-4"><p className="text-[14px] font-semibold text-black">Create API Key</p></div>
            <div className="p-6 space-y-4">
              <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Name *</label><input className="h-9 w-full rounded-md border border-[#DCDCDC] px-3 text-[13px] outline-none focus:border-black" value={name} onChange={e => setName(e.target.value)} placeholder="My App" /></div>
              <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Scopes</label>
                <div className="flex flex-wrap gap-1.5">{['products:read', 'orders:read', 'customers:read', 'analytics:read'].map(s => <button key={s} onClick={() => setScopes(scopes.includes(s) ? scopes.filter(x => x !== s) : [...scopes, s])} className={`rounded-sm px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition ${scopes.includes(s) ? 'bg-black text-white' : 'border border-[#EAEAEA] text-[#777777]'}`}>{s}</button>)}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EAEAEA] px-6 py-4"><button onClick={() => setShowCreate(false)} className={btnGhost}>Cancel</button><button onClick={createKey} className={btnSolid}>Create</button></div>
          </div>
        </div>
      )}

      {/* Audit Log */}
      <div className="rounded-md border border-[#EAEAEA] bg-white">
        <div className="border-b border-[#EAEAEA] px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Recent Audit Log</p>
        </div>
        {auditLogs?.length === 0 ? <div className="p-8 text-center text-[13px] text-[#AAAAAA]">No audit entries.</div> : (
          <div className="divide-y divide-[#F0F0F0]">
            {(auditLogs || []).slice(0, 15).map(l => (
              <div key={l._id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-[12px] text-black"><span className="font-medium">{l.action}</span> · {l.target}{l.targetId ? ` (${l.targetId.slice(0, 12)}…)` : ''}</p>
                  <p className="text-[10px] text-[#AAAAAA]">{l.user} · {new Date(l.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
