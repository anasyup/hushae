import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum,
  EditorialEmpty, TableSkeleton, MonoStatus, ctl, ta, btnGhost,
} from './settings/chrome';

/* ===========================================================================
 * SETTINGS SUB-PAGES — Store / Payments / Shipping / Legal.
 * Same slices, same PUT fields. Presentation only.
 * ========================================================================== */

function useSettingsSlice() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth.token })
      .then((d) => { setS(d.settings); setOriginal(JSON.stringify(d.settings)); })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
  }, []); // eslint-disable-line

  const dirty = s && original && JSON.stringify(s) !== original;
  const reset = () => { if (original) setS(JSON.parse(original)); };

  const save = async (fieldsToSend) => {
    setBusy(true);
    try {
      const body = {};
      for (const f of fieldsToSend) if (s[f] !== undefined) body[f] = s[f];
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setOriginal(JSON.stringify(s));
      toast('Saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return { s, setS, dirty, reset, save, busy, auth, toast, err };
}

function Shell({ title, description, actions, children, err }) {
  return (
    <AdminLayout title={title}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: title }]}
        actions={actions}
      />
      {err ? <EditorialEmpty title="Unable to load settings" description={err} action={<Link to="/admin/settings" className={btnGhost}>Back to settings</Link>} /> : children}
    </AdminLayout>
  );
}

/* ==========================================================================
 * STORE DETAILS
 * ======================================================================== */
export function SettingsStore() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();
  if (!s && !err) {
    return <AdminLayout title="Store details"><PageHeader title="Store details" description="Your public identity." /><TableSkeleton rows={6} /></AdminLayout>;
  }
  const set = (k, v) => setS({ ...s, [k]: v });
  const setBadge = (i, k, v) => setS({ ...s, trustBadges: (s.trustBadges || []).map((b, j) => j === i ? { ...b, [k]: v } : b) });

  return (
    <Shell title="Store details" description="Your public identity — the name, tagline and contact info that customers see across the site and emails." err={err}>
      {s && (
        <>
          <EdSection index={1} title="Store details" description="These appear in the header, footer and every automated email.">
            <div className="grid gap-4 md:grid-cols-2">
              <EdText label="Store name" value={s.storeName || ''} onChange={(v) => set('storeName', v)} />
              <EdText label="Tagline" value={s.tagline || ''} onChange={(v) => set('tagline', v)} />
            </div>
          </EdSection>

          <EdSection index={2} title="Contact" description="Shown in the footer, order confirmations, and used by customers to reach you.">
            <div className="grid gap-4 md:grid-cols-2">
              <EdText label="Contact email" type="email" value={s.contactEmail || ''} onChange={(v) => set('contactEmail', v)} placeholder="care@yourstore.com" />
              <EdText label="Contact phone" value={s.contactPhone || ''} onChange={(v) => set('contactPhone', v)} placeholder="+92 300 1234567" />
            </div>
          </EdSection>

          <EdSection index={3} title="Trust badges" description="Short credibility statements shown below the hero.">
            <div className="space-y-3">
              {(s.trustBadges || []).map((b, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[220px_1fr]">
                  <input className={ctl} value={b.title || ''} onChange={(e) => setBadge(i, 'title', e.target.value)} placeholder="Badge title" />
                  <input className={ctl} value={b.text || ''} onChange={(e) => setBadge(i, 'text', e.target.value)} placeholder="Short supporting text" />
                </div>
              ))}
            </div>
          </EdSection>

          <EdSaveBar dirty={dirty} busy={busy} onSave={() => save(['storeName', 'tagline', 'contactEmail', 'contactPhone', 'trustBadges'])} onDiscard={reset} />
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * PAYMENTS
 * ======================================================================== */
export function SettingsPayments() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();
  if (!s && !err) {
    return <AdminLayout title="Payments"><PageHeader title="Payments" description="Configure payment methods." /><TableSkeleton rows={6} /></AdminLayout>;
  }
  if (err || !s) {
    return <Shell title="Payments" description="Configure available payment methods and payment behavior." err={err || 'Could not load settings'} />;
  }

  const pm = s.paymentMethods || {};
  const setPM = (k, v) => setS({ ...s, paymentMethods: { ...pm, [k]: v } });

  const ints = s.integrations || {};
  const gw = ints.payments || {};
  const sp = gw.safepay || {};
  const jz = gw.jazzcash || {};
  const setGW = (id, patch) => setS({ ...s, integrations: { ...ints, payments: { ...gw, [id]: { ...(gw[id] || {}), ...patch } } } });
  const setSP = (k, v) => setGW('safepay', { [k]: v });
  const setJZ = (k, v) => setGW('jazzcash', { [k]: v });

  const spConfigured = !!(sp.apiKey && sp.secret);
  const jzConfigured = !!(jz.merchantId && jz.password && jz.integritySalt);

  const list = (s.checkout && s.checkout.paymentList) || [];
  const visaRow = list.find((m) => m.id === 'Visa');
  const gatewayOn = (which) => {
    if (which === 'safepay') return visaRow?.enabled && spConfigured;
    if (which === 'jazzcash-api') return visaRow?.enabled && jzConfigured;
    return false;
  };
  const setGatewayEnabled = (which, on) => {
    const nextList = list.some((m) => m.id === 'Visa')
      ? list.map((m) => (m.id === 'Visa' ? { ...m, enabled: on && (which === 'safepay' ? spConfigured : jzConfigured), comingSoon: false } : m))
      : [...list, { id: 'Visa', label: 'Visa / Mastercard', note: 'Pay online with your card', icon: 'CreditCard', enabled: on && (which === 'safepay' ? spConfigured : jzConfigured), needsTxn: false, instructions: '', comingSoon: false }];
    setS({ ...s, checkout: { ...(s.checkout || {}), paymentList: nextList } });
  };

  return (
    <Shell title="Payments" description="Configure available payment methods and payment behavior.">
      <EdSection index={1} title="Methods" description="Customers see only the methods you enable.">
        <EdToggle
          label="Cash on Delivery"
          description="Recommended — most Pakistani e-commerce is COD."
          checked={!!pm.cod}
          onChange={(v) => setPM('cod', v)}
        />
        <EdToggle
          label="JazzCash"
          description="Accept JazzCash mobile transfers."
          checked={!!pm.jazzcash}
          onChange={(v) => setPM('jazzcash', v)}
        />
        {pm.jazzcash && (
          <div className="mt-4 grid gap-4 border-t border-[#F0F0F0] pt-4 md:grid-cols-2">
            <EdText label="JazzCash number" value={pm.jazzcashNumber || ''} onChange={(v) => setPM('jazzcashNumber', v)} placeholder="0300 1234567" />
            <EdText label="Account title" value={pm.jazzcashTitle || ''} onChange={(v) => setPM('jazzcashTitle', v)} placeholder="Your Name" />
          </div>
        )}
        <EdToggle
          label="EasyPaisa"
          description="Accept EasyPaisa mobile transfers."
          checked={!!pm.easypaisa}
          onChange={(v) => setPM('easypaisa', v)}
        />
        {pm.easypaisa && (
          <div className="mt-4 grid gap-4 border-t border-[#F0F0F0] pt-4 md:grid-cols-2">
            <EdText label="EasyPaisa number" value={pm.easypaisaNumber || ''} onChange={(v) => setPM('easypaisaNumber', v)} placeholder="0345 1234567" />
            <EdText label="Account title" value={pm.easypaisaTitle || ''} onChange={(v) => setPM('easypaisaTitle', v)} placeholder="Your Name" />
          </div>
        )}
        <EdToggle label="Bank Transfer" checked={!!pm.bank} onChange={(v) => setPM('bank', v)} />
        {pm.bank && (
          <div className="mt-4 border-t border-[#F0F0F0] pt-4">
            <label className="adm-label mb-1.5 block">Bank details (shown at checkout)</label>
            <textarea className={ta} value={pm.bankDetails || ''} onChange={(e) => setPM('bankDetails', e.target.value)} placeholder={'Bank: Meezan Bank\nTitle: Your Business Name\nIBAN: PK00 MEZN 0000 0000 0000 0000'} />
            <p className="mt-1.5 text-[11px] text-[#AAAAAA]">Multi-line supported. Include bank name, account title, and IBAN.</p>
          </div>
        )}
      </EdSection>

      <EdSection index={2} title="Configuration" description="Card gateways. Customers see cards at checkout only once a gateway is configured and enabled.">
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] text-white">SafePay</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Visa / Mastercard. Apply at getsafepay.com.</p>
              </div>
              <MonoStatus label={gatewayOn('safepay') ? 'ENABLED' : 'DISABLED'} dim={!gatewayOn('safepay')} />
            </div>
            <EdToggle label="Enable SafePay" checked={gatewayOn('safepay')} onChange={(v) => setGatewayEnabled('safepay', v)} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <MonoStatus label={sp.sandbox ? 'SANDBOX' : 'LIVE'} dim={!!sp.sandbox} />
              <button type="button" onClick={() => setSP('sandbox', !sp.sandbox)} className={btnGhost}>
                Switch to {sp.sandbox ? 'live' : 'sandbox'}
              </button>
            </div>
            {sp.sandbox && <p className="mt-3 text-[12px] text-[#AAAAAA]">Test mode — no real money moves. Paste sandbox keys to try the flow.</p>}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <EdText label="API key (client)" value={sp.apiKey || ''} onChange={(v) => setSP('apiKey', v)} placeholder="SF-XXXX-…" />
              <EdText label="Secret key" type="password" value={sp.secret || ''} onChange={(v) => setSP('secret', v)} placeholder="••••••••" />
            </div>
            <p className="mt-2 text-[12px] text-[#AAAAAA]">{spConfigured ? 'Gateway is configured — cards will appear at checkout.' : 'Fill both keys to enable cards at checkout.'}</p>
          </div>

          <div className="border-t border-[#EAEAEA] pt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] text-white">JazzCash Merchant API</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Hosted payment page. Register at payments.jazzcash.com.pk.</p>
              </div>
              <MonoStatus label={gatewayOn('jazzcash-api') ? 'ENABLED' : 'DISABLED'} dim={!gatewayOn('jazzcash-api')} />
            </div>
            <EdToggle label="Enable JazzCash Merchant API" checked={gatewayOn('jazzcash-api')} onChange={(v) => setGatewayEnabled('jazzcash-api', v)} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <MonoStatus label={jz.sandbox ? 'SANDBOX' : 'LIVE'} dim={!!jz.sandbox} />
              <button type="button" onClick={() => setJZ('sandbox', !jz.sandbox)} className={btnGhost}>
                Switch to {jz.sandbox ? 'live' : 'sandbox'}
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <EdText label="Merchant ID" value={jz.merchantId || ''} onChange={(v) => setJZ('merchantId', v)} placeholder="MC-…" />
              <EdText label="Password" type="password" value={jz.password || ''} onChange={(v) => setJZ('password', v)} placeholder="••••••••" />
              <EdText label="Integrity salt" type="password" value={jz.integritySalt || ''} onChange={(v) => setJZ('integritySalt', v)} placeholder="••••••••" />
            </div>
            <p className="mt-2 text-[12px] text-[#AAAAAA]">{jzConfigured ? 'Gateway is configured — JazzCash checkout will be offered.' : 'Fill merchant ID, password and integrity salt to enable.'}</p>
          </div>
        </div>
      </EdSection>

      <EdSection index={3} title="Payment behavior">
        <p className="text-[12px] leading-relaxed text-[#AAAAAA]">
          Credentials are encrypted at rest and never shown to shoppers. Use sandbox keys until launch day — then flip to live.
        </p>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={() => save(['paymentMethods', 'integrations', 'checkout'])} onDiscard={reset} />
    </Shell>
  );
}

/* ==========================================================================
 * SHIPPING
 * ======================================================================== */
export function SettingsShipping() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();
  if (!s && !err) {
    return <AdminLayout title="Shipping"><PageHeader title="Shipping" description="Delivery rates and operating costs." /><TableSkeleton rows={6} /></AdminLayout>;
  }
  if (err || !s) {
    return <Shell title="Shipping" description="Set delivery rates and the true costs of running your store." err={err || 'Could not load settings'} />;
  }

  const set = (k, v) => setS({ ...s, [k]: v });
  const oc = s.operatingCosts || {};
  const setOC = (k, v) => setS({ ...s, operatingCosts: { ...oc, [k]: Number(v) || 0 } });

  return (
    <Shell title="Shipping" description="Set delivery rates and the true costs of running your store — used by the Dashboard to compute real profit.">
      <EdSection index={1} title="Rates" description="Flat rate applies to every order below the free-shipping threshold.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Flat rate (PKR)" value={s.shippingFlatRate ?? 350} onChange={(v) => set('shippingFlatRate', Number(v))} min="0" hint="Standard for Pakistan: PKR 200–400 nationwide." />
          <EdNum label="Free shipping over (PKR)" value={s.freeShippingThreshold ?? 4999} onChange={(v) => set('freeShippingThreshold', Number(v))} min="0" hint="Encourages larger baskets. Set to 0 to disable." />
        </div>
      </EdSection>

      <EdSection index={2} title="Per-order operating costs" description="Subtracted from gross profit — set them for accurate P&L.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Packing materials (PKR / order)" value={oc.packingPerOrder || 0} onChange={(v) => setOC('packingPerOrder', v)} min="0" hint="Boxes, tape, tissue paper, thank-you cards." />
          <EdNum label="Courier subsidy (PKR / order)" value={oc.shippingSubsidy || 0} onChange={(v) => setOC('shippingSubsidy', v)} min="0" hint="Difference between what courier charges you and what you charged the customer." />
        </div>
      </EdSection>

      <EdSection index={3} title="Courier cost per parcel" description="What the courier bills you. Used by Finance → Order profitability.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Default courier cost (PKR / parcel)" value={oc.defaultCourierCost || 0} onChange={(v) => setOC('defaultCourierCost', v)} min="0" hint="Applies to every city unless overridden below." />
          <EdNum label="Return costs this many times the outbound leg" value={oc.returnCourierMultiplier ?? 2} onChange={(v) => setOC('returnCourierMultiplier', v)} min="1" step="0.5" hint="A returned parcel is usually billed both ways — that is 2." />
        </div>
        <div className="mt-6">
          <p className="adm-label mb-3">Per-city rates (optional)</p>
          <div className="space-y-2">
            {(oc.courierByCity || []).map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  className={`${ctl} min-w-[140px] flex-1`}
                  placeholder="City, e.g. Karachi"
                  value={row.city || ''}
                  onChange={(e) => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.map((r, j) => (j === i ? { ...r, city: e.target.value } : r)) } })}
                />
                <input
                  className={`${ctl} w-28`}
                  type="number"
                  min="0"
                  placeholder="PKR"
                  value={row.cost ?? ''}
                  onChange={(e) => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.map((r, j) => (j === i ? { ...r, cost: Number(e.target.value) || 0 } : r)) } })}
                />
                <button
                  type="button"
                  onClick={() => setS({ ...s, operatingCosts: { ...oc, courierByCity: oc.courierByCity.filter((_, j) => j !== i) } })}
                  className={btnGhost}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setS({ ...s, operatingCosts: { ...oc, courierByCity: [...(oc.courierByCity || []), { city: '', cost: 0 }] } })}
              className={btnGhost}
            >
              Add a city rate
            </button>
          </div>
        </div>
      </EdSection>

      <EdSection index={4} title="Payment gateway fees" description="The percentage each method keeps. COD is normally 0.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['cod', 'COD (%)'],
            ['jazzcash', 'JazzCash (%)'],
            ['easypaisa', 'EasyPaisa (%)'],
            ['bank', 'Bank transfer (%)'],
            ['card', 'Card / Visa (%)'],
          ].map(([key, label]) => (
            <EdNum
              key={key}
              label={label}
              min="0"
              step="0.05"
              value={(oc.paymentFees || {})[key] ?? ''}
              onChange={(v) => setS({ ...s, operatingCosts: { ...oc, paymentFees: { ...(oc.paymentFees || {}), [key]: Number(v) || 0 } } })}
            />
          ))}
        </div>
      </EdSection>

      <EdSection index={5} title="Targets & thresholds" description="Drive the dashboard goal tracker and profitability warnings.">
        <div className="grid gap-4 md:grid-cols-2">
          <EdNum label="Monthly revenue goal (PKR)" value={s.monthlyRevenueGoal || 0} onChange={(v) => set('monthlyRevenueGoal', Number(v) || 0)} min="0" hint="Shown as a progress bar on the Dashboard." />
          <EdNum label="Minimum acceptable margin (%)" value={s.marginThresholdPercent ?? 15} onChange={(v) => set('marginThresholdPercent', Number(v) || 0)} min="0" max="100" hint="Orders below this are flagged in Finance." />
        </div>
      </EdSection>

      <EdSection index={6} title="Monthly marketing & fixed costs" description="Divided across all monthly orders in the P&L view.">
        <div className="grid gap-4 md:grid-cols-3">
          <EdNum label="Ads (PKR / month)" value={oc.monthlyMarketing || 0} onChange={(v) => setOC('monthlyMarketing', v)} min="0" hint="Meta, Google, TikTok spend." />
          <EdNum label="SEO / Content (PKR / month)" value={oc.monthlySeo || 0} onChange={(v) => setOC('monthlySeo', v)} min="0" hint="Blog writing, agency retainer, backlinks." />
          <EdNum label="Other fixed (PKR / month)" value={oc.monthlyOther || 0} onChange={(v) => setOC('monthlyOther', v)} min="0" hint="Hosting, tools, subscriptions." />
        </div>
      </EdSection>

      <EdSection index={7} title="Live preview" description="This is exactly what customers see at checkout.">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#999999]">Shipping</span>
            <span className="tabular-nums text-white">Flat PKR {(s.shippingFlatRate ?? 350).toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#999999]">Free over</span>
            <span className="tabular-nums text-white">PKR {(s.freeShippingThreshold ?? 4999).toLocaleString()}</span>
          </div>
        </div>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={() => save(['shippingFlatRate', 'freeShippingThreshold', 'operatingCosts', 'monthlyRevenueGoal', 'marginThresholdPercent'])} onDiscard={reset} />
    </Shell>
  );
}

/* ==========================================================================
 * LEGAL — existing placeholder only. Do not invent an editor.
 * ======================================================================== */
export function SettingsLegal() {
  return (
    <AdminLayout title="Legal & Policies">
      <PageHeader
        title="Legal & Policies"
        description="Terms of service, privacy policy, refund policy, and cookie consent text."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Legal' }]}
      />
      <EditorialEmpty
        title="Coming soon"
        description="A dedicated editor for Terms of Service, Privacy Policy, Refund Policy and Cookie Consent is not available yet. This page is a reserved destination."
      />
    </AdminLayout>
  );
}
