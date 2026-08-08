import { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApp } from '../../store/AppContext';
import FloatField from '../../pages/checkout/FloatField';
import { StarInput } from './Stars';
import Spinner from '../ui/Spinner';

/* ============================================================================
 * Write a review.
 *
 * This store is verified-only by the merchant's choice, so the order number
 * and phone are required and the copy says why up front — asking for them at
 * the end, after someone has written 200 words, is how you lose the review.
 *
 * A real dialog: role, aria-modal, labelled, focus in, trapped, Escape closes,
 * focus returns. Photos are read in the browser and posted as base64 to the
 * customer avatar-style endpoint; the merchant's photo cap and size limit are
 * enforced here and again on the server.
 * ========================================================================== */
export default function ReviewForm({ product, cfg, onClose, onPosted }) {
  const { auth, toast } = useApp();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [name, setName] = useState(auth?.user?.name || '');
  const [email, setEmail] = useState(auth?.user?.email || '');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState(auth?.user?.phone || '');
  const [photos, setPhotos] = useState([]);      // { url } after upload
  const [uploading, setUploading] = useState(false);
  const [errs, setErrs] = useState({});
  const [topErr, setTopErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const panelRef = useRef(null);
  const opener = useRef(null);
  const titleId = useId();

  useEffect(() => {
    opener.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button:not([disabled]),input,select,textarea,a[href]');
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('input')?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [busy, onClose]);

  const addPhotos = async (files) => {
    const room = (cfg.maxPhotos || 5) - photos.length;
    if (room <= 0) { setErrs((e) => ({ ...e, photos: `Up to ${cfg.maxPhotos} photos` })); return; }
    setUploading(true); setErrs((e) => ({ ...e, photos: '' }));
    for (const file of Array.from(files).slice(0, room)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrs((e) => ({ ...e, photos: 'JPG, PNG or WebP only' })); continue;
      }
      if (file.size > (cfg.photoMaxMb || 2) * 1024 * 1024) {
        setErrs((e) => ({ ...e, photos: `Each photo must be under ${cfg.photoMaxMb} MB` })); continue;
      }
      try {
        const dataBase64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result).split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const up = await api('/reviews/photo', { method: 'POST', body: { mime: file.type, dataBase64 } });
        setPhotos((p) => [...p, { url: up.url }]);
      } catch (ex) { setErrs((e) => ({ ...e, photos: ex.message || 'Upload failed' })); }
    }
    setUploading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTopErr(''); setErrs({});
    const e2 = {};
    if (!rating) e2.rating = 'Please choose a rating';
    if (body.trim().length < (cfg.minLength || 20)) e2.body = `Please write at least ${cfg.minLength} characters`;
    if (name.trim().length < 2) e2.name = 'Please enter your name';
    if (cfg.requireTitle && !title.trim()) e2.title = 'Please add a headline';
    if (cfg.verifiedRequired) {
      if (!orderNumber.trim()) e2.orderNumber = 'Enter the order number from your confirmation';
      if (!phone.trim()) e2.phone = 'Enter the mobile number you ordered with';
    }
    setErrs(e2);
    if (Object.keys(e2).length) {
      requestAnimationFrame(() => panelRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setBusy(true);
    try {
      const r = await api('/reviews', {
        method: 'POST',
        token: auth?.token,
        body: {
          productId: product._id, rating, title: title.trim(), body: body.trim(),
          customerName: name.trim(), customerEmail: email.trim(),
          images: photos, orderNumber: orderNumber.trim(), phone: phone.trim(),
        },
      });
      setDone(r.message || 'Thank you for your review.');
      toast('Review submitted');
      setTimeout(onPosted, 1800);
    } catch (ex) {
      if (ex?.raw?.field) {
        setErrs({ [ex.raw.field]: ex.message });
        requestAnimationFrame(() => panelRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      } else setTopErr(ex.message || 'Could not post your review');
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-obsidian/60 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6" onClick={() => !busy && onClose()}>
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-panel bg-alabaster shadow-e-4 sm:rounded-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-h5">Write a review</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian disabled:opacity-40">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {done ? (
          <div role="status" className="px-5 py-10 text-center">
            <CheckCircle2 size={34} className="mx-auto text-sagedeep" aria-hidden="true" />
            <p className="mt-3 text-body font-medium text-sagedark">{done}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-5 py-5" noValidate>
            <p className="text-body-sm text-ash">
              Reviewing <span className="font-medium text-ink">{product.name}</span>
            </p>

            {cfg.verifiedRequired && (
              <p className="mt-3 rounded-control border border-line bg-cream/50 px-3.5 py-2.5 text-caption leading-relaxed text-ash">
                Reviews are open to buyers only — enter the order number and mobile you ordered with, and your review carries a verified badge.
              </p>
            )}

            {topErr && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 text-body-sm text-red-800">
                <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{topErr}
              </p>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <StarInput value={rating} onChange={(v) => { setRating(v); setErrs((x) => ({ ...x, rating: '' })); }} error={errs.rating} />
                {errs.rating && <p role="alert" className="mt-1 text-caption text-red-700">{errs.rating}</p>}
              </div>

              <FloatField label="Headline" required={cfg.requireTitle} value={title} onChange={setTitle} error={errs.title} />

              <div>
                <FloatField
                  as="textarea" label="Your review" required value={body}
                  onChange={(v) => { setBody(v); setErrs((x) => ({ ...x, body: '' })); }}
                  error={errs.body}
                  hint={!errs.body ? `${body.trim().length} / ${cfg.minLength} characters minimum` : ''}
                />
              </div>

              {cfg.enablePhotos && (
                <div>
                  <p className="text-body-sm font-medium">Photos <span className="font-normal text-ash">(optional)</span></p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <span key={i} className="relative">
                        <img src={p.url} alt="" className="h-16 w-16 rounded-control border border-line object-cover" />
                        <button
                          type="button" onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
                          aria-label={`Remove photo ${i + 1}`}
                          className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-obsidian text-alabaster"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                    {photos.length < (cfg.maxPhotos || 5) && (
                      <>
                        <input
                          id="rv-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                          onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }}
                        />
                        <label htmlFor="rv-photos" className="grid h-16 w-16 cursor-pointer place-items-center rounded-control border border-dashed border-bronze text-ash transition hover:border-obsidian hover:text-obsidian">
                          {uploading ? <Spinner label="Uploading" /> : <ImagePlus size={18} aria-hidden="true" />}
                        </label>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-caption text-ash">Up to {cfg.maxPhotos} photos, {cfg.photoMaxMb} MB each</p>
                  {errs.photos && <p role="alert" className="mt-1 text-caption text-red-700">{errs.photos}</p>}
                </div>
              )}

              <FloatField label="Your name" required autoComplete="name" value={name} onChange={setName} error={errs.name} />
              <FloatField label="Email (optional)" type="email" autoComplete="email" value={email} onChange={setEmail} hint="Only so we can reply if needed — never shown." />

              {cfg.verifiedRequired && (
                <>
                  <FloatField
                    label="Order number" required value={orderNumber}
                    onChange={(v) => { setOrderNumber(v.toUpperCase()); setErrs((x) => ({ ...x, orderNumber: '' })); }}
                    error={errs.orderNumber} hint={!errs.orderNumber ? 'On your confirmation, e.g. HS-20260730-A1B2C3' : ''}
                  />
                  <FloatField
                    label="Mobile used on the order" required autoComplete="tel" inputMode="tel"
                    value={phone} onChange={(v) => { setPhone(v); setErrs((x) => ({ ...x, phone: '' })); }}
                    error={errs.phone}
                  />
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
                {busy ? <><Spinner label="Posting" /> Posting…</> : 'Post review'}
              </button>
              <button type="button" onClick={onClose} disabled={busy} className="btn border border-bronze bg-white text-graphite hover:bg-satin/60">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
