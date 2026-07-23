import { BadgePercent, BarChart3, FileText, Globe, LayoutGrid, TrendingUp } from 'lucide-react';
import AdminLayout from './AdminLayout';

const PAGES = {
  growth: { icon: TrendingUp, title: 'Growth', desc: 'Marketing campaigns, SEO tools aur store-growth features yahan add kiye jayenge.' },
  discounts: { icon: BadgePercent, title: 'Discounts', desc: 'Coupon codes, promo offers aur special discounts yahan banayenge aur manage honge.' },
  content: { icon: FileText, title: 'Content', desc: 'Homepage banners, announcement bar, pages aur site ka content yahan edit hoga.' },
  markets: { icon: Globe, title: 'Markets', desc: 'Countries, currencies aur shipping zones ki settings yahan hongi.' },
  analytics: { icon: BarChart3, title: 'Analytics', desc: 'Sales reports, traffic aur customer insights ke charts yahan dikhenge.' },
  apps: { icon: LayoutGrid, title: 'Apps', desc: 'Third-party apps aur integrations yahan connect hongi.' },
};

export default function AdminPlaceholder({ page }) {
  const P = PAGES[page] || PAGES.growth;
  const Icon = P.icon;
  return (
    <AdminLayout title={P.title}>
      <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-obsidian/15 bg-white/70 p-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-obsidian text-alabaster"><Icon size={28} /></span>
        <h2 className="mt-5 font-display text-2xl">{P.title} — Coming Soon</h2>
        <p className="mt-2 max-w-md text-sm text-obsidian/60">{P.desc}</p>
        <p className="mt-5 rounded-full bg-satin px-4 py-1.5 text-xs font-medium text-obsidian/70">Bataiye is page par kya chahiye — hum yahan live features add karenge</p>
      </div>
    </AdminLayout>
  );
}
