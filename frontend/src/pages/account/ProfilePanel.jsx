import { useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Trash2, User as UserIcon } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import FloatField from '../checkout/FloatField';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Profile + avatar.
 *
 * The avatar is read in the browser and posted as base64 to a customer-scoped
 * endpoint (the shared /uploads route is admin-only). It is stored as an
 * /api/uploads/:id reference, never inline on the user document — otherwise
 * every /me response would carry the whole image.
 *
 * Email is deliberately read-only: changing it would orphan order history and
 * bypass verification. That is a support action, not a self-serve one.
 * ========================================================================== */
export default function ProfilePanel({ cfg, user, onUpdated }) {
  const { auth, toast } = useApp();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [avBusy, setAvBusy] = useState(false);
  const [avErr, setAvErr] = useState('');
  const fileRef = useRef(null);

  const dirty = name !== (user.name || '') || phone !== (user.phone || '');

  const save = async (e) => {
    e.preventDefault();
    setErrs({}); setSavedMsg(''); setBusy(true);
    try {
      const d = await api('/customer/profile', { method: 'PUT', token: auth.token, body: { name, phone } });
      onUpdated(d.user);
      setSavedMsg('Your details have been saved.');
    } catch (ex) {
      if (ex?.raw?.field) setErrs({ [ex.raw.field]: ex.message });
      else toast(ex.message || 'Could not save');
    }
    setBusy(false);
  };

  const pickAvatar = async (file) => {
    if (!file) return;
    setAvErr('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvErr('Please choose a JPG, PNG or WebP image'); return;
    }
    if (file.size > 2 * 1024 * 1024) { setAvErr('Please choose an image under 2 MB'); return; }

    setAvBusy(true);
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const d = await api('/customer/avatar', { method: 'POST', token: auth.token, body: { mime: file.type, dataBase64 } });
      onUpdated(d.user);
      toast('Photo updated');
    } catch (ex) { setAvErr(ex.message || 'Upload failed'); }
    setAvBusy(false);
  };

  const removeAvatar = async () => {
    setAvBusy(true); setAvErr('');
    try {
      const d = await api('/customer/avatar', { method: 'DELETE', token: auth.token });
      onUpdated(d.user);
      toast('Photo removed');
    } catch (ex) { setAvErr(ex.message || 'Could not remove'); }
    setAvBusy(false);
  };

  const initials = (user.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
      {cfg.avatarEnabled && (
        <section className="card-content" aria-labelledby="sec-photo">
          <h2 id="sec-photo" className="text-label uppercase tracking-widest text-ash">Profile photo</h2>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {user.avatar ? (
              <img
                src={user.avatar} alt=""
                className="h-20 w-20 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-cream font-display text-h5 text-graphite"
              >
                {initials}
              </span>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={(e) => { pickAvatar(e.target.files?.[0]); e.target.value = ''; }}
                id="avatar-input"
              />
              <label
                htmlFor="avatar-input"
                className="btn btn-sm cursor-pointer gap-2 border border-stone bg-white text-graphite hover:bg-satin/60"
              >
                {avBusy ? <Spinner label="Uploading" /> : <Camera size={14} aria-hidden="true" />}
                {user.avatar ? 'Change photo' : 'Add photo'}
              </label>
              {user.avatar && (
                <button
                  type="button" onClick={removeAvatar} disabled={avBusy}
                  className="btn btn-sm gap-2 border border-stone bg-white text-ash hover:text-obsidian disabled:opacity-40"
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-caption text-ash">JPG, PNG or WebP · up to 2 MB</p>
          {avErr && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-caption text-red-700">
              <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{avErr}
            </p>
          )}
        </section>
      )}

      <section className="card-content" aria-labelledby="sec-details">
        <h2 id="sec-details" className="text-label uppercase tracking-widest text-ash">Your details</h2>
        <form onSubmit={save} className="mt-4 space-y-4" noValidate>
          <FloatField
            label="Full name" autoComplete="name" required
            value={name} onChange={setName} error={errs.name}
          />
          <FloatField
            label="Mobile number" autoComplete="tel" inputMode="tel" required={cfg.phoneRequired}
            value={phone} onChange={setPhone} error={errs.phone}
          />
          <div>
            <FloatField label="Email" value={user.email} onChange={() => {}} disabled autoComplete="email" />
            <p className="mt-1.5 flex items-center gap-1.5 text-caption text-ash">
              {user.emailVerified
                ? <><CheckCircle2 size={12} className="shrink-0 text-sagedark" aria-hidden="true" /> Confirmed</>
                : 'To change your email, please contact us.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || !dirty} className="btn-primary gap-2 disabled:opacity-40">
              {busy ? <><Spinner label="Saving" /> Saving…</> : <><UserIcon size={14} aria-hidden="true" /> Save changes</>}
            </button>
            {savedMsg && (
              <p role="status" className="flex items-center gap-1.5 text-caption font-medium text-sagedark">
                <CheckCircle2 size={13} aria-hidden="true" /> {savedMsg}
              </p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
