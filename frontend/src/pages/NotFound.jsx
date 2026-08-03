import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <div className="container-page py-sect-y md:py-sect-y-lg">
      <Seo title="Page not found — HUSHAE" noIndex />
      <div className="empty-state">
        <p className="font-display text-display-1 leading-none text-satin" aria-hidden="true">404</p>
        <span className="empty-state-icon mt-6" aria-hidden="true">
          <Compass size={24} strokeWidth={1.6} />
        </span>
        <h1 className="mt-6 font-display text-h2">This page slipped away</h1>
        <p className="mt-2 text-body-sm">The link may be old, or the piece may have moved.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/shop" className="btn-outline">Browse the shop</Link>
        </div>
      </div>
    </div>
  );
}
