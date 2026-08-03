import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUp, ArrowDown, HelpCircle, LayoutTemplate, Megaphone, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import MediaPicker from '../components/MediaPicker';

const MQ_FALLBACK = ['COD available — nationwide', 'Free shipping over PKR 4,999', '14-day easy exchange', 'Discreet packaging — always', 'Made in Pakistan', '3-tier quality system'];

export default function Content() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Content"><div className="skeleton h-64 w-full" /></AdminLayout>;

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

  // FAQ state
  const faq = s.faq || { enabled: true, heading: 'Frequently Asked Questions', subheading: '', items: [] };
  const setFaq = (k, v) => setS({ ...s, faq: { ...faq, [k]: v } });
  const setFaqItem = (i, k, v) => setFaq('items', (faq.items || []).map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addFaqItem = () => setFaq('items', [...(faq.items || []), { question: '', answer: '' }]);
  const delFaqItem = (i) => setFaq('items', (faq.items || []).filter((_, j) => j !== i));
  const moveFaq = (i, dir) => {
    const arr = [...(faq.items || [])];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setFaq('items', arr);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: {
        hero: s.hero, offerBar: s.offerBar, cookiePopup: s.cookiePopup,
        signatureSplit: s.signatureSplit,
        marquee: { ...marquee, items: (marquee.items || []).map((x) => String(x).trim()).filter(Boolean) },
        promoPopup: { ...promo, delaySec: Math.max(5, Number(promo.delaySec) || 18), couponCode: (promo.couponCode || '').trim().toUpperCase() },
        faq: { ...faq, items: (faq.items || []).map((it) => ({ question: String(it.question || '').trim(), answer: String(it.answer || '').trim() })).filter((it) => it.question && it.answer) },
      } });
      toast('Content saved — now live on the website');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Content">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* HERO — organized in sub-sections */}
          <div className="card p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-obsidian text-alabaster"><LayoutTemplate size={20} /></span>
              <div>
                <h2 className="font-sans text-lg">Homepage Hero (Banner)</h2>
                <p className="mt-0.5 text-xs text-ash">The full-screen banner every visitor sees first. Video or image — both supported.</p>
              </div>
            </div>

            {/* TEXT CONTENT */}
            <div className="mb-6 rounded-2xl border border-line bg-alabaster/40 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-sagedeep">Text Content</p>
              <div className="space-y-3">
                <div><label className="label">Small tagline (above title)</label><input className="input" value={hero.eyebrow || ''} onChange={(e) => setHero('eyebrow', e.target.value)} placeholder="Premium innerwear · Made in Pakistan" /></div>
                <div><label className="label">Main title</label><textarea className="input min-h-16" value={hero.title || ''} onChange={(e) => setHero('title', e.target.value)} placeholder={'Second Skin,\nFirst Choice.'} /><p className="mt-1 text-[11px] text-ash">Press Enter for a new line</p></div>
                <div><label className="label">Subtitle</label><textarea className="input min-h-20" value={hero.subtitle || ''} onChange={(e) => setHero('subtitle', e.target.value)} placeholder="A short description shown below the title" /></div>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="mb-6 rounded-2xl border border-line bg-alabaster/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Call-to-Action Buttons</p>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={hero.showButtons !== false} onChange={(e) => setHero('showButtons', e.target.checked)} />
                  <span className="h-6 w-11 rounded-full bg-satin transition peer-checked:bg-obsidian after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                </label>
              </div>

              {hero.showButtons === false ? (
                <p className="rounded-xl bg-white/60 p-3 text-center text-xs text-ash">Buttons are hidden. Toggle on to show them.</p>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="label">Button style</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setHero('ctaStyle', 'buttons')}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${hero.ctaStyle !== 'dropdown' ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line bg-white hover:bg-satin/50'}`}>
                        <span className="block font-semibold">Two Buttons</span>
                        <span className={`mt-0.5 block text-[10px] ${hero.ctaStyle !== 'dropdown' ? 'text-alabaster/70' : 'text-ash'}`}>Women + Men (classic)</span>
                      </button>
                      <button type="button" onClick={() => setHero('ctaStyle', 'dropdown')}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${hero.ctaStyle === 'dropdown' ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line bg-white hover:bg-satin/50'}`}>
                        <span className="block font-semibold">Dropdown Menu</span>
                        <span className={`mt-0.5 block text-[10px] ${hero.ctaStyle === 'dropdown' ? 'text-alabaster/70' : 'text-ash'}`}>One Shop button with menu</span>
                      </button>
                    </div>
                  </div>

                  {hero.ctaStyle === 'dropdown' ? (
                    <>
                      <div><label className="label">Button text</label><input className="input" value={hero.ctaWomen || ''} onChange={(e) => setHero('ctaWomen', e.target.value)} placeholder="Shop Now" /></div>
                      <div className="mt-3">
                        <label className="label">Dropdown menu items</label>
                        <p className="mt-1 text-[11px] text-ash">One item per line — format: <code className="rounded bg-satin px-1">Label | /link</code></p>
                        <textarea className="input mt-2 min-h-32 font-mono text-[12px]"
                          value={(hero.shopMenu || []).map((it) => `${it.label || ''} | ${it.href || ''}`).join('\n')}
                          onChange={(e) => {
                            const items = e.target.value.split('\n').map((line) => {
                              const [label, href] = line.split('|').map((x) => (x || '').trim());
                              return { label: label || '', href: href || '/shop' };
                            }).filter((it) => it.label);
                            setHero('shopMenu', items);
                          }}
                          placeholder={'New Arrivals | /new\nWomen | /women\nMen | /men\nSale | /sale'} />
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="label">Button 1 label (Women)</label><input className="input" value={hero.ctaWomen || ''} onChange={(e) => setHero('ctaWomen', e.target.value)} placeholder="Shop Women" /></div>
                      <div><label className="label">Button 2 label (Men)</label><input className="input" value={hero.ctaMen || ''} onChange={(e) => setHero('ctaMen', e.target.value)} placeholder="Shop Men" /></div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* MEDIA */}
            <div className="mb-6 rounded-2xl border border-line bg-alabaster/40 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-sagedeep">Background Media</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Banner image</label>
                  <MediaPicker value={hero.image || ''} onChange={(v) => setHero('image', v)} accept="image" hideUrl />
                  <p className="mt-1 text-[11px] text-ash">Recommended: 1920 × 1080 (16:9). Upload a high-quality JPG or WebP.</p>
                </div>
                <div>
                  <label className="label">Banner video (optional)</label>
                  <MediaPicker value={hero.video || ''} onChange={(v) => setHero('video', v)} accept="video" buttonText="Upload video" hideUrl />
                  <p className="mt-1 text-[11px] text-ash">If a video is uploaded, it replaces the image. Autoplays silently and loops. MP4 or WebM.</p>
                </div>
              </div>
            </div>

            {/* STYLING */}
            <div className="rounded-2xl border border-line bg-alabaster/40 p-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-sagedeep">Appearance</p>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="label !mb-0">Dark overlay</label>
                    <span className="rounded-full bg-obsidian px-2 py-0.5 text-[10px] font-bold text-alabaster">{hero.overlayOpacity ?? 40}%</span>
                  </div>
                  <input type="range" min="0" max="90" step="5"
                    value={hero.overlayOpacity ?? 40}
                    onChange={(e) => setHero('overlayOpacity', Number(e.target.value))}
                    className="w-full accent-obsidian" />
                  <p className="mt-1 text-[11px] text-ash">Adds a dark gradient over the image so text stays readable. Higher = darker.</p>
                </div>

                <div>
                  <label className="label">Text position</label>
                  <select className="input" value={hero.align || 'left'} onChange={(e) => setHero('align', e.target.value)}>
                    <option value="left">Left aligned (bottom)</option>
                    <option value="center">Center aligned</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white/60 p-3 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-obsidian" checked={!!hero.fullScreen} onChange={(e) => setHero('fullScreen', e.target.checked)} />
                  <span>
                    <span className="block font-medium">Full-screen banner</span>
                    <span className="mt-0.5 block text-xs text-ash">Banner fills the entire viewport — premium international look</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* SIGNATURE SPLIT HERO — half/half Women + Men editorial block */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sans text-lg">Signature Split Hero (Women × Men)</h2>
                <p className="mt-1 text-xs text-ash">Half-half CK-style editorial block below the video hero. Change images, videos, text, colours, or turn the whole section off.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input type="checkbox" className="peer sr-only" checked={split.enabled !== false} onChange={(e) => setSplit('enabled', e.target.checked)} />
                <div className="relative h-6 w-11 rounded-full bg-satin transition peer-checked:bg-sage after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className={`mt-6 space-y-6 ${split.enabled === false ? 'pointer-events-none opacity-40' : ''}`}>
              {/* Text */}
              <div className="grid gap-3 md:grid-cols-2">
                <div><label className="label">Eyebrow (small caps)</label><input className="input" value={split.eyebrow || ''} onChange={(e) => setSplit('eyebrow', e.target.value)} placeholder="The Signature Edit" /></div>
                <div><label className="label">Title (Enter for new line)</label><textarea className="input min-h-16" value={split.title || ''} onChange={(e) => setSplit('title', e.target.value)} placeholder={'Premium,\nperfected.'} /></div>
                <div className="md:col-span-2"><label className="label">Subtitle</label><textarea className="input min-h-16" value={split.subtitle || ''} onChange={(e) => setSplit('subtitle', e.target.value)} /></div>
              </div>

              {/* Styling */}
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="label">Text colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line" value={split.textColor || '#F7F5F1'} onChange={(e) => setSplit('textColor', e.target.value)} />
                    <input className="input font-mono text-xs" value={split.textColor || '#F7F5F1'} onChange={(e) => setSplit('textColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Title font</label>
                  <select className="input" value={split.titleFont || 'display'} onChange={(e) => setSplit('titleFont', e.target.value)}>
                    <option value="display">Cormorant Garamond (serif)</option>
                    <option value="sans">Inter (sans-serif)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Text shadow</label>
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={split.textShadow !== false} onChange={(e) => setSplit('textShadow', e.target.checked)} />
                    Soft glow behind text
                  </label>
                </div>
                <div>
                  <label className="label">Overlay strength ({split.overlayOpacity ?? 25}%)</label>
                  <input type="range" min={0} max={80} value={split.overlayOpacity ?? 25} onChange={(e) => setSplit('overlayOpacity', Number(e.target.value))} className="w-full accent-obsidian" />
                </div>
              </div>

              {/* Left half */}
              <div className="rounded-2xl border border-line bg-cream/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Left half — Women</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">Image</label>
                    <MediaPicker value={split.leftImage || ''} onChange={(v) => setSplit('leftImage', v)} accept="image" hideUrl />
                  </div>
                  <div>
                    <label className="label">Video (optional — plays instead of image)</label>
                    <MediaPicker value={split.leftVideo || ''} onChange={(v) => setSplit('leftVideo', v)} accept="video" buttonText="Upload video" hideUrl />
                  </div>
                  <div><label className="label">CTA button label</label><input className="input" value={split.leftCtaLabel || ''} onChange={(e) => setSplit('leftCtaLabel', e.target.value)} placeholder="Shop Women" /></div>
                  <div><label className="label">CTA link</label><input className="input font-mono text-xs" value={split.leftCtaHref || ''} onChange={(e) => setSplit('leftCtaHref', e.target.value)} placeholder="/women" /></div>
                </div>
              </div>

              {/* Right half */}
              <div className="rounded-2xl border border-line bg-cream/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Right half — Men</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="label">Image</label>
                    <MediaPicker value={split.rightImage || ''} onChange={(v) => setSplit('rightImage', v)} accept="image" hideUrl />
                  </div>
                  <div>
                    <label className="label">Video (optional — plays instead of image)</label>
                    <MediaPicker value={split.rightVideo || ''} onChange={(v) => setSplit('rightVideo', v)} accept="video" buttonText="Upload video" hideUrl />
                  </div>
                  <div><label className="label">CTA button label</label><input className="input" value={split.rightCtaLabel || ''} onChange={(e) => setSplit('rightCtaLabel', e.target.value)} placeholder="Shop Men" /></div>
                  <div><label className="label">CTA link</label><input className="input font-mono text-xs" value={split.rightCtaHref || ''} onChange={(e) => setSplit('rightCtaHref', e.target.value)} placeholder="/men" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ANNOUNCEMENT */}
          <div className="card p-6">
            <h2 className="font-sans text-lg">Announcement Bar (top strip)</h2>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={!!offer.enabled} onChange={(e) => setOffer('enabled', e.target.checked)} /> Announcement bar enabled
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Message (English)</label><input className="input" value={offer.messageEn || ''} onChange={(e) => setOffer('messageEn', e.target.value)} /></div>
              <div><label className="label">Message (Urdu)</label><input className="input" dir="rtl" value={offer.messageUr || ''} onChange={(e) => setOffer('messageUr', e.target.value)} /></div>
              <div><label className="label">Button text (EN)</label><input className="input" value={offer.ctaEn || ''} onChange={(e) => setOffer('ctaEn', e.target.value)} /></div>
              <div><label className="label">Link</label><input className="input" placeholder="/sale" value={offer.link || ''} onChange={(e) => setOffer('link', e.target.value)} /></div>
            </div>
          </div>

          {/* MARQUEE */}
          <div className="card p-6">
            <h2 className="font-sans text-lg">Scrolling Marquee Strip</h2>
            <p className="mt-1 text-xs text-ash">A scrolling strip below the hero (like international fashion sites).</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={marquee.enabled !== false} onChange={(e) => setMq('enabled', e.target.checked)} /> Marquee enabled
            </label>
            <div className={`mt-4 ${marquee.enabled !== false ? '' : 'pointer-events-none opacity-40'}`}>
              <label className="label">Items — one per line</label>
              <textarea className="input min-h-28" value={(marquee.items || []).join('\n')}
                onChange={(e) => setMq('items', e.target.value.split('\n'))} placeholder={'COD available — nationwide\nFree shipping over PKR 4,999'} />
            </div>
          </div>

          {/* PROMO POPUP */}
          <div className="card p-6">
            <h2 className="font-sans text-lg">Newsletter Popup (coupon ke saath)</h2>
            <p className="mt-1 text-xs text-ash">Shown to visitors once after a short delay — captures their email in exchange for a coupon code.</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={promo.enabled !== false} onChange={(e) => setPromo('enabled', e.target.checked)} /> Popup enabled
            </label>
            <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${promo.enabled !== false ? '' : 'pointer-events-none opacity-40'}`}>
              <div><label className="label">Kitne second baad dikhe</label><input className="input" type="number" min="5" value={promo.delaySec} onChange={(e) => setPromo('delaySec', e.target.value)} /></div>
              <div><label className="label">Reward coupon code</label><input className="input uppercase" placeholder="WELCOME10" value={promo.couponCode || ''} onChange={(e) => setPromo('couponCode', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="label">Title</label><input className="input" placeholder="Join the HUSHAE inner circle" value={promo.title || ''} onChange={(e) => setPromo('title', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="label">Text</label><textarea className="input min-h-16" value={promo.text || ''} onChange={(e) => setPromo('text', e.target.value)} /></div>
            </div>
            <p className="mt-3 rounded-xl bg-satin/60 px-4 py-2.5 text-[11px] leading-relaxed text-ash">⚠️ Use a coupon code that already exists on your <b>Discounts page</b> — otherwise checkout will reject it.</p>
          </div>

          {/* COOKIES */}
          <div className="card p-6">
            <h2 className="font-sans text-lg">Cookie Consent Popup</h2>
            <p className="mt-1 text-xs text-ash">Shown once to new visitors — Accept / Refuse / Manage options included.</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-obsidian" checked={cookie.enabled !== false} onChange={(e) => setCookie('enabled', e.target.checked)} /> Cookie popup enabled
            </label>
            <div className={`mt-4 grid gap-4 ${cookie.enabled !== false ? '' : 'pointer-events-none opacity-40'}`}>
              <div><label className="label">Popup title</label><input className="input" value={cookie.title || ''} onChange={(e) => setCookie('title', e.target.value)} /></div>
              <div><label className="label">Popup text</label><textarea className="input min-h-20" value={cookie.text || ''} onChange={(e) => setCookie('text', e.target.value)} /></div>
            </div>
          </div>

          <button onClick={save} disabled={busy} className="btn-primary w-full lg:w-auto">{busy ? 'Saving…' : 'Save All Changes'}</button>
        </div>

        {/* Live preview */}
        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div className="card overflow-hidden">
            <p className="border-b border-line bg-satin/30 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ash">Live Preview</p>
            {offer.enabled && (
              <div className="flex items-center justify-center gap-2 bg-obsidian px-4 py-2 text-center text-[11px] text-alabaster">
                <Megaphone size={12} className="shrink-0 opacity-70" />
                <span>{offer.messageEn}</span>
                <span className="font-semibold underline underline-offset-2">{offer.ctaEn}</span>
              </div>
            )}
            {hero.fullScreen ? (
              <div className="relative h-72 overflow-hidden">
                {hero.video ? (
                  <video src={hero.video} poster={hero.image || undefined} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
                ) : hero.image ? (
                  <img src={hero.image} alt="hero" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?auto=format&fit=crop&w=1600&q=80)' }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
                <div className={`absolute inset-x-0 bottom-0 p-6 ${hero.align === 'center' ? 'text-center' : ''}`}>
                  <p className="whitespace-pre-line font-sans text-2xl leading-tight text-white">{hero.title}</p>
                  <p className={`mt-1.5 max-w-md text-[11px] leading-relaxed text-white/70 ${hero.align === 'center' ? 'mx-auto' : ''}`}>{hero.subtitle}</p>
                  <div className={`mt-3 flex gap-2 ${hero.align === 'center' ? 'justify-center' : ''}`}>
                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-black">{hero.ctaWomen}</span>
                    <span className="rounded-full border border-white/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white">{hero.ctaMen}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid items-center gap-5 p-6 sm:grid-cols-2">
                <div>
                  <p className="whitespace-pre-line font-sans text-2xl leading-tight">{hero.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-ash">{hero.subtitle}</p>
                  <div className="mt-4 flex gap-2">
                    <span className="btn-primary !px-3 !py-2 text-[11px]">{hero.ctaWomen} <ArrowRight size={11} /></span>
                    <span className="btn-outline !px-3 !py-2 text-[11px]">{hero.ctaMen}</span>
                  </div>
                </div>
                {hero.image
                  ? <img src={hero.image} alt="hero" className="h-44 w-full rounded-2xl object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  : <div className="flex h-44 items-center justify-center rounded-2xl bg-satin text-xs text-ash">Default hero image</div>}
              </div>
            )}
            {marquee.enabled !== false && (marquee.items || []).filter(Boolean).length > 0 && (
              <div className="overflow-hidden bg-obsidian py-2 text-alabaster">
                <p className="whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-widest opacity-90">
                  {(marquee.items || []).filter(Boolean).join('   ✦   ')}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-ash">Preview sirf andaaze  — changes apply to the live site immediately after saving.</p>
        </div>
      </div>

      {/* FAQ manager moved to its own dedicated page: /admin/faq */}
      <div className="mt-6 card p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700"><HelpCircle size={20} /></span>
          <div className="flex-1">
            <h2 className="font-sans text-lg">FAQ Page</h2>
            <p className="mt-0.5 text-xs text-ash">The FAQ editor now lives on its own page for a calmer, less crowded experience.</p>
          </div>
          <a href="/admin/faq" className="btn-outline text-xs">Manage FAQ →</a>
        </div>
      </div>
    </AdminLayout>
  );
}
