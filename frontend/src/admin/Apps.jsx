import { useEffect, useState } from 'react';
import { Facebook, HardDrive, Instagram, MessageCircle, Music2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

const DEFAULTS = {
  whatsapp: { enabled: false, number: '', message: 'Hi! I have a question about VÉLOURA.' },
  social: { instagram: '', facebook: '', tiktok: '' },
};

export default function Apps() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/settings').then((d) => setS(d.settings)).catch(() => toast('Could not load settings')); }, []); // eslint-disable-line

  if (!s) return <AdminLayout title="Apps"><div className="skeleton h-64 w-full" /></AdminLayout>;

  const integ = s.integrations || {};
  const wa = { ...DEFAULTS.whatsapp, ...(integ.whatsapp || {}) };
  const social = { ...DEFAULTS.social, ...(integ.social || {}) };
  const media = s.media || { cloudName: '', uploadPreset: '' };
  const setI = (patch) => setS({ ...s, integrations: { ...integ, ...patch } });
  const setWa = (k, v) => setI({ whatsapp: { ...wa, [k]: v } });
  const setSocial = (k, v) => setI({ social: { ...social, [k]: v } });
  const setMedia = (k, v) => setS({ ...s, media: { ...media, [k]: v } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: {
        integrations: { whatsapp: wa, social },
        media: { cloudName: media.cloudName.trim(), uploadPreset: media.uploadPreset.trim() },
      } });
      toast('Apps saved — website par foran apply ho gaya');
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  return (
    <AdminLayout title="Apps & Integrations">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white"><MessageCircle size={20} /></span>
              <div>
                <h2 className="font-display text-lg">WhatsApp Chat Button</h2>
                <p className="text-xs text-ash">Website par floating green button — customers seedha aapko WhatsApp karein ge.</p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={!!wa.enabled} onChange={(e) => setWa('enabled', e.target.checked)} />
              <span className="h-6 w-11 rounded-full bg-satin transition peer-checked:bg-obsidian after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </div>
          <div className={`mt-5 space-y-4 ${wa.enabled ? '' : 'pointer-events-none opacity-40'}`}>
            <div>
              <label className="label">WhatsApp number (country code ke saath)</label>
              <input className="input" placeholder="923001234567" value={wa.number} onChange={(e) => setWa('number', e.target.value)} />
              <p className="mt-1 text-[11px] text-ash">Misal: 0300 1234567 → 923001234567 (shuru ka 0 hata kar 92 lagayen)</p>
            </div>
            <div>
              <label className="label">Default message (customer ka pehla message)</label>
              <input className="input" value={wa.message} onChange={(e) => setWa('message', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg">Social Links</h2>
          <p className="mt-1 text-xs text-ash">Ye links footer mein icons ki soorat show honge. Khali chhoren to icon nahi dikhega.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label flex items-center gap-1.5"><Instagram size={13} /> Instagram URL</label>
              <input className="input" placeholder="https://instagram.com/veloura.pk" value={social.instagram} onChange={(e) => setSocial('instagram', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Facebook size={13} /> Facebook URL</label>
              <input className="input" placeholder="https://facebook.com/veloura.pk" value={social.facebook} onChange={(e) => setSocial('facebook', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><Music2 size={13} /> TikTok URL</label>
              <input className="input" placeholder="https://tiktok.com/@veloura.pk" value={social.tiktok} onChange={(e) => setSocial('tiktok', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-obsidian text-alabaster"><HardDrive size={20} /></span>
            <div>
              <h2 className="font-display text-lg">Media Library — PC se Image & Video Upload</h2>
              <p className="mt-0.5 text-xs text-ash">Ye connect karne ke baad Products, Hero banner aur baqi jagah PC se direct file upload ho jayegi (Shopify jaisa).</p>
            </div>
            {media.cloudName && media.uploadPreset && <span className="ml-auto rounded-full bg-sage/25 px-3 py-1 text-[11px] font-semibold text-sagedeep">Connected</span>}
          </div>
          <ol className="mt-4 list-decimal space-y-1.5 rounded-2xl border border-line bg-satin/30 p-4 pl-9 text-xs leading-relaxed text-ash">
            <li><b className="text-obsidian">cloudinary.com</b> par free account banayein (email + password — bilkul free)</li>
            <li>Dashboard par milegi <b className="text-obsidian">Cloud Name</b> — copy karein</li>
            <li>⚙️ Settings → <b className="text-obsidian">Upload</b> → Upload presets → <b className="text-obsidian">Add upload preset</b></li>
            <li><b className="text-obsidian">Signing Mode: Unsigned</b> select karein → Save — preset ka naam copy karein</li>
            <li>Dono cheezein neeche paste kar ke Save karein — bas!</li>
          </ol>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cloud Name</label>
              <input className="input" placeholder="e.g. dxyz123ab" value={media.cloudName} onChange={(e) => setMedia('cloudName', e.target.value)} />
            </div>
            <div>
              <label className="label">Upload Preset</label>
              <input className="input" placeholder="e.g. veloura_uploads" value={media.uploadPreset} onChange={(e) => setMedia('uploadPreset', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      <button onClick={save} disabled={busy} className="btn-primary mt-6 w-full lg:w-auto">{busy ? 'Saving…' : 'Save Changes'}</button>
    </AdminLayout>
  );
}
