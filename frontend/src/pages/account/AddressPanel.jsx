import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, MapPin, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import FloatField, { FloatSelect } from '../checkout/FloatField';
import Spinner from '../../components/ui/Spinner';

const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir', 'Islamabad (ICT)'];
const EMPTY = { label: 'Home', name: '', phone: '', address: '', city: '', province: 'Punjab', postalCode: '' };

/* ============================================================================
 * Address book.
 *
 * The old account page had a single address form that overwrote
 * `addresses[0]` on every profile save — so editing your name could wipe the
 * address, and a second address was impossible even though the schema stored
 * an array.
 *
 * Each address now has its own request (add / edit / delete / make default),
 * so a failure in one cannot corrupt the rest of the book. The server settles
 * which one is default; this component never assumes.
 * ========================================================================== */
export default function AddressPanel({ cfg, user, onUpdated }) {
  const { auth, toast } = useApp();
  const list = user.addresses || [];
  const [editing, setEditing] = useState(null);   // null | 'new' | address id
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);
  const [cities, setCities] = useState([]);
  const formRef = useRef(null);

  const atLimit = list.length >= (cfg.maxAddresses || 5);

  useEffect(() => {
    if (!editing || !f.province) return undefined;
    let alive = true;
    api(`/locations/${encodeURIComponent(f.province)}/cities`)
      .then((r) => { if (alive) setCities(r?.cities || []); })
      .catch(() => { if (alive) setCities([]); });
    return () => { alive = false; };
  }, [editing, f.province]);

  const openNew = () => {
    setF({ ...EMPTY, name: user.name || '', phone: user.phone || '' });
    setErrs({}); setFormErr(''); setEditing('new');
    requestAnimationFrame(() => formRef.current?.querySelector('input')?.focus());
  };

  const openEdit = (a) => {
    setF({
      label: a.label || 'Home', name: a.name || '', phone: a.phone || '',
      address: a.address || '', city: a.city || '', province: a.province || 'Punjab',
      postalCode: a.postalCode || '',
    });
    setErrs({}); setFormErr(''); setEditing(a._id);
    requestAnimationFrame(() => formRef.current?.querySelector('input')?.focus());
  };

  const close = () => { setEditing(null); setErrs({}); setFormErr(''); };

  const save = async (e) => {
    e.preventDefault();
    const e2 = {};
    if (f.address.trim().length < 6) e2.address = 'Enter the full street address';
    if (!f.city.trim()) e2.city = 'Choose your city';
    if (f.postalCode && !/^\d{5}$/.test(f.postalCode)) e2.postalCode = 'Postal code must be 5 digits';
    setErrs(e2);
    if (Object.keys(e2).length) {
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setBusy(true); setFormErr('');
    try {
      const d = editing === 'new'
        ? await api('/customer/addresses', { method: 'POST', token: auth.token, body: f })
        : await api(`/customer/addresses/${editing}`, { method: 'PUT', token: auth.token, body: f });
      onUpdated(d.user);
      toast(editing === 'new' ? 'Address added' : 'Address updated');
      close();
    } catch (ex) { setFormErr(ex.message || 'Could not save this address'); }
    setBusy(false);
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      const d = await api(`/customer/addresses/${id}`, { method: 'DELETE', token: auth.token });
      onUpdated(d.user);
      toast('Address removed');
      setConfirmDel(null);
    } catch (ex) { toast(ex.message || 'Could not remove'); }
    setBusy(false);
  };

  const makeDefault = async (id) => {
    setBusy(true);
    try {
      const d = await api(`/customer/addresses/${id}/default`, { method: 'POST', token: auth.token });
      onUpdated(d.user);
      toast('Default address updated');
    } catch (ex) { toast(ex.message || 'Could not update'); }
    setBusy(false);
  };

  return (
    <section className="card-content" aria-labelledby="sec-addr">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sec-addr" className="text-label uppercase tracking-widest text-ash">
          Saved addresses ({list.length}/{cfg.maxAddresses || 5})
        </h2>
        {!editing && !atLimit && (
          <button type="button" onClick={openNew} className="btn btn-sm gap-1.5 border border-stone bg-white text-graphite hover:bg-satin/60">
            <Plus size={14} aria-hidden="true" /> Add address
          </button>
        )}
      </div>

      <p className="sr-only" role="status">{list.length} saved addresses</p>

      {/* ---- list ---- */}
      {list.length === 0 && !editing && (
        <div className="mt-5 rounded-card border border-dashed border-line py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cream text-ash" aria-hidden="true">
            <MapPin size={20} strokeWidth={1.6} />
          </span>
          <p className="mt-3 text-body-sm font-medium">No addresses saved yet</p>
          <p className="mt-1 text-caption text-ash">Save one now and checkout will fill itself in next time.</p>
          <button type="button" onClick={openNew} className="btn-primary mt-5 gap-1.5">
            <Plus size={14} aria-hidden="true" /> Add your first address
          </button>
        </div>
      )}

      {list.length > 0 && (
        <ul className="mt-5 space-y-3">
          {list.map((a) => (
            <li key={a._id} className={`rounded-card border p-4 ${a.isDefault ? 'border-obsidian/40 bg-obsidian/[0.025]' : 'border-line'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-body-sm font-semibold">
                    {a.label || 'Address'}
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sage/25 px-2 py-0.5 text-caption font-semibold text-sagedark">
                        <Star size={9} fill="currentColor" aria-hidden="true" /> Default
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-body-sm">{a.address}</p>
                  <p className="text-caption text-ash">
                    {[a.city, a.province, a.postalCode].filter(Boolean).join(', ')}
                  </p>
                  {(a.name || a.phone) && (
                    <p className="mt-1 text-caption text-ash">{[a.name, a.phone].filter(Boolean).join(' · ')}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-1">
                  {!a.isDefault && (
                    <button
                      type="button" onClick={() => makeDefault(a._id)} disabled={busy}
                      className="min-h-[44px] rounded-full px-3 text-caption font-semibold text-ash underline-offset-4 transition hover:text-obsidian hover:underline disabled:opacity-40"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button" onClick={() => openEdit(a)}
                    aria-label={`Edit ${a.label || 'address'}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button" onClick={() => setConfirmDel(a._id)}
                    aria-label={`Remove ${a.label || 'address'}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {confirmDel === a._id && (
                <div role="alertdialog" aria-label="Confirm removing this address" className="mt-3 rounded-control border border-red-200 bg-red-50 p-3">
                  <p className="text-caption text-red-800">Remove this address?</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => remove(a._id)} disabled={busy} className="btn btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                      {busy ? <Spinner label="Removing" /> : 'Yes, remove'}
                    </button>
                    <button type="button" onClick={() => setConfirmDel(null)} className="btn btn-sm border border-stone bg-white text-graphite">
                      Keep it
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {atLimit && !editing && (
        <p className="mt-3 text-caption text-ash">
          You have reached the {cfg.maxAddresses} address limit. Remove one to add another.
        </p>
      )}

      {/* ---- form ---- */}
      {editing && (
        <form ref={formRef} onSubmit={save} className="mt-5 rounded-card border border-line bg-cream/30 p-4" noValidate>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-label uppercase tracking-widest text-ash">
              {editing === 'new' ? 'New address' : 'Edit address'}
            </h3>
            <button
              type="button" onClick={close} aria-label="Cancel"
              className="grid h-11 w-11 place-items-center rounded-full text-ash transition hover:bg-satin/60 hover:text-obsidian"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {formErr && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-3 py-2.5 text-caption text-red-800">
              <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />{formErr}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FloatField label="Label (Home, Office…)" value={f.label} onChange={(v) => setF({ ...f, label: v })} />
            <FloatField label="Recipient name" autoComplete="name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
            <div className="sm:col-span-2">
              <FloatField
                label="Street address" autoComplete="street-address" required
                value={f.address} onChange={(v) => { setF({ ...f, address: v }); setErrs({ ...errs, address: '' }); }}
                error={errs.address}
              />
            </div>
            <FloatSelect
              label="Province" required value={f.province}
              onChange={(v) => setF({ ...f, province: v, city: '' })}
            >
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </FloatSelect>
            <FloatSelect
              label="City" required value={f.city} error={errs.city}
              onChange={(v) => { setF({ ...f, city: v }); setErrs({ ...errs, city: '' }); }}
            >
              <option value="">Select your city</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </FloatSelect>
            <FloatField
              label="Postal code" autoComplete="postal-code" inputMode="numeric" maxLength={5}
              value={f.postalCode}
              onChange={(v) => { setF({ ...f, postalCode: v.replace(/\D/g, '').slice(0, 5) }); setErrs({ ...errs, postalCode: '' }); }}
              error={errs.postalCode}
            />
            <FloatField label="Phone for this address" autoComplete="tel" inputMode="tel" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
              {busy ? <><Spinner label="Saving" /> Saving…</> : <><Check size={14} aria-hidden="true" /> Save address</>}
            </button>
            <button type="button" onClick={close} className="btn border border-stone bg-white text-graphite hover:bg-satin/60">
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
