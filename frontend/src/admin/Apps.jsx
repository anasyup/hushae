import { useEffect, useState } from 'react';
import { Facebook, Instagram, MessageCircle, Music2 } from 'lucide-react';
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
  const setI = (patch) => setS({ ...s, integrations: { ...integ, ...patch } });
  const setWa = (k, v) => setI({ whatsapp: { ...wa, [k]: v } });
  const setSocial = (k, v) => setI({ social: { ...social, [k]: v } });

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { integrations: { whatsapp: wa, social } } });
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
      </div>
      <button onClick={save} disabled={busy} className="btn-primary mt-6 w-full lg:w-auto">{busy ? 'Saving…' : 'Save Changes'}</button>
    </AdminLayout>
  );
}
