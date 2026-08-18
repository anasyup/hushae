import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import SectionHeader from '../SectionHeader';

/* ============================================================================
 * JournalTeaser — "From the Journal" article cards.
 *
 * Top luxury storefronts ALWAYS send shoppers into editorial. SSENSE,
 * Net-a-Porter, Aesop, Mr Porter all carry their editorial on the same
 * page where products live.
 *
 * HUSHAE already has a /journal route (powered by /api/blog) and an admin
 * editor. The teaser here connects that body of work to the home page
 * without forcing merchants to drag every article link into CMS — it reads
 * from the same API.
 *
 * Two/three articles, sorted newest-first, with cover image, kicker (tag),
 * title, single-line excerpt, and date. Empty state: nothing renders, not
 * a placeholder — silent elegance. */

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function JournalCardSkeleton() {
  return (
    <div className="flex flex-col bg-white">
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#f0f0f0]">
        <div className="h-full w-full skeleton" />
      </div>
      <div className="pt-5">
        <div className="h-3 w-16 skeleton" style={{ borderRadius: '2px' }} />
        <div className="mt-4 space-y-2">
          <div className="h-5 w-5/6 skeleton" style={{ borderRadius: '2px' }} />
          <div className="h-5 w-3/4 skeleton" style={{ borderRadius: '2px' }} />
        </div>
        <div className="mt-4 h-3 w-2/3 skeleton" style={{ borderRadius: '2px' }} />
        <div className="mt-5 h-2.5 w-24 skeleton" style={{ borderRadius: '2px' }} />
      </div>
    </div>
  );
}

export default function JournalTeaser({ limit = 3 }) {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    api(`/blog?limit=${limit}`)
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]));
  }, [limit]);

  // Hidden while loading and when nothing is published — neither state is
  // worth a placeholder on the storefront.
  if (!posts || posts.length === 0) {
    if (posts === null) {
      return (
        <section className="border-b border-[#e5e5e5] bg-white px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-[1600px]">
            <SectionHeader
              eyebrow="From the Journal"
              title="Considered Notes"
              variant="quiet"
            />
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-8 md:gap-y-0">
              {[1, 2, 3].map((i) => (
                <JournalCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      );
    }
    return null;
  }

  return (
    <section className="border-b border-[#e5e5e5] bg-white px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1600px]">
        <SectionHeader
          eyebrow="From the Journal"
          title="Considered Notes"
          href="/journal"
          cta="Read the Journal"
        />

        <div className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-8 md:gap-y-0">
          {posts.slice(0, 3).map((p) => (
            <article key={p._id || p.slug} className="group flex flex-col">
              <Link to={`/blog/${p.slug}`} className="block">
                <div className="aspect-[4/3] w-full overflow-hidden bg-[#f0f0f0]">
                  <img
                    src={p.coverImage || '/images/campaign/qa/editorial-modern.jpg'}
                    alt={p.coverAlt || p.title || 'HUSHAE journal'}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-[1.03]"
                  />
                </div>
              </Link>
              <div className="pt-5">
                <p className="text-xs font-medium uppercase tracking-eyebrow text-neutral-500">
                  {(Array.isArray(p.tags) && p.tags[0]) ? p.tags[0] : 'Journal'}
                </p>
                <h3 className="mt-3 font-display text-lg font-light uppercase leading-snug tracking-caps text-black md:text-xl">
                  <Link to={`/blog/${p.slug}`} className="transition-opacity duration-300 hover:opacity-60">
                    {p.title}
                  </Link>
                </h3>
                <p className="mt-3 line-clamp-2 text-sm font-normal leading-relaxed text-neutral-600">
                  {p.excerpt || ''}
                </p>
                <div className="mt-5 inline-flex items-center gap-3 text-xs font-medium uppercase tracking-label text-neutral-500">
                  <time dateTime={p.publishAt || p.createdAt}>
                    {formatDate(p.publishAt || p.createdAt)}
                  </time>
                  {p.author && (
                    <>
                      <span aria-hidden="true" className="h-px w-3 bg-neutral-300" />
                      <span>{p.author}</span>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}