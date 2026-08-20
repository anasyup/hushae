import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { fmtDateTime } from '../lib/format';

/* ============================================================================
 * ADMIN → MARKETING → EMAIL CAMPAIGNS
 * History of emails sent from customer groups / the newsletter list.
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';

const STATUS_STYLE = {
  sent:    'bg-[#E9EFEA] text-[#3E5C4B] ring-[#C9D8CE]',
  partial: 'bg-[#F6F1E6] text-[#7A6239] ring-[#DCCBA5]',
  error:   'bg-[#F5EDEB] text-[#8A4B3F] ring-[#E0C6BE]',
  empty:   'bg-neutral-100 text-neutral-500 ring-neutral-200',
};

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

  return (
    <AdminLayout title="Email campaigns">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Email campaigns</h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-neutral-500">
            Emails sent to customer groups or newsletter subscribers. Only customers who opted into marketing emails are included.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-neutral-600 ring-1 ring-neutral-200 transition hover:ring-neutral-400">
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {!rows ? (
          <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Mail size={28} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[14px] font-semibold text-neutral-700">No campaigns yet</p>
            <p className="mt-1 text-[12px] text-neutral-400">Go to Customers → Groups, pick a group, and hit "Email".</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((c) => (
              <div key={c._id}>
                <button className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-neutral-50/70" onClick={() => setExpanded(expanded === c._id ? null : c._id)}>
                  <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STATUS_STYLE[c.status] || STATUS_STYLE.sent}`}>{c.status}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-neutral-900">{c.subject}</span>
                    <span className="block truncate text-[12px] text-neutral-400">to {c.groupName || 'group'} · {fmtDateTime(c.sentAt)} · by {c.sentByName || 'admin'}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-neutral-500">
                    <b className="text-neutral-900">{c.sent}</b> sent
                    {c.failed > 0 && <> · <b className="text-[#9A5548]">{c.failed}</b> failed</>}
                    {c.matched > 0 && <> · {c.matched} matched</>}
                  </span>
                </button>
                {expanded === c._id && (
                  <div className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {[
                        ['Matched', c.matched], ['Opted in', c.optedIn],
                        ['Sent', c.sent], ['Failed', c.failed], ['Skipped', c.skipped || 0],
                      ].map(([label, val]) => (
                        <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3">
                          <p className="text-[18px] font-bold text-neutral-900">{val}</p>
                          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Message</p>
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-700">{c.body}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-[12px] text-neutral-400">{total} campaign{total === 1 ? '' : 's'} total</p>
    </AdminLayout>
  );
}
