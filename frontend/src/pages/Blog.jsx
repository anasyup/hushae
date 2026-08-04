import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Tag as TagIcon } from 'lucide-react';
import { api } from '../api/client';
import Seo from '../components/Seo';
import { fmtDate } from '../lib/format';
import Img from '../components/Img';

/* ============================================================================
 * BLOG — storefront article list.
 *
 * Reads /api/blog (published + live posts only — the server enforces the
 * publish rules). Cards follow the storefront's editorial register: no card
 * borders, no shadows, 2px gap grid, uppercase eyebrows.
 * ========================================================================== */

export default function Blog() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api('/blog').then((d) => setPosts(d.posts || [])).catch(() => setError(true));
  }, []);

  return (
    <div style={{ background: '#F7F6F4', color: '#0E0E0E', fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <Seo
        title="Journal — Fit Guides & Fabric Stories"
        description="HUSHAE journal — fit guides, fabric care and the thinking behind pieces designed and made in Pakistan."
        canonical="/blog"
      />

      <header className="border-b border-[#E3E2DF]">
        <div className="container py-16 md:py-24">
          <p className="eyebrow">The journal</p>
          <h1 className="mt-3 text-[36px] md:text-[56px] font-normal uppercase tracking-[0.01em] leading-[1.05]">Stories & fit guides</h1>
          <p className="mt-4 body-sm text-[#6E6E6B] max-w-xl">The thinking behind the pieces — sizing notes, fabric care, and what makes innerwear work.</p>
        </div>
      </header>

      {error ? (
        <div className="container py-20 text-center">
          <p className="body text-[#6E6E6B]">The journal could not be loaded right now.</p>
        </div>
      ) : !posts ? (
        <div className="container py-20">
          <div className="grid grid-cols-1 gap-[2px] bg-[#E3E2DF] md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-[#F7F6F4] p-6"><div className="skeleton h-64 w-full" /><div className="skeleton mt-4 h-4 w-3/4" /></div>
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="container py-20 text-center">
          <p className="body text-[#6E6E6B]">Nothing published yet — the first story is on its way.</p>
        </div>
      ) : (
        <section className="container py-12 md:py-16">
          <div className="grid grid-cols-1 gap-[2px] bg-[#E3E2DF] md:grid-cols-3">
            {posts.map((p) => (
              <Link key={p._id} to={`/blog/${p.slug}`} className="group bg-[#F7F6F4] p-6">
                <div className="overflow-hidden bg-[#E3E2DF]" style={{ aspectRatio: '4/3' }}>
                  {p.coverImage ? (
                    <Img src={p.coverImage} alt={p.coverAlt || p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }} />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">HUSHAE</div>
                  )}
                </div>
                <div className="pt-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6E6E6B]">
                    {p.author && <span>{p.author}</span>}
                    <span className="inline-flex items-center gap-1"><Clock size={10} />{fmtDate(p.publishAt || p.createdAt)}</span>
                  </div>
                  <h2 className="mt-3 text-[20px] md:text-[24px] font-normal leading-snug uppercase tracking-[0.01em] group-hover:opacity-60 transition-opacity">{p.title}</h2>
                  {p.excerpt && <p className="mt-3 body-sm text-[#6E6E6B] leading-relaxed">{p.excerpt}</p>}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] border-b border-[#0E0E0E]/20 pb-1 group-hover:border-[#0E0E0E] transition-colors">Read <ArrowRight size={12} /></span>
                </div>
                {p.tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[#E3E2DF] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.10em] text-[#6E6E6B]"><TagIcon size={9} />{t}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
