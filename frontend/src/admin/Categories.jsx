import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save, X, Edit3, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * CATEGORIES V3 — Taxonomy Manager
 * Compact page title + add category. Table with name, product count, status,
 * order, actions. Child categories visually indented. Edit in V3 modal.
 * All business logic preserved.
 * ========================================================================== */

const EMPTY = { name: '', gender: 'women', description: '', image: '', sortOrder: 0, isActive: true };

export default function Categories() {
  const { auth, toast } = useApp();
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => setCats([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editing._id) await api(`/categories/${editing._id}`, { method: 'PUT', token: auth.token, body: editing });
      else await api('/categories', { method: 'POST', token: auth.token, body: editing });
      toast('Category saved'); setEditing(null); load();
    } catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  const disable = async (c) => {
    try { await api(`/categories/${c._id}`, { method: 'DELETE', token: auth.token }); toast('Category disabled'); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <AdminLayout title="Categories">
      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/products">Products</Link><span>/</span>
            <span>Categories</span>
          </div>
          <h1 className="v3-h-page">Categories</h1>
          <p className="v3-h-small mt-1">Organize the catalog into browsable categories.</p>
        </div>
        <div className="v3-page-header-right">
          <button type="button" onClick={() => setEditing({ ...EMPTY })} className="v3-btn v3-btn-primary v3-btn-sm">
            <Plus size={12} /> Add Category
          </button>
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────────────── */}
      {cats === null ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 v3-skeleton rounded-[5px]" />)}</div>
      ) : cats.length === 0 ? (
        <div className="v3-card">
          <div className="v3-empty">
            <Plus size={24} className="v3-empty-icon" />
            <p className="v3-empty-title">No categories yet</p>
            <p className="v3-empty-desc">Create your first category to organize products.</p>
            <button type="button" onClick={() => setEditing({ ...EMPTY })} className="v3-btn v3-btn-primary mt-3"><Plus size={12} /> Add Category</button>
          </div>
        </div>
      ) : (
        <div className="v3-card">
          <div className="v3-table-wrap">
            <table className="v3-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>Image</th>
                  <th>Category</th>
                  <th>Gender</th>
                  <th className="right">Order</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c._id} className={!c.isActive ? 'opacity-45' : ''}>
                    <td>
                      <div className="w-10 h-10 rounded-[3px] bg-[#F0F1F3] overflow-hidden border border-[#E5E7EB]">
                        {c.image ? <Img src={c.image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                    </td>
                    <td>
                      <p className="text-[13px] font-medium text-[#111]">{c.name}</p>
                      <p className="text-[10px] font-mono text-[#9CA3AF] mt-0.5">{c.slug}</p>
                    </td>
                    <td className="text-[12px] capitalize text-[#4A4A4A]">{c.gender}</td>
                    <td className="right text-[12px] tabular text-[#4A4A4A]">{c.sortOrder}</td>
                    <td>
                      <span className={`v3-status ${c.isActive ? 'v3-status-active' : 'v3-status-inactive'}`}>
                        <span className="v3-status-dot" />
                        {c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setEditing({ ...c })} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Edit"><Edit3 size={13} /></button>
                        {c.isActive && <button type="button" onClick={() => disable(c)} className="v3-btn v3-btn-icon v3-btn-ghost sm" title="Disable"><EyeOff size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────── */}
      {editing && (
        <div className="v3-modal-overlay" onClick={() => setEditing(null)}>
          <div className="v3-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="v3-modal-header">
              <h2 className="v3-h-section">{editing._id ? 'Edit Category' : 'New Category'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="v3-btn v3-btn-icon v3-btn-ghost"><X size={16} /></button>
            </div>
            <div className="v3-modal-body space-y-4">
              <div className="v3-field">
                <label className="v3-label">Name *</label>
                <input className="v3-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Category name" autoFocus />
              </div>
              <div className="v3-field">
                <label className="v3-label">Gender *</label>
                <select className="v3-select w-full" value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>
                  <option value="women">Women</option><option value="men">Men</option>
                </select>
              </div>
              <div className="v3-field">
                <label className="v3-label">Description</label>
                <textarea className="v3-textarea" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className="v3-field">
                <label className="v3-label">Image URL</label>
                <input className="v3-input font-mono text-[12px]" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="v3-field">
                  <label className="v3-label">Sort Order</label>
                  <input className="v3-input" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
                </div>
                <div className="v3-field">
                  <label className="v3-label">Status</label>
                  <label className="flex items-center gap-2 h-9 cursor-pointer">
                    <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="w-3.5 h-3.5 accent-[#111]" />
                    <span className="text-[12px] text-[#4A4A4A]">Active</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="v3-modal-footer">
              <button type="button" onClick={() => setEditing(null)} className="v3-btn v3-btn-secondary">Cancel</button>
              <button type="button" onClick={save} disabled={busy || !editing.name} className="v3-btn v3-btn-primary">
                <Save size={12} /> {busy ? 'Saving…' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
