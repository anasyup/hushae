import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdNotice, EdText, EdSelect, EdToggle,
  TableSkeleton, MonoStatus, btnGhost,
} from './settings/chrome';

/* ============================================================================
 * SETTINGS SUB-PAGES — Weight Unit / Domain / Languages / Notifications
 * Batch 2 of the reserved-settings program (batch 1 = SettingsAddress.jsx:
 * Business Address / Time Zone / Currency). Same useSettingsSlice pattern.
 *
 * Backend: Settings model (units / domain / languages / notificationPrefs),
 * whitelisted in routes/settings.js. notificationPrefs gates
 * orderFlow.notify(); domain.useForSeo feeds routes/seo.js baseUrl().
 * ============================================================================ */

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

  /**
   * fieldsToSend — top-level settings keys to PUT.
   * overrides    — explicit values for those keys, used when a nested object
   *                was just merged into state (the state may not have
   *                re-rendered by the time save() reads it).
   */
  const save = async (fieldsToSend, overrides) => {
    setBusy(true);
    try {
      const body = {};
      for (const f of fieldsToSend) {
        const v = (overrides && overrides[f] !== undefined) ? overrides[f] : s[f];
        if (v !== undefined) body[f] = v;
      }
      await api('/settings', { method: 'PUT', token: auth.token, body });
      setOriginal(JSON.stringify({ ...s, ...(overrides || {}) }));
      toast('Saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return { s, setS, dirty, reset, save, busy, err };
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
      {err ? (
        <div className="mt-8 flex items-center gap-3 border border-[#EAEAEA] px-4 py-6 text-[13px] text-[#777777]">
          <span>{err}</span>
          <Link to="/admin/settings" className={btnGhost}>Back to settings</Link>
        </div>
      ) : children}
    </AdminLayout>
  );
}

/* ==========================================================================
 * WEIGHT UNIT — /admin/settings/units
 * ======================================================================== */
export function SettingsUnits() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Weight unit">
        <PageHeader title="Weight unit" description="How product weights and dimensions are expressed." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

  const units = s?.units || {};
  const setUnit = (k, v) => setS({ ...s, units: { ...units, [k]: v } });
  const weightPreview = units.weight === 'kg' ? '180 g → 0.18 kg' : '180 g → 180 g';
  const dimPreview = units.dimension === 'in' ? '30 cm → 11.8 in' : '30 cm → 30 cm';

  return (
    <Shell
      title="Weight unit"
      description="How weights and dimensions are expressed across the store. Product weights are always stored in grams internally — this unit governs display only."
      actions={
        <button
          type="button"
          onClick={() => save(['units'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Weight"
            description="Applies wherever a product weight is shown. Grams suit light apparel; kilograms suit heavier cartons and bundles."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdSelect
                label="Weight unit"
                value={units.weight || 'g'}
                onChange={(v) => setUnit('weight', v)}
                options={[
                  { value: 'g', label: 'Grams (g)' },
                  { value: 'kg', label: 'Kilograms (kg)' },
                ]}
                hint={weightPreview}
              />
            </div>
          </EdSection>
          <EdSection
            index={2}
            title="Dimensions"
            description="Used for packaging and shipping measurements."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdSelect
                label="Dimension unit"
                value={units.dimension || 'cm'}
                onChange={(v) => setUnit('dimension', v)}
                options={[
                  { value: 'cm', label: 'Centimetres (cm)' },
                  { value: 'in', label: 'Inches (in)' },
                ]}
                hint={dimPreview}
              />
            </div>
          </EdSection>
          <EdNotice>
            Weights entered on the product form are stored in grams (weightGrams).
            Changing the unit never converts stored values — it only changes how they read.
          </EdNotice>
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * DOMAIN — /admin/settings/domain
 * ======================================================================== */
export function SettingsDomain() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Domain">
        <PageHeader title="Domain" description="The primary domain of the storefront." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

  const domain = s?.domain || {};
  const setDomain = (k, v) => setS({ ...s, domain: { ...domain, [k]: v } });
  const primary = String(domain.primary || '').trim();
  const looksValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(primary);

  return (
    <Shell
      title="Domain"
      description="Your storefront address. The store currently serves from hushae1.vercel.app; a custom domain is recorded here and applied to SEO once it is connected."
      actions={
        <button
          type="button"
          onClick={() => save(['domain'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Primary domain"
            description="The address customers should see and that search engines should index."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdText
                label="Primary domain"
                value={primary}
                onChange={(v) => setDomain('primary', v)}
                placeholder="www.hushae.pk"
                hint="Leave empty to keep hushae1.vercel.app as the public address."
              />
            </div>
            <div className="mt-6 max-w-2xl">
              <EdToggle
                label="Use for SEO (canonical + sitemap)"
                description="Emit this domain in robots.txt, sitemap.xml and canonical links. Switch on only after the domain is connected and resolving."
                checked={!!domain.useForSeo}
                onChange={(v) => setDomain('useForSeo', v)}
                disabled={!primary || !looksValid}
              />
              {primary && !looksValid && (
                <p className="mt-2 text-[12px] text-[#777777]">
                  Enter a bare domain such as www.hushae.pk — no protocol, no path.
                </p>
              )}
            </div>
          </EdSection>
          <EdSection
            index={2}
            title="Connect a custom domain"
            description="The domain is attached in the Vercel dashboard; this editor records it and applies it to SEO. Three steps:"
          >
            <ol className="grid gap-3 text-[13px] leading-relaxed text-[#555555]">
              <li className="border border-[#EAEAEA] px-4 py-3">
                <span className="adm-index mr-3">A</span>
                Vercel dashboard → project <span className="text-black">hushae</span> → Settings → Domains → add your domain.
              </li>
              <li className="border border-[#EAEAEA] px-4 py-3">
                <span className="adm-index mr-3">B</span>
                At your DNS provider: <span className="text-black">www → CNAME cname.vercel-dns.com</span>, apex → <span className="text-black">A 76.76.21.21</span>.
              </li>
              <li className="border border-[#EAEAEA] px-4 py-3">
                <span className="adm-index mr-3">C</span>
                Once Vercel shows the domain valid and the site resolves, switch on “Use for SEO” above and save.
              </li>
            </ol>
          </EdSection>
          <EdNotice>
            Until “Use for SEO” is on, search output keeps the live request host — an
            unconnected domain can never silently break indexing.
          </EdNotice>
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * LANGUAGES — /admin/settings/languages
 * ======================================================================== */
export function SettingsLanguages() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Languages">
        <PageHeader title="Languages" description="Storefront language and future availability." />
        <TableSkeleton rows={5} />
      </AdminLayout>
    );
  }

  const languages = s?.languages || {};
  const LANG_ROWS = [
    { code: 'en', name: 'English', note: 'Default — active across the storefront and admin console', active: true },
    { code: 'ur', name: 'Urdu', note: 'Reserved — translation set ships in a later pass', active: false },
    { code: 'ar', name: 'Arabic', note: 'Reserved — translation set ships in a later pass', active: false },
  ];

  return (
    <Shell
      title="Languages"
      description="The language of the storefront. HUSHAE ships English only today, per brand direction; this record is the single source of truth future translations will follow."
      actions={
        <button
          type="button"
          onClick={() => save(['languages'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          <EdSection
            index={1}
            title="Default language"
            description="Applied to the document language tag and to every future translated string."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <EdSelect
                label="Default"
                value={languages.default || 'en'}
                onChange={(v) => setS({ ...s, languages: { ...languages, default: v, enabled: [v] } })}
                options={[{ value: 'en', label: 'English' }]}
                hint="Additional languages become selectable here once their translation sets are installed."
              />
            </div>
          </EdSection>
          <EdSection
            index={2}
            title="Availability"
            description="What exists today, and what is reserved."
          >
            <div className="divide-y divide-[#F0F0F0] border border-[#EAEAEA]">
              {LANG_ROWS.map((l) => (
                <div key={l.code} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] text-black">{l.name} <span className="text-[#777777]">· {l.code.toUpperCase()}</span></p>
                    <p className="mt-0.5 text-[12px] text-[#777777]">{l.note}</p>
                  </div>
                  <MonoStatus label={l.active ? 'Active' : 'Reserved'} dim={!l.active} />
                </div>
              ))}
            </div>
          </EdSection>
          <EdNotice>
            The storefront is intentionally English-only today. Switching the default
            before a translation set exists would label pages incorrectly, so new
            languages unlock here only when their strings are installed.
          </EdNotice>
        </>
      )}
    </Shell>
  );
}

/* ==========================================================================
 * NOTIFICATIONS — /admin/settings/notifications
 * ======================================================================== */
export function SettingsNotifications() {
  const { s, setS, dirty, reset, save, busy, err } = useSettingsSlice();

  if (!s && !err) {
    return (
      <AdminLayout title="Notifications">
        <PageHeader title="Notifications" description="Which events reach the admin bell and Inbox." />
        <TableSkeleton rows={7} />
      </AdminLayout>
    );
  }

  const prefs = s?.notificationPrefs || {};
  const setPref = (k, v) => setS({ ...s, notificationPrefs: { ...prefs, [k]: v } });

  const GROUPS = [
    {
      index: 1,
      title: 'Orders',
      description: 'The order pipeline, payments, and escalations.',
      items: [
        { key: 'orderCreated', label: 'New order placed', desc: 'Every checkout that lands in the order desk' },
        { key: 'orderStatus', label: 'Order status changed', desc: 'Any stage transition along the fulfilment pipeline' },
        { key: 'payment', label: 'Payment events', desc: 'Verifications, captures, failures and refunds' },
        { key: 'issueRaised', label: 'Order issues', desc: 'Returns, cancellations and flagged orders' },
      ],
    },
    {
      index: 2,
      title: 'Inventory & operations',
      description: 'Stock health and back-office runs.',
      items: [
        { key: 'stockLow', label: 'Low stock', desc: 'A variant crossing 5 units downward' },
        { key: 'printDone', label: 'Document printed', desc: 'Invoices and shipping documents generated' },
        { key: 'bulkDone', label: 'Bulk operation finished', desc: 'Bulk stage changes and bulk exports completing' },
      ],
    },
    {
      index: 3,
      title: 'Storefront activity',
      description: 'What customers leave behind.',
      items: [
        { key: 'reviewNew', label: 'New review', desc: 'A customer publishes a product review' },
        { key: 'questionNew', label: 'New question', desc: 'A customer asks a product question' },
      ],
    },
  ];

  return (
    <Shell
      title="Notifications"
      description="Choose which events appear in the admin bell and the Inbox. Disabled events are dropped before they are ever recorded."
      actions={
        <button
          type="button"
          onClick={() => save(['notificationPrefs'])}
          disabled={busy || !dirty}
          className="adm-btn solid"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
      err={err}
    >
      {s && (
        <>
          {GROUPS.map((g) => (
            <EdSection key={g.title} index={g.index} title={g.title} description={g.description}>
              <div>
                {g.items.map((it) => (
                  <EdToggle
                    key={it.key}
                    label={it.label}
                    description={it.desc}
                    checked={prefs[it.key] !== false}
                    onChange={(v) => setPref(it.key, v)}
                  />
                ))}
              </div>
            </EdSection>
          ))}
          <EdNotice>
            These switches control the admin bell and Inbox only. Email delivery is a
            separate channel — configure it under Settings → Email once SMTP
            credentials are in place. Changes apply within a minute.
          </EdNotice>
        </>
      )}
    </Shell>
  );
}
