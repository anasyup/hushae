import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

export default function EmailCampaigns() {
  const { auth, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api('/email-campaigns', { token: auth?.token });
      setRows(d.campaigns || []);
      setTotal(d.total || 0);
    } catch { setRows([]); toast('Could not load campaigns'); }
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const statusOf = (s) => {
    const k = String(s || 'sent').toUpperCase();
    return { label: k, dim: k !== 'SENT' };
  };

  return (
    <AdminLayout title="Email campaigns">
      <PageHeader
        title="Email campaigns"
        description="History of emails sent to groups or newsletter subscribers. Create from Customers → Groups."
        actions={<button type="button" onClick={load} className={btnGhost}><RefreshCcw size={12} /> Refresh</button>}
      />

      <section>
        <p className="adm-index">Campaigns</p>
        {!rows && <TableSkeleton rows={5} />}
        {rows && rows.length === 0 && (
          <EditorialEmpty
            title="No campaigns"
            description="Go to Customers → Groups, pick a group, and send an email. Only opted-in customers are included."
          />
        )}
        {rows && rows.length > 0 && (
          <div>
            {rows.map((c) => {
              const st = statusOf(c.status);
              const open = expanded === c._id;
              return (
                <div key={c._id} className="border-b border-[#EAEAEA]">
                  <button type="button" className="flex w-full items-center gap-4 py-4 text-left adm-row-hover" onClick={() => setExpanded(open ? null : c._id)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-black">{c.subject}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#AAAAAA]">
                        {c.groupName || 'group'} · {fmtDateTime(c.sentAt)} · {c.sentByName || 'admin'}
                      </span>
                    </span>
                    <MonoStatus label={st.label} dim={st.dim} />
                    <span className="hidden shrink-0 text-[12px] text-[#999999] sm:block">
                      {c.sent} sent{c.failed > 0 ? ` · ${c.failed} failed` : ''}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-[#F0F0F0] pb-6 pt-4">
                      <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-5">
                        {[['Matched', c.matched], ['Opted in', c.optedIn], ['Sent', c.sent], ['Failed', c.failed], ['Skipped', c.skipped || 0]].map(([label, val]) => (
                          <div key={label} className="px-4 py-4">
                            <p className="adm-label">{label}</p>
                            <p className="adm-metric mt-1 text-[20px] text-black">{val}</p>
                          </div>
                        ))}
                      </div>
                      <p className="adm-label mt-6">Message</p>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#555555]">{c.body}</p>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">{total} campaign{total === 1 ? '' : 's'} total</p>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
