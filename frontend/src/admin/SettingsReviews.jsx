import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Save, Star } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { REVIEW_DEFAULTS } from '../lib/reviewsConfig';

/* ============================================================================
 * ADMIN → SETTINGS → REVIEWS
 * Writes exactly one top-level field: `reviews`.
 * ========================================================================== */

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">{title}</p>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-55' : 'cursor-pointer hover:border-neutral-300'}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900">{label}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">{description}</p>}
      </div>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-1 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

const Num = ({ label, hint, value, onChange, ...rest }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
    {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
  </div>
);

const Text = ({ label, hint, value, onChange, ...rest }) => (
  <div>
    <label className="label">{label}</label>
    <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
  </div>
);

export default function SettingsReviews() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, reviews: { ...REVIEW_DEFAULTS, ...(d.settings.reviews || {}) } };
        setS(next); setOriginal(JSON.stringify(next));
      })
      .catch(() => toast('Could not load settings'));
    api('/reviews/admin/stats', { token: auth?.token }).then(setStats).catch(() => {});
  }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Reviews"><div className="skeleton h-96 w-full" /></AdminLayout>;

  const r = s.reviews;
  const set = (k, v) => setS({ ...s, reviews: { ...r, [k]: v } });
  const dirty = original && JSON.stringify(s) !== original;

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { reviews: r } });
      setOriginal(JSON.stringify(s));
      toast('Review settings saved');
    } catch (ex) { toast(ex.message || 'Save failed'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Reviews">
      <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
        <ArrowLeft size={13} /> Settings
      </Link>

      <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
          <Star size={20} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-sans text-2xl leading-tight text-neutral-900">Reviews & Questions</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">
            Who can review, what they must include, and what shoppers see on the product page.
          </p>
        </div>
      </div>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ['Average', stats.avg || '—'],
            ['Approved', stats.totalApproved || 0],
            ['Awaiting you', stats.status?.pending || 0],
            ['Last 30 days', stats.last30Days || 0],
            ['Reported', stats.reported || 0],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">{k}</p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5">
        <Section title="General">
          <div className="space-y-3">
            <Toggle label="Enable reviews" checked={r.enabled} onChange={(v) => set('enabled', v)} />
            <Toggle label="Show star ratings on product cards" checked={r.showRatings} onChange={(v) => set('showRatings', v)} disabled={!r.enabled} />
            <Toggle label="Let customers share a review" checked={r.allowSharing} onChange={(v) => set('allowSharing', v)} disabled={!r.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Text label="Section heading" value={r.title} onChange={(v) => set('title', v)} />
            <Text label="Text when there are no reviews" value={r.emptyText} onChange={(v) => set('emptyText', v)} />
          </div>
        </Section>

        <Section title="Who can write" description="Verified-only means the writer must give an order number and phone that match a real purchase of that piece.">
          <div className="space-y-3">
            <Toggle label="Require a verified purchase" description="Strongly recommended — it is what makes the badge mean something." checked={r.verifiedRequired} onChange={(v) => set('verifiedRequired', v)} disabled={!r.enabled} />
            <Toggle label="Allow reviews without an account" checked={r.allowGuest} onChange={(v) => set('allowGuest', v)} disabled={!r.enabled || r.verifiedRequired} />
          </div>
          {r.verifiedRequired && (
            <p className="mt-3 text-[11px] text-neutral-500">
              While verified-only is on, the guest setting has no effect — every reviewer must prove a purchase.
            </p>
          )}
        </Section>

        <Section title="Moderation">
          <div className="space-y-3">
            <Toggle label="Publish reviews automatically" description="Off means you read every review before it appears. Safer for a new store." checked={r.autoApprove} onChange={(v) => set('autoApprove', v)} disabled={!r.enabled} />
            <Toggle label="Let customers edit their review" checked={r.allowEdit} onChange={(v) => set('allowEdit', v)} disabled={!r.enabled} />
            <Toggle label="Let customers report a review" checked={r.allowReport} onChange={(v) => set('allowReport', v)} disabled={!r.enabled} />
            <Toggle label="Let customers mark a review helpful" checked={r.allowHelpful} onChange={(v) => set('allowHelpful', v)} disabled={!r.enabled} />
            <Toggle label="Allow your replies under reviews" checked={r.allowMerchantReply} onChange={(v) => set('allowMerchantReply', v)} disabled={!r.enabled} />
          </div>
          <div className="mt-4">
            <Num label="Editing allowed for (hours after posting)" value={r.editWindowHours} onChange={(v) => set('editWindowHours', v)} min="1" max="720" hint="An edited review goes back into moderation." />
          </div>
        </Section>

        <Section title="What a review must contain">
          <div className="grid gap-4 md:grid-cols-3">
            <Num label="Minimum characters" value={r.minLength} onChange={(v) => set('minLength', v)} min="0" max="500" />
            <Num label="Maximum characters" value={r.maxLength} onChange={(v) => set('maxLength', v)} min="100" max="5000" />
            <Num label="Lowest allowed rating" value={r.minRating} onChange={(v) => set('minRating', v)} min="1" max="5" />
          </div>
          <div className="mt-4">
            <Toggle label="Require a headline" checked={r.requireTitle} onChange={(v) => set('requireTitle', v)} disabled={!r.enabled} />
          </div>
        </Section>

        <Section title="Photos & videos" description="Customer media lives in your database. Photos are small; videos are not.">
          <div className="space-y-3">
            <Toggle label="Allow photos" checked={r.enablePhotos} onChange={(v) => set('enablePhotos', v)} disabled={!r.enabled} />
            <Toggle label="Show the customer photo strip" checked={r.showMediaGallery} onChange={(v) => set('showMediaGallery', v)} disabled={!r.enabled || !r.enablePhotos} />
            <Toggle label="Allow videos" description="Off by default: each video is stored in the same database as your catalogue and slows the product page for everyone." checked={r.enableVideos} onChange={(v) => set('enableVideos', v)} disabled={!r.enabled} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Num label="Maximum photos per review" value={r.maxPhotos} onChange={(v) => set('maxPhotos', v)} min="1" max="10" />
            <Num label="Largest photo (MB)" value={r.photoMaxMb} onChange={(v) => set('photoMaxMb', v)} min="1" max="10" />
          </div>
        </Section>

        <Section title="How reviews are shown">
          <div className="space-y-3">
            <Toggle label="Show the star breakdown graph" checked={r.showDistribution} onChange={(v) => set('showDistribution', v)} disabled={!r.enabled} />
            <Toggle label="Show featured reviews first" checked={r.showFeatured} onChange={(v) => set('showFeatured', v)} disabled={!r.enabled} />
          </div>
          <div className="mt-4">
            <Num label="Reviews per page" value={r.perPage} onChange={(v) => set('perPage', v)} min="3" max="30" hint="Fewer per page loads faster on a phone." />
          </div>
        </Section>

        <Section title="Questions & answers">
          <div className="space-y-3">
            <Toggle label="Enable questions on product pages" checked={r.enableQA} onChange={(v) => set('enableQA', v)} />
            <Toggle label="Publish questions automatically" checked={r.qaAutoApprove} onChange={(v) => set('qaAutoApprove', v)} disabled={!r.enableQA} />
            <Toggle label="Allow questions without an account" checked={r.qaAllowGuest} onChange={(v) => set('qaAllowGuest', v)} disabled={!r.enableQA} />
          </div>
          <div className="mt-4 grid gap-4">
            <Text label="Questions heading" value={r.qaTitle} onChange={(v) => set('qaTitle', v)} />
            <Text label="Text when there are no questions" value={r.qaEmptyText} onChange={(v) => set('qaEmptyText', v)} />
          </div>
        </Section>

        <Section title="Notifications">
          <div className="space-y-3">
            <Toggle label="Email me about new reviews" checked={r.notifyOnNewReview} onChange={(v) => set('notifyOnNewReview', v)} />
            <Toggle label="Email me about new questions" checked={r.notifyOnNewQuestion} onChange={(v) => set('notifyOnNewQuestion', v)} />
          </div>
          <p className="mt-3 text-[11px] text-neutral-500">
            These need an email service connected in Settings → Apps & Integrations. Until then nothing is sent.
          </p>
        </Section>
      </div>

      {dirty && (
        <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
          <p className="text-[13px] font-medium">Unsaved changes</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setS(JSON.parse(original))} className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">Discard</button>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
              <Save size={13} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
