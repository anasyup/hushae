import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import { REVIEW_DEFAULTS } from '../lib/reviewsConfig';
import {
  PageHeader, EdSection, EdSaveBar, EdToggle, EdText, EdNum,
  TableSkeleton, EditorialError,
} from './settings/chrome';

export default function SettingsReviews() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings')
      .then((d) => {
        const next = { ...d.settings, reviews: { ...REVIEW_DEFAULTS, ...(d.settings.reviews || {}) } };
        setS(next); setOriginal(JSON.stringify(next));
      })
      .catch(() => { setErr('Could not load settings'); toast('Could not load settings'); });
    api('/reviews/admin/stats', { token: auth?.token }).then(setStats).catch(() => {});
  }, []); // eslint-disable-line

  if (!s && !err) {
    return <AdminLayout title="Reviews"><PageHeader title="Reviews" description="Who can review and what shoppers see." /><TableSkeleton rows={8} /></AdminLayout>;
  }
  if (err || !s) {
    return (
      <AdminLayout title="Reviews">
        <PageHeader title="Reviews" description="Who can review and what shoppers see." />
        <EditorialError title="Unable to load settings" description={err} onRetry={() => window.location.reload()} />
      </AdminLayout>
    );
  }

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
      <PageHeader
        title="Reviews"
        description="Who can review, what they must include, and what shoppers see on the product page."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Reviews' }]}
      />

      {stats && (
        <section className="mb-10">
          <p className="adm-index">00 — Snapshot</p>
          <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] sm:grid-cols-3 lg:grid-cols-5">
            {[
              ['Average', stats.avg || '—'],
              ['Approved', stats.totalApproved || 0],
              ['Awaiting you', stats.status?.pending || 0],
              ['Last 30 days', stats.last30Days || 0],
              ['Reported', stats.reported || 0],
            ].map(([k, v]) => (
              <div key={k} className="px-5 py-6">
                <p className="adm-label">{k}</p>
                <p className="adm-metric mt-3 text-[26px] text-white">{v}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <EdSection index={1} title="General">
        <EdToggle label="Enable reviews" checked={r.enabled} onChange={(v) => set('enabled', v)} />
        <EdToggle label="Show star ratings on product cards" checked={r.showRatings} onChange={(v) => set('showRatings', v)} disabled={!r.enabled} />
        <EdToggle label="Let customers share a review" checked={r.allowSharing} onChange={(v) => set('allowSharing', v)} disabled={!r.enabled} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdText label="Section heading" value={r.title} onChange={(v) => set('title', v)} />
          <EdText label="Text when there are no reviews" value={r.emptyText} onChange={(v) => set('emptyText', v)} />
        </div>
      </EdSection>

      <EdSection index={2} title="Who can write" description="Verified-only means the writer must give an order number and phone that match a real purchase.">
        <EdToggle label="Require a verified purchase" description="Recommended — it is what makes the badge mean something." checked={r.verifiedRequired} onChange={(v) => set('verifiedRequired', v)} disabled={!r.enabled} />
        <EdToggle label="Allow reviews without an account" checked={r.allowGuest} onChange={(v) => set('allowGuest', v)} disabled={!r.enabled || r.verifiedRequired} />
        {r.verifiedRequired && <p className="mt-3 text-[12px] text-[#AAAAAA]">While verified-only is on, the guest setting has no effect.</p>}
      </EdSection>

      <EdSection index={3} title="Moderation">
        <EdToggle label="Publish reviews automatically" description="Off means you read every review before it appears." checked={r.autoApprove} onChange={(v) => set('autoApprove', v)} disabled={!r.enabled} />
        <EdToggle label="Let customers edit their review" checked={r.allowEdit} onChange={(v) => set('allowEdit', v)} disabled={!r.enabled} />
        <EdToggle label="Let customers report a review" checked={r.allowReport} onChange={(v) => set('allowReport', v)} disabled={!r.enabled} />
        <EdToggle label="Let customers mark a review helpful" checked={r.allowHelpful} onChange={(v) => set('allowHelpful', v)} disabled={!r.enabled} />
        <EdToggle label="Allow your replies under reviews" checked={r.allowMerchantReply} onChange={(v) => set('allowMerchantReply', v)} disabled={!r.enabled} />
        <div className="mt-4">
          <EdNum label="Editing allowed for (hours after posting)" value={r.editWindowHours} onChange={(v) => set('editWindowHours', v)} min="1" max="720" hint="An edited review goes back into moderation." />
        </div>
      </EdSection>

      <EdSection index={4} title="What a review must contain">
        <div className="grid gap-4 md:grid-cols-3">
          <EdNum label="Minimum characters" value={r.minLength} onChange={(v) => set('minLength', v)} min="0" max="500" />
          <EdNum label="Maximum characters" value={r.maxLength} onChange={(v) => set('maxLength', v)} min="100" max="5000" />
          <EdNum label="Lowest allowed rating" value={r.minRating} onChange={(v) => set('minRating', v)} min="1" max="5" />
        </div>
        <div className="mt-4">
          <EdToggle label="Require a headline" checked={r.requireTitle} onChange={(v) => set('requireTitle', v)} disabled={!r.enabled} />
        </div>
      </EdSection>

      <EdSection index={5} title="Photos & videos">
        <EdToggle label="Allow photos" checked={r.enablePhotos} onChange={(v) => set('enablePhotos', v)} disabled={!r.enabled} />
        <EdToggle label="Show the customer photo strip" checked={r.showMediaGallery} onChange={(v) => set('showMediaGallery', v)} disabled={!r.enabled || !r.enablePhotos} />
        <EdToggle label="Allow videos" description="Off by default: each video is stored in the same database as your catalogue." checked={r.enableVideos} onChange={(v) => set('enableVideos', v)} disabled={!r.enabled} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <EdNum label="Maximum photos per review" value={r.maxPhotos} onChange={(v) => set('maxPhotos', v)} min="1" max="10" />
          <EdNum label="Largest photo (MB)" value={r.photoMaxMb} onChange={(v) => set('photoMaxMb', v)} min="1" max="10" />
        </div>
      </EdSection>

      <EdSection index={6} title="How reviews are shown">
        <EdToggle label="Show the star breakdown graph" checked={r.showDistribution} onChange={(v) => set('showDistribution', v)} disabled={!r.enabled} />
        <EdToggle label="Show featured reviews first" checked={r.showFeatured} onChange={(v) => set('showFeatured', v)} disabled={!r.enabled} />
        <div className="mt-4">
          <EdNum label="Reviews per page" value={r.perPage} onChange={(v) => set('perPage', v)} min="3" max="30" hint="Fewer per page loads faster on a phone." />
        </div>
      </EdSection>

      <EdSection index={7} title="Questions & answers">
        <EdToggle label="Enable questions on product pages" checked={r.enableQA} onChange={(v) => set('enableQA', v)} />
        <EdToggle label="Publish questions automatically" checked={r.qaAutoApprove} onChange={(v) => set('qaAutoApprove', v)} disabled={!r.enableQA} />
        <EdToggle label="Allow questions without an account" checked={r.qaAllowGuest} onChange={(v) => set('qaAllowGuest', v)} disabled={!r.enableQA} />
        <div className="mt-4 grid gap-4">
          <EdText label="Questions heading" value={r.qaTitle} onChange={(v) => set('qaTitle', v)} />
          <EdText label="Text when there are no questions" value={r.qaEmptyText} onChange={(v) => set('qaEmptyText', v)} />
        </div>
      </EdSection>

      <EdSection index={8} title="Notifications">
        <EdToggle label="Email me about new reviews" checked={r.notifyOnNewReview} onChange={(v) => set('notifyOnNewReview', v)} />
        <EdToggle label="Email me about new questions" checked={r.notifyOnNewQuestion} onChange={(v) => set('notifyOnNewQuestion', v)} />
        <p className="mt-3 text-[12px] text-[#AAAAAA]">These need an email service connected in Settings → Apps. Until then nothing is sent.</p>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setS(JSON.parse(original))} />
    </AdminLayout>
  );
}
