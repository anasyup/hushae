import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { fmtDate } from '../lib/format';
import {
  btnGhost, btnSolid, btnIcon, ctl,
  EditorialEmpty, TableSkeleton,
} from './orders/orderUi';

/* ===========================================================================
 * Customer groups — Phase 06 editorial chrome. Rules / preview / email unchanged.
 * ========================================================================== */

const EMPTY_RULES = { minSpend: 0, minOrders: 0, lastOrderDays: 0, noOrders: false, city: '', province: '', anyTag: [], allTags: [] };

function RuleNum({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="adm-label mb-1.5 block">{label}</label>
      <input type="number" min="0" className={ctl} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      {hint && <p className="mt-1 text-[11px] text-[#AAAAAA]">{hint}</p>}
    </div>
  );
}

function RuleText({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="adm-label mb-1.5 block">{label}</label>
      <input className={ctl} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || ''} />
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }) {
  const [text, setText] = useState((value || []).join(', '));
  useEffect(() => setText((value || []).join(', ')), [value]);
  const commit = (v) => onChange(v.split(',').map((t) => t.trim()).filter(Boolean));
  return (
    <div>
      <label className="adm-label mb-1.5 block">Tags</label>
      <input className={ctl} value={text} onChange={(e) => { setText(e.target.value); commit(e.target.value); }} placeholder={placeholder || 'comma, separated'} />
    </div>
  );
}

export default function CustomerGroups() {
  const { auth, toast } = useApp();

  const [groups, setGroups] = useState(null);
  const [editing, setEditing] = useState(null);
  const [rules, setRules] = useState({ ...EMPTY_RULES });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const [emailFor, setEmailFor] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const openEmail = (g) => { setEmailFor(g); setEmailSubject(''); setEmailBody(''); };
  const closeEmail = () => { setEmailFor(null); setEmailSubject(''); setEmailBody(''); setEmailBusy(false); };

  const sendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { toast('Subject and message are required'); return; }
    setEmailBusy(true);
    try {
      const d = await api('/email-campaigns', {
        method: 'POST', token: auth?.token,
        body: { target: 'group', groupId: emailFor._id, subject: emailSubject, body: emailBody },
      });
      toast(d.message || 'Campaign sent');
      closeEmail();
    } catch (ex) {
      toast(ex.message || 'Could not send — check SMTP is active');
    }
    setEmailBusy(false);
  };

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

  const archive = async (g) => {
    const action = g.archivedAt ? 'restore' : 'archive';
    if (!window.confirm(`${action === 'archive' ? 'Archive' : 'Restore'} “${g.name}”? Rules and members stay intact.`)) return;
    try {
      await api(`/customer-groups/${g._id}/archive`, { method: 'POST', token: auth?.token });
      toast(`Group ${action}d`);
      load();
    } catch (err) { toast(err.message || 'Could not update group'); }
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete the "${g.name}" group? Only manual membership links are removed; customers and orders stay intact.`)) return;
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
      <PageHeader
        title="Customer groups"
        description="Saved segments — members are computed live."
        actions={(
          <>
            {!editing && <button type="button" onClick={startNew} className={btnSolid}><Plus size={12} /> New group</button>}
            {editing && <button type="button" onClick={cancel} className={btnGhost}><ArrowLeft size={12} /> Back</button>}
          </>
        )}
      />

      {editing ? (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <section className="mb-10">
              <p className="adm-index">Group</p>
              <div className="space-y-4 border-y border-[#EAEAEA] py-6">
                <div>
                  <label className="adm-label mb-1.5 block">Name *</label>
                  <input className={ctl} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VIP — spent over 10k" />
                </div>
                <div>
                  <label className="adm-label mb-1.5 block">Description</label>
                  <input className={ctl} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who belongs here?" />
                </div>
              </div>
            </section>

            <section>
              <p className="adm-index">Rules</p>
              <p className="mb-4 text-[12px] text-[#AAAAAA]">Every set rule must be true. Leave empty to match all customers.</p>
              <div className="space-y-5 border-y border-[#EAEAEA] py-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <RuleNum label="Min lifetime spend (PKR)" value={rules.minSpend} onChange={(v) => setRules((r) => ({ ...r, minSpend: v }))} hint="0 = ignored" />
                  <RuleNum label="Min orders" value={rules.minOrders} onChange={(v) => setRules((r) => ({ ...r, minOrders: v }))} hint="0 = ignored" />
                  <RuleNum label="Ordered within days" value={rules.lastOrderDays} onChange={(v) => setRules((r) => ({ ...r, lastOrderDays: v }))} hint="0 = any time" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RuleText label="City (exact)" value={rules.city} onChange={(v) => setRules((r) => ({ ...r, city: v }))} placeholder="e.g. Lahore" />
                  <RuleText label="Province (exact)" value={rules.province} onChange={(v) => setRules((r) => ({ ...r, province: v }))} placeholder="e.g. Punjab" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TagsInput value={rules.anyTag} onChange={(v) => setRules((r) => ({ ...r, anyTag: v }))} placeholder="matches ANY of these tags" />
                  <TagsInput value={rules.allTags} onChange={(v) => setRules((r) => ({ ...r, allTags: v }))} placeholder="must have ALL of these tags" />
                </div>
                <label className="flex cursor-pointer items-start gap-3 border border-[#EAEAEA] px-4 py-3">
                  <input type="checkbox" checked={rules.noOrders} onChange={(e) => setRules((r) => ({ ...r, noOrders: e.target.checked }))} className="mt-0.5 rounded-none accent-white" />
                  <span className="text-[13px] text-[#333333]">
                    Has never placed an order
                    <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">Registered customers who never bought.</span>
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside>
            <p className="adm-index">Preview</p>
            <div className="border-y border-[#EAEAEA] py-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] text-[#999999]">Computed from live customers.</p>
                <button type="button" onClick={runPreview} className={btnIcon} aria-label="Refresh preview">
                  {previewBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                </button>
              </div>
              {preview && (
                <p className="adm-metric text-[28px] text-black">
                  {preview.total.toLocaleString()}
                  <span className="ml-2 text-[11px] font-normal uppercase tracking-[0.14em] text-[#AAAAAA]">customers</span>
                </p>
              )}
              <div className="mt-4 max-h-72 space-y-0 overflow-y-auto">
                {(preview?.members || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-[#F0F0F0] py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-black">{m.name}</p>
                      <p className="truncate text-[11px] text-[#AAAAAA]">{m.phone || 'no phone'} · {m.email || 'no email'}</p>
                      {m.why?.[0] && <p className="mt-0.5 truncate text-[10px] text-white/25">{m.why[0]}</p>}
                    </div>
                    <span className="shrink-0 text-[11px] text-[#999999]">{m.orders} · {m.spend.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {preview && preview.total > preview.members.length && (
                <p className="mt-2 text-[11px] text-[#AAAAAA]">+ {preview.total - preview.members.length} more…</p>
              )}
            </div>
            <button type="button" onClick={save} disabled={saving} className={`${btnSolid} mt-5 w-full`}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={12} />}
              {editing.isNew ? 'Create group' : 'Save changes'}
            </button>
          </aside>
        </div>
      ) : !groups ? (
        <TableSkeleton rows={5} />
      ) : groups.length === 0 ? (
        <EditorialEmpty
          title="No groups"
          description="Build your first segment — VIP customers, inactive shoppers, a specific city — then reuse it for marketing."
          action={<button type="button" onClick={startNew} className={btnSolid}><Plus size={12} /> New group</button>}
        />
      ) : (
        <section>
          <p className="adm-index">Groups</p>
          <p className="mb-4 text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">
            {summary.total} groups · {summary.members.toLocaleString()} members
          </p>
          <div>
            {groups.map((g) => (
              <div key={g._id} className="flex flex-wrap items-end justify-between gap-3 border-b border-[#EAEAEA] py-5 adm-row-hover">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-black">{g.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[#AAAAAA]">{g.description || 'No description'}</p>
                  <p className="mt-2 text-[11px] text-[#999999]">{g.rulesSummary || 'Live rules'}</p>
                  <p className="mt-2 text-[11px] text-white/25">Updated {fmtDate(g.updatedAt)}</p>
                </div>
                <div className="flex items-end gap-4">
                  <div className="text-right">
                    <p className="adm-metric text-[22px] text-black">{g.memberCount?.toLocaleString?.() || 0}</p>
                    <p className="adm-label">Members</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA]">Campaigns: history only</span>
                  <button type="button" onClick={() => startEdit(g)} className={btnGhost}>Edit</button>
                  <button type="button" onClick={() => archive(g)} className={btnGhost}>{g.archivedAt ? 'Restore' : 'Archive'}</button>
                  <button type="button" onClick={() => remove(g)} className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA] hover:text-black" title="Delete group">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {emailFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={closeEmail}>
          <div className="w-full max-w-lg border border-[#EAEAEA] bg-[#0D0D0D] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[15px] font-medium text-black">Email “{emailFor.name}”</p>
                <p className="mt-1 text-[12px] text-[#AAAAAA]">
                  Goes to opted-in members ({emailFor.memberCount?.toLocaleString?.() || 0} in group).
                </p>
              </div>
              <button type="button" onClick={closeEmail} className="text-[#AAAAAA] hover:text-black"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="adm-label mb-1.5 block">Subject</label>
                <input className={ctl} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="A little note from HUSHAE" />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Message</label>
                <textarea className={`${ctl} min-h-40 !h-auto py-3`} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder={'Hi,\n\nA short, personal message…\n\n— HUSHAE'} />
                <p className="mt-1 text-[11px] text-[#AAAAAA]">Plain text — only opted-in customers receive it.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeEmail} className={btnGhost}>Cancel</button>
              <button type="button" onClick={sendEmail} disabled={emailBusy} className={btnSolid}>
                {emailBusy ? <Loader2 size={14} className="animate-spin" /> : null} Send email
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
