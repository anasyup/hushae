import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Tag as TagIcon } from 'lucide-react';
import { api } from '../api/client';
import Seo from '../components/Seo';
import BlogMarkdown from '../components/BlogMarkdown';
import NotFound from './NotFound';
import { fmtDate } from '../lib/format';
import Img from '../components/Img';

/* ============================================================================
 * BLOG POST — one article.
 *
 * The server decides what is live (drafts/scheduled return 404), exactly like
 * CmsPage. The markdown body is rendered by BlogMarkdown — React elements
 * only, never dangerouslySetInnerHTML.
 * ========================================================================== */

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(undefined); // undefined = loading
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setPost(undefined);
    setMissing(false);
    api(`/blog/${encodeURIComponent(slug || '')}`)
      .then((d) => { if (alive) setPost(d.post); })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);

  if (missing) return <NotFound />;

  if (!post) {
    return (
      <div className="container pt-[130px] pb-20">
        <div className="skeleton h-72 w-full" />
        <div className="skeleton mt-8 h-6 w-2/3" />
        <div className="skeleton mt-4 h-4 w-full" />
      </div>
    );
  }

  const seoImage = post.coverImage || post.seo?.ogImage || '';
  const seoTitle = post.seo?.title || post.title;

  return (
    <article style={{ background: '#FFFFFF', color: '#111111' }}>
      <Seo
        title={seoTitle}
        description={post.seo?.description || post.excerpt || undefined}
        image={seoImage || undefined}
        canonical={`/blog/${post.slug}`}
        noIndex={post.seo?.noIndex}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt || undefined,
          image: seoImage || undefined,
          datePublished: post.publishAt ? new Date(post.publishAt).toISOString() : undefined,
          dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
          author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: 'HUSHAE' },
        }}
        jsonLdId="blog-post"
      />

      <div className="container max-w-3xl pt-[130px] pb-12 md:pb-20">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] text-ash hover:text-obsidian transition-colors">
          <ArrowLeft size={13} /> Journal
        </Link>

        <header className="mt-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ash">
            {post.author && <span>{post.author}</span>}
            <span className="inline-flex items-center gap-1"><Clock size={10} />{fmtDate(post.publishAt || post.createdAt)}</span>
          </div>
          <h1 className="mt-4 text-[32px] md:text-[48px] font-normal uppercase tracking-[0.01em] leading-[1.1]">{post.title}</h1>
          {post.excerpt && <p className="mt-5 body text-ash text-[16px] leading-relaxed max-w-2xl">{post.excerpt}</p>}
        </header>

        {post.coverImage && (
          <div className="mt-10 overflow-hidden bg-line" style={{ aspectRatio: '16/9' }}>
            <Img src={post.coverImage} alt={post.coverAlt || post.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-4">
          <BlogMarkdown text={post.content} headingLevel={2} />
        </div>

        {post.tags?.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-line pt-6">
            {post.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.10em] text-ash"><TagIcon size={9} />{t}</span>
            ))}
          </div>
        )}

        <div className="mt-12 border-t border-line pt-8">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.10em] text-ash hover:text-obsidian transition-colors">
            <ArrowLeft size={13} /> Back to journal
          </Link>
        </div>
      </div>
    </article>
  );
}
