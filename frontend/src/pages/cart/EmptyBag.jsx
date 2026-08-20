import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import ProductRow from '../../components/ProductRow';

/* ============================================================================
 * HUSHAE EmptyBag — Minimalist Luxury Empty State
 * ========================================================================== */
export default function EmptyBag({ cfg, recent = [], trending = [], loadingTrending = false }) {
  return (
    <div className="pt-8 pb-16 font-sans">
      <div className="mx-auto max-w-md px-6 py-16 text-center space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F5F5F5] text-neutral-400">
          <ShoppingBag size={24} strokeWidth={1.3} />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-light uppercase tracking-wide text-[#000000]">
            Your Bag is Empty
          </h1>
          <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-xs mx-auto">
            Discover precision-engineered innerwear and apparel crafted for everyday luxury.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#000000] px-8 text-xs font-medium uppercase tracking-widest text-[#FFFFFF] hover:bg-[#1A1A1A] transition-colors shadow-md"
          >
            <span>Explore Collection</span>
            <ArrowRight size={13} />
          </Link>
          <Link
            to="/best"
            className="inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center rounded-full border border-neutral-300 bg-white px-8 text-xs font-medium uppercase tracking-widest text-black hover:border-black transition-colors"
          >
            Best Sellers
          </Link>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-12 border-t border-[#EAEAEA] pt-16">
          <ProductRow eyebrow="CONTINUE BROWSING" title="Recently Viewed" products={recent} />
        </div>
      )}

      {loadingTrending ? (
        <div className="mt-14 h-[398px] md:h-[466px]" aria-hidden="true" />
      ) : trending.length > 0 && (
        <div className="mt-12 border-t border-[#EAEAEA] pt-16">
          <ProductRow eyebrow="COMMUNITY ICONS" title="Trending at HUSHAE" products={trending} />
        </div>
      )}
    </div>
  );
}
