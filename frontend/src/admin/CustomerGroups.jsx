import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Crown, Loader2, Plus, RefreshCcw, Save, Search, Trash2, Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { fmtDate } from '../lib/format';

/* ============================================================================
 * ADMIN → CUSTOMERS → GROUPS (Shopify-style saved segments)
 *
 * A group is a name + rules; members are evaluated LIVE from Users + Orders.
 * The builder shows a live preview count as you adjust rules, then you save
 * the group. Saved groups keep a cached memberCount for the list.
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';
const cardCls = 'rounded-2xl border border-neutral-200 bg-white p-5';

const EMPTY_RULES = { minSpend: 0, minOrders: 0, lastOrderDays: 0, noOrders: false, city: '', province: '', anyTag: [], allTags: [] };

function RuleNum({ label, hint, value, onChange }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" min="0" className={inputCls} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      {hint && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function RuleText({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ''} />
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }) {
  const [text, setText] = useState((value || []).join(', '));
  useEffect(() => setText((value || []).join(', ')), [value]);
  const commit = (v) => onChange(v.split(',').map((t) => t.trim()).filter(Boolean));
  return (
    <div>
      <label className={labelCls}>Tags</label>
      <input className={inputCls} value={text} onChange={(e) => { setText(e.target.value); commit(e.target.value); }} placeholder={placeholder || 'comma, separated'} />
    </div>
  );
}

export default function CustomerGroups() {
  const { auth, toast } = useApp();

  const [groups, setGroups] = useState(null);
  const [editing, setEditing] = useState(null); // group being edited (or {new})
  const [rules, setRules] = useState({ ...EMPTY_RULES });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('/customer-groups', { token: auth?.token });
      setGroups(d.groups || []);
    } catch { setGroups([]); toast('Could not load groups'); }
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const startNew = () => {
    setEditing({ isNew: true });
    setName('');
    setDescription('');
    setRules({ ...EMPTY_RULES });
    setPreview(null);
  };

  const startEdit = (g) => {
    setEditing(g);
    setName(g.name || '');
    setDescription(g.description || '');
    setRules({ ...EMPTY_RULES, ...(g.rules || {}) });
    setPreview(null);
  };

  const cancel = () => { setEditing(null); setPreview(null); };

  /* Live preview — evaluate the CURRENT rules without saving. */
  const runPreview = useCallback(async () => {
    setPreviewBusy(true);
    try {
      const d = await api(`/customer-groups/preview?rules=${encodeURIComponent(JSON.stringify(rules))}`, { token: auth?.token });
      setPreview(d);
    } catch { setPreview(null); }
    setPreviewBusy(false);
  }, [rules, auth?.token]);

  useEffect(() => {
    if (editing) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  const save = async () => {
    if (!name.trim()) { toast('Group name is required'); return; }
    setSaving(true);
    const body = { name, description, rules };
    try {
      if (editing?.isNew) await api('/customer-groups', { method: 'POST', token: auth?.token, body });
      else await api(`/customer-groups/${editing._id}`, { method: 'PUT', token: auth?.token, body });
      toast('Group saved');
      cancel();
      load();
    } catch (ex) {
      toast(ex.message || 'Could not save group');
    }
    setSaving(false);
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete the "${g.name}" group? Members are not affected.`)) return;
    try {
      await api(`/customer-groups/${g._id}`, { method: 'DELETE', token: auth?.token });
      toast('Group deleted');
      load();
    } catch { toast('Could not delete'); }
  };

  const summary = useMemo(() => {
    if (!groups) return { total: 0, members: 0 };
    return { total: groups.length, members: groups.reduce((s, g) => s + (g.memberCount || 0), 0) };
  }, [groups]);

  return (
    <AdminLayout title="Customer groups">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Customer groups</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Saved segments — build a rule set once, reuse it for marketing. Members are computed live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.total > 0 && (
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-medium text-neutral-600">
              {summary.total} groups · {summary.members.toLocaleString()} total members
            </span>
          )}
          {!editing && (
            <button onClick={startNew} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black">
              <Plus size={14} /> New group
            </button>
          )}
        </div>
      </div>

      {editing ? (
        /* ── BUILDER ── */
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className={cardCls}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-neutral-900">{editing.isNew ? 'New group' : `Edit — ${editing.name}`}</h3>
                <button onClick={cancel} className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-700"><ArrowLeft size={13} /> Back</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>Group name *</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP — spent over 10k" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who belongs here, and what should we send them?" />
                </div>
              </div>
            </div>

            <div className={cardCls}>
              <h3 className="mb-1 text-[14px] font-bold text-neutral-900">Rules</h3>
              <p className="mb-4 text-[12px] text-neutral-400">Every rule that is set must be true — a customer must satisfy all of them. Leave everything empty to match all customers.</p>

              <div className="grid gap-4 sm:grid-cols-3">
                <RuleNum label="Min lifetime spend (PKR)" value={rules.minSpend} onChange={(v) => setRules((r) => ({ ...r, minSpend: v }))} hint="0 = ignored" />
                <RuleNum label="Min orders" value={rules.minOrders} onChange={(v) => setRules((r) => ({ ...r, minOrders: v }))} hint="0 = ignored" />
                <RuleNum label="Ordered within days" value={rules.lastOrderDays} onChange={(v) => setRules((r) => ({ ...r, lastOrderDays: v }))} hint="0 = any time" />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <RuleText label="City (exact)" value={rules.city} onChange={(v) => setRules((r) => ({ ...r, city: v }))} placeholder="e.g. Lahore" />
                <RuleText label="Province (exact)" value={rules.province} onChange={(v) => setRules((r) => ({ ...r, province: v }))} placeholder="e.g. Punjab" />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TagsInput value={rules.anyTag} onChange={(v) => setRules((r) => ({ ...r, anyTag: v }))} placeholder="matches ANY of these tags" />
                <TagsInput value={rules.allTags} onChange={(v) => setRules((r) => ({ ...r, allTags: v }))} placeholder="must have ALL of these tags" />
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3.5 transition hover:border-neutral-300">
                <input type="checkbox" checked={rules.noOrders} onChange={(e) => setRules((r) => ({ ...r, noOrders: e.target.checked }))} className="mt-0.5 accent-neutral-900" />
                <span className="text-[13px] font-medium text-neutral-700">
                  Has never placed an order
                  <span className="block text-[12px] font-normal text-neutral-400">Good for a "win them back" campaign — registered customers who never bought.</span>
                </span>
              </label>
            </div>
          </div>

          {/* ── LIVE PREVIEW ── */}
          <div className="space-y-5">
            <div className={cardCls}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-neutral-900">Live preview</h3>
                <button onClick={runPreview} className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-400 hover:text-neutral-700">
                  {previewBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />} Refresh
                </button>
              </div>
              <p className="text-[12px] text-neutral-400">Members are computed from your real customers + orders, right now.</p>
              {preview && (
                <div className="mt-3 rounded-xl bg-neutral-50 p-4">
                  <p className="flex items-center gap-2 text-[15px] font-bold text-neutral-900"><Users size={15} /> {preview.total.toLocaleString()} customers</p>
                  <p className="text-[12px] text-neutral-400">match these rules (first {preview.members.length} shown)</p>
                </div>
              )}
              <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
                {(preview?.members || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-neutral-800">{m.name}</p>
                      <p className="truncate text-[11px] text-neutral-400">{m.phone || 'no phone'} · {m.email || 'no email'}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-neutral-400">{m.orders} orders · {m.spend.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {preview && preview.total > preview.members.length && (
                <p className="mt-2 text-[11px] text-neutral-400">+ {preview.total - preview.members.length} more…</p>
              )}
            </div>

            <button onClick={save} disabled={saving} className="w-full rounded-full bg-neutral-900 py-3 text-[14px] font-semibold text-white transition hover:bg-black disabled:opacity-60">
              {saving ? <Loader2 size={16} className="mx-auto animate-spin" /> : <Save size={15} className="mr-1.5 inline" />} {editing.isNew ? 'Create group' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : !groups ? (
        <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <Crown size={28} className="mx-auto text-neutral-300" />
          <p className="mt-3 text-[14px] font-semibold text-neutral-700">No groups yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] text-neutral-400">Build your first segment — VIP customers, inactive shoppers, a specific city — then reuse it for marketing.</p>
          <button onClick={startNew} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-black">
            <Plus size={14} /> New group
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g._id} className={`${cardCls} group relative`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-[14px] font-bold text-neutral-900">{g.name}</h3>
                <button onClick={() => remove(g)} className="rounded-lg p-1.5 text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600" title="Delete group"><Trash2 size={14} /></button>
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] text-neutral-400">{g.description || 'No description'}</p>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[22px] font-bold text-neutral-900">{g.memberCount?.toLocaleString?.() || 0}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">members</p>
                </div>
                <button onClick={() => startEdit(g)} className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:border-neutral-900">
                  Edit
                </button>
              </div>
              <p className="mt-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-400">Updated {fmtDate(g.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
