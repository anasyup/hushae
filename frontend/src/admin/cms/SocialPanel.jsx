import { useMemo } from 'react';
import { Facebook, Share2 } from 'lucide-react';
import { Accordion, Select, Text } from '../ui/Controls';
import MediaPicker from '../../components/MediaPicker';

/* ============================================================================
 * SOCIAL SHARING PANEL — OpenGraph + Twitter cards
 *
 * WHY THE PREVIEW MATTERS MORE THAN THE FIELDS
 *   In Pakistan the link is pasted into WhatsApp far more often than Twitter.
 *   WhatsApp reads the same OpenGraph tags Facebook does, so the preview below
 *   is drawn as a WhatsApp/Facebook card — the thing the merchant will actually
 *   see when they test it on their own phone.
 *
 * FALLBACK CHAIN, mirrored from the server's resolveSeo():
 *   ogTitle       -> seo.title -> page title
 *   ogDescription -> seo.description -> excerpt -> store default
 *   ogImage       -> settings.cms.seo.defaultOgImage -> store image
 * Resolved at READ time on the server, never copied on save, so a merchant who
 * edits the search title does not have to remember to edit the share title too.
 * This panel shows what WILL be used, greyed, rather than pre-filling the box —
 * pre-filling would freeze today's title into the document forever.
 *
 * NO NEW UPLOADER. components/MediaPicker.jsx already does compress-then-store
 * with a Cloudinary fallback; a second uploader here would be the sixth Toggle
 * all over again.
 * ========================================================================== */

const CARD_TYPES = [
  { value: 'summary_large_image', label: 'Big picture (recommended)' },
  { value: 'summary', label: 'Small square picture' },
];

const OG_TYPES = [
  { value: 'website', label: 'Page' },
  { value: 'article', label: 'Article or blog post' },
  { value: 'product', label: 'Product' },
];

/* 1200x630 is the size Facebook, WhatsApp and LinkedIn all crop to. Anything
   much smaller is upscaled and looks blurry in a chat window. */
const IDEAL_W = 1200;
const IDEAL_H = 630;

export default function SocialPanel({ page, cfg, onChangeSeo }) {
  const seo = page.seo || {};

  const resolved = useMemo(() => ({
    title: seo.ogTitle || seo.title || page.title || '',
    description: seo.ogDescription || seo.description || page.excerpt || cfg.seo?.defaultDescription || '',
    image: seo.ogImage || cfg.seo?.defaultOgImage || '',
  }), [seo, page.title, page.excerpt, cfg]);

  const usingFallbackTitle = !seo.ogTitle;
  const usingFallbackDesc = !seo.ogDescription;
  const usingFallbackImage = !seo.ogImage;

  return (
    <Accordion
      variant="editorial"
      title="Sharing"
      subtitle="The picture and words people see when your link is pasted"
      badge={!resolved.image ? (
        <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">No picture</span>
      ) : null}
    >
      <div className="space-y-4">
        {/* ---- the card preview ---- */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 adm-label">
            <Share2 size={12} aria-hidden="true" /> How the link will look
          </p>
          <div className="overflow-hidden border border-white/10">
            {resolved.image ? (
              <img
                src={resolved.image}
                alt=""
                className="aspect-[1200/630] w-full bg-white/5 object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="grid aspect-[1200/630] w-full place-items-center bg-white/5 px-4 text-center">
                <p className="text-[12px] leading-relaxed text-white/35">
                  No picture yet. WhatsApp will show a plain grey box with just the words.
                </p>
              </div>
            )}
            <div className="border-t border-white/10 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/30">hushae.pk</p>
              <p className="mt-0.5 truncate text-[13px] text-white">
                {resolved.title || 'Your page name'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/40">
                {resolved.description || 'Add a summary and it will appear here.'}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-white/35">
            WhatsApp, Facebook and LinkedIn all read the same information, so this one card covers all three.
          </p>
        </div>

        {/* ---- image ---- */}
        <div>
          <p className="adm-label mb-1.5 block">Sharing picture</p>
          <MediaPicker
            value={seo.ogImage || ''}
            onChange={(v) => onChangeSeo('ogImage', v)}
            buttonText="Upload sharing picture"
          />
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/35">
            Best size {IDEAL_W}×{IDEAL_H}. A tall or square photo gets its top and bottom cut off in chat.
            {usingFallbackImage && cfg.seo?.defaultOgImage && ' Leave blank to use your shop-wide sharing picture.'}
          </p>
        </div>

        {/* ---- title / description overrides ---- */}
        <div>
          <Text
            variant="editorial"
            label="Sharing title"
            value={seo.ogTitle}
            onChange={(v) => onChangeSeo('ogTitle', v.slice(0, 200))}
            placeholder={resolved.title}
            hint={usingFallbackTitle
              ? `Blank, so it will use "${resolved.title || 'the page name'}".`
              : 'Overriding the search title. Clear this box to go back to using it.'}
          />
        </div>

        <div>
          <label className="adm-label mb-1.5 block" htmlFor="og-desc">Sharing description</label>
          <textarea
            id="og-desc" rows={2}
            value={seo.ogDescription || ''}
            onChange={(e) => onChangeSeo('ogDescription', e.target.value.slice(0, 320))}
            aria-describedby="og-desc-h"
            className="h-auto min-h-[56px] w-full resize-y rounded-[4px] border border-white/20 bg-[#0A0A0A] px-3 py-2 text-[12px] text-white/85 outline-none placeholder:text-white/30 hover:border-white/40 focus:border-white/50"
            placeholder={resolved.description}
          />
          <p id="og-desc-h" className="mt-1.5 text-[12px] leading-relaxed text-white/35">
            {usingFallbackDesc
              ? 'Blank, so it will use the search description.'
              : 'Overriding the search description. Clear this box to go back to using it.'}
          </p>
        </div>

        {/* ---- types ---- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            variant="editorial"
            label="What kind of thing is this"
            value={seo.ogType || 'website'}
            onChange={(v) => onChangeSeo('ogType', v)}
            options={OG_TYPES}
            hint="Leave as Page unless it is genuinely an article."
          />
          <Select
            variant="editorial"
            label="Twitter card shape"
            value={seo.twitterCard || 'summary_large_image'}
            onChange={(v) => onChangeSeo('twitterCard', v)}
            options={CARD_TYPES}
            hint="Only affects Twitter/X."
          />
        </div>

        {!cfg.seo?.twitterHandle && (
          <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-white/40">
            <Facebook size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            Your shop has no Twitter/X handle saved, so cards will not credit an account. That is set once
            for the whole shop, not per page.
          </p>
        )}
      </div>
    </Accordion>
  );
}
