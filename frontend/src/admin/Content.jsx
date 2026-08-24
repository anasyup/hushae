import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import MediaPicker from '../components/MediaPicker';
import { btnGhost, btnSolid, ctl, TableSkeleton } from './orders/orderUi';

const MQ_FALLBACK = ['COD available — nationwide', 'Free shipping over PKR 4,999', '14-day easy exchange', 'Discreet packaging — always', 'Made in Pakistan', '3-tier quality system'];

function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full ${checked ? 'bg-white' : 'bg-[#EFEFEF]'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${checked ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
    </button>
  );
}

export default function Content() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) {
    return (
      <AdminLayout title="Content">
        <PageHeader title="Content" description="Announcement, homepage and overlays." />
        <TableSkeleton rows={8} />
      </AdminLayout>
    );
  }

  const hero = s.hero || {};
  const split = s.signatureSplit || {};
  const setSplit = (k, v) => setS({ ...s, signatureSplit: { ...split, [k]: v } });
  const offer = s.offerBar || {};
  const cookie = s.cookiePopup || { enabled: true, title: '', text: '' };
  const marquee = s.marquee || { enabled: true, items: MQ_FALLBACK };
  const promo = s.promoPopup || { enabled: true, delaySec: 18, title: '', text: '', couponCode: '' };
  const setHero = (k, v) => setS({ ...s, hero: { ...hero, [k]: v } });
  const setOffer = (k, v) => setS({ ...s, offerBar: { ...offer, [k]: v } });
  const setCookie = (k, v) => setS({ ...s, cookiePopup: { ...cookie, [k]: v } });
  const setMq = (k, v) => setS({ ...s, marquee: { ...marquee, [k]: v } });
  const setPromo = (k, v) => setS({ ...s, promoPopup: { ...promo, [k]: v } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: {
        hero: s.hero, offerBar: s.offerBar, cookiePopup: s.cookiePopup,
        signatureSplit: s.signatureSplit,
        marquee: { ...marquee, items: (marquee.items || []).map((x) => String(x).trim()).filter(Boolean) },
        promoPopup: { ...promo, delaySec: Math.max(5, Number(promo.delaySec) || 18), couponCode: (promo.couponCode || '').trim().toUpperCase() },
      } });
      toast('Content saved — now live on the website');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  const ta = `${ctl} min-h-20 py-2`;

  return (
    <AdminLayout title="Content">
      <PageHeader
        title="Content"
        description="Announcement bar, homepage sections and overlays."
        actions={<button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save all'}</button>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Global content</p>
        <div className="space-y-8 border-y border-[#EAEAEA] py-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] text-black">Announcement bar</p>
              <Switch checked={!!offer.enabled} onChange={(v) => setOffer('enabled', v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="adm-label mb-1.5 block">Message (English)</label><input className={ctl} value={offer.messageEn || ''} onChange={(e) => setOffer('messageEn', e.target.value)} /></div>
              <div><label className="adm-label mb-1.5 block">Message (Urdu)</label><input className={ctl} dir="rtl" value={offer.messageUr || ''} onChange={(e) => setOffer('messageUr', e.target.value)} /></div>
              <div><label className="adm-label mb-1.5 block">Button text (EN)</label><input className={ctl} value={offer.ctaEn || ''} onChange={(e) => setOffer('ctaEn', e.target.value)} /></div>
              <div><label className="adm-label mb-1.5 block">Link</label><input className={ctl} placeholder="/sale" value={offer.link || ''} onChange={(e) => setOffer('link', e.target.value)} /></div>
            </div>
          </div>
          <div className="border-t border-[#EAEAEA] pt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-black">Scrolling marquee</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">A scrolling strip below the hero.</p>
              </div>
              <Switch checked={marquee.enabled !== false} onChange={(v) => setMq('enabled', v)} />
            </div>
            <div className={marquee.enabled !== false ? '' : 'pointer-events-none opacity-35'}>
              <label className="adm-label mb-1.5 block">Items — one per line</label>
              <textarea className={ta} value={(marquee.items || []).join('\n')} onChange={(e) => setMq('items', e.target.value.split('\n'))} placeholder={'COD available — nationwide\nFree shipping over PKR 4,999'} />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">02 — Homepage content</p>
        <div className="space-y-8 border-y border-[#EAEAEA] py-6">
          <p className="text-[13px] text-black">Hero banner</p>
          <div className="space-y-4">
            <div><label className="adm-label mb-1.5 block">Small tagline</label><input className={ctl} value={hero.eyebrow || ''} onChange={(e) => setHero('eyebrow', e.target.value)} placeholder="Premium innerwear · Made in Pakistan" /></div>
            <div><label className="adm-label mb-1.5 block">Main title</label><textarea className={ta} value={hero.title || ''} onChange={(e) => setHero('title', e.target.value)} placeholder={'Second Skin,\nFirst Choice.'} /><p className="mt-1 text-[11px] text-[#AAAAAA]">Press Enter for a new line</p></div>
            <div><label className="adm-label mb-1.5 block">Subtitle</label><textarea className={ta} value={hero.subtitle || ''} onChange={(e) => setHero('subtitle', e.target.value)} /></div>
          </div>

          <div className="flex items-center justify-between border-t border-[#EAEAEA] pt-6">
            <p className="text-[13px] text-black">Call-to-action buttons</p>
            <Switch checked={hero.showButtons !== false} onChange={(v) => setHero('showButtons', v)} />
          </div>
          {hero.showButtons === false ? (
            <p className="text-[12px] text-[#AAAAAA]">Buttons are hidden.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setHero('ctaStyle', 'buttons')} className={hero.ctaStyle !== 'dropdown' ? btnSolid : btnGhost}>Two buttons</button>
                <button type="button" onClick={() => setHero('ctaStyle', 'dropdown')} className={hero.ctaStyle === 'dropdown' ? btnSolid : btnGhost}>Dropdown</button>
              </div>
              {hero.ctaStyle === 'dropdown' ? (
                <>
                  <div><label className="adm-label mb-1.5 block">Button text</label><input className={ctl} value={hero.ctaWomen || ''} onChange={(e) => setHero('ctaWomen', e.target.value)} placeholder="Shop Now" /></div>
                  <div>
                    <label className="adm-label mb-1.5 block">Dropdown menu items</label>
                    <p className="mb-2 text-[11px] text-[#AAAAAA]">One item per line — format: Label | /link</p>
                    <textarea className={`${ta} min-h-32 font-mono`}
                      value={(hero.shopMenu || []).map((it) => `${it.label || ''} | ${it.href || ''}`).join('\n')}
                      onChange={(e) => {
                        const items = e.target.value.split('\n').map((line) => {
                          const [label, href] = line.split('|').map((x) => (x || '').trim());
                          return { label: label || '', href: href || '/shop' };
                        }).filter((it) => it.label);
                        setHero('shopMenu', items);
                      }}
                      placeholder={'New Arrivals | /new\nWomen | /women'} />
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="adm-label mb-1.5 block">Button 1 (Women)</label><input className={ctl} value={hero.ctaWomen || ''} onChange={(e) => setHero('ctaWomen', e.target.value)} placeholder="Shop Women" /></div>
                  <div><label className="adm-label mb-1.5 block">Button 2 (Men)</label><input className={ctl} value={hero.ctaMen || ''} onChange={(e) => setHero('ctaMen', e.target.value)} placeholder="Shop Men" /></div>
                </div>
              )}
            </>
          )}

          <div className="space-y-4 border-t border-[#EAEAEA] pt-6">
            <p className="adm-label">Background media</p>
            <div>
              <label className="adm-label mb-1.5 block">Banner image</label>
              <MediaPicker value={hero.image || ''} onChange={(v) => setHero('image', v)} accept="image" hideUrl />
              <p className="mt-1 text-[11px] text-[#AAAAAA]">Recommended: 1920 × 1080. JPG or WebP.</p>
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Banner video (optional)</label>
              <MediaPicker value={hero.video || ''} onChange={(v) => setHero('video', v)} accept="video" buttonText="Upload video" hideUrl />
              <p className="mt-1 text-[11px] text-[#AAAAAA]">If a video is uploaded, it replaces the image.</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="adm-label">Dark overlay</label>
                <span className="text-[11px] tabular-nums text-[#777777]">{hero.overlayOpacity ?? 40}%</span>
              </div>
              <input type="range" min="0" max="90" step="5" value={hero.overlayOpacity ?? 40} onChange={(e) => setHero('overlayOpacity', Number(e.target.value))} className="w-full accent-white" />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Text position</label>
              <select className={ctl} value={hero.align || 'left'} onChange={(e) => setHero('align', e.target.value)}>
                <option value="left">Left aligned (bottom)</option>
                <option value="center">Center aligned</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-white" checked={!!hero.fullScreen} onChange={(e) => setHero('fullScreen', e.target.checked)} />
              <span>
                <span className="block text-[13px] text-black">Full-screen banner</span>
                <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">Banner fills the entire viewport</span>
              </span>
            </label>
          </div>

          <div className="border-t border-[#EAEAEA] pt-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-black">Signature split (Women × Men)</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Half-half editorial block below the hero.</p>
              </div>
              <Switch checked={split.enabled !== false} onChange={(v) => setSplit('enabled', v)} />
            </div>
            <div className={`space-y-4 ${split.enabled === false ? 'pointer-events-none opacity-35' : ''}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="adm-label mb-1.5 block">Eyebrow</label><input className={ctl} value={split.eyebrow || ''} onChange={(e) => setSplit('eyebrow', e.target.value)} /></div>
                <div><label className="adm-label mb-1.5 block">Title</label><textarea className={ta} value={split.title || ''} onChange={(e) => setSplit('title', e.target.value)} /></div>
                <div className="md:col-span-2"><label className="adm-label mb-1.5 block">Subtitle</label><textarea className={ta} value={split.subtitle || ''} onChange={(e) => setSplit('subtitle', e.target.value)} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="adm-label mb-1.5 block">Text colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-8 w-10 cursor-pointer border border-[#DCDCDC] bg-transparent" value={split.textColor || '#FFFFFF'} onChange={(e) => setSplit('textColor', e.target.value)} />
                    <input className={`${ctl} font-mono`} value={split.textColor || '#FFFFFF'} onChange={(e) => setSplit('textColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="adm-label mb-1.5 block">Title font</label>
                  <select className={ctl} value={split.titleFont || 'display'} onChange={(e) => setSplit('titleFont', e.target.value)}>
                    <option value="display">Helvetica Neue (CK)</option>
                    <option value="sans">Inter (sans-serif)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-[#555555]">
                  <input type="checkbox" className="h-4 w-4 accent-white" checked={split.textShadow !== false} onChange={(e) => setSplit('textShadow', e.target.checked)} />
                  Soft glow
                </label>
                <div>
                  <label className="adm-label mb-1.5 block">Overlay ({split.overlayOpacity ?? 25}%)</label>
                  <input type="range" min={0} max={80} value={split.overlayOpacity ?? 25} onChange={(e) => setSplit('overlayOpacity', Number(e.target.value))} className="w-full accent-white" />
                </div>
              </div>
              <p className="adm-label">Left — Women</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="adm-label mb-1.5 block">Image</label><MediaPicker value={split.leftImage || ''} onChange={(v) => setSplit('leftImage', v)} accept="image" hideUrl /></div>
                <div><label className="adm-label mb-1.5 block">Video (optional)</label><MediaPicker value={split.leftVideo || ''} onChange={(v) => setSplit('leftVideo', v)} accept="video" buttonText="Upload video" hideUrl /></div>
                <div><label className="adm-label mb-1.5 block">CTA label</label><input className={ctl} value={split.leftCtaLabel || ''} onChange={(e) => setSplit('leftCtaLabel', e.target.value)} /></div>
                <div><label className="adm-label mb-1.5 block">CTA link</label><input className={`${ctl} font-mono`} value={split.leftCtaHref || ''} onChange={(e) => setSplit('leftCtaHref', e.target.value)} /></div>
              </div>
              <p className="adm-label">Right — Men</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="adm-label mb-1.5 block">Image</label><MediaPicker value={split.rightImage || ''} onChange={(v) => setSplit('rightImage', v)} accept="image" hideUrl /></div>
                <div><label className="adm-label mb-1.5 block">Video (optional)</label><MediaPicker value={split.rightVideo || ''} onChange={(v) => setSplit('rightVideo', v)} accept="video" buttonText="Upload video" hideUrl /></div>
                <div><label className="adm-label mb-1.5 block">CTA label</label><input className={ctl} value={split.rightCtaLabel || ''} onChange={(e) => setSplit('rightCtaLabel', e.target.value)} /></div>
                <div><label className="adm-label mb-1.5 block">CTA link</label><input className={`${ctl} font-mono`} value={split.rightCtaHref || ''} onChange={(e) => setSplit('rightCtaHref', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <p className="adm-index">03 — Other content</p>
        <div className="space-y-8 border-y border-[#EAEAEA] py-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-black">Newsletter popup</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Shown once after a delay — email for a coupon.</p>
              </div>
              <Switch checked={promo.enabled !== false} onChange={(v) => setPromo('enabled', v)} />
            </div>
            <div className={`grid gap-4 sm:grid-cols-2 ${promo.enabled !== false ? '' : 'pointer-events-none opacity-35'}`}>
              <div><label className="adm-label mb-1.5 block">Seconds before show</label><input className={ctl} type="number" min="5" value={promo.delaySec} onChange={(e) => setPromo('delaySec', e.target.value)} /></div>
              <div><label className="adm-label mb-1.5 block">Reward coupon</label><input className={`${ctl} uppercase`} placeholder="WELCOME10" value={promo.couponCode || ''} onChange={(e) => setPromo('couponCode', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="adm-label mb-1.5 block">Title</label><input className={ctl} value={promo.title || ''} onChange={(e) => setPromo('title', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="adm-label mb-1.5 block">Text</label><textarea className={ta} value={promo.text || ''} onChange={(e) => setPromo('text', e.target.value)} /></div>
            </div>
            <p className="mt-3 text-[12px] text-[#AAAAAA]">Use a coupon code that already exists on Discounts — otherwise checkout will reject it.</p>
          </div>
          <div className="border-t border-[#EAEAEA] pt-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-black">Cookie consent</p>
                <p className="mt-0.5 text-[12px] text-[#AAAAAA]">Shown once to new visitors.</p>
              </div>
              <Switch checked={cookie.enabled !== false} onChange={(v) => setCookie('enabled', v)} />
            </div>
            <div className={`space-y-4 ${cookie.enabled !== false ? '' : 'pointer-events-none opacity-35'}`}>
              <div><label className="adm-label mb-1.5 block">Popup title</label><input className={ctl} value={cookie.title || ''} onChange={(e) => setCookie('title', e.target.value)} /></div>
              <div><label className="adm-label mb-1.5 block">Popup text</label><textarea className={ta} value={cookie.text || ''} onChange={(e) => setCookie('text', e.target.value)} /></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="adm-index">04 — FAQ</p>
        <Link to="/admin/faq" className="flex items-center justify-between border-y border-[#EAEAEA] py-5 adm-row-hover">
          <span>
            <span className="block text-[13px] text-black">FAQ page</span>
            <span className="mt-0.5 block text-[12px] text-[#AAAAAA]">The FAQ editor lives on its own page.</span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">Open →</span>
        </Link>
      </section>
    </AdminLayout>
  );
}
