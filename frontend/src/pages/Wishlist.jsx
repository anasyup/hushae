import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useApp } from '../store/AppContext';
import ProductCard from '../components/ProductCard';
import Tx from '../components/Tx';

export default function Wishlist() {
  const { wishlist, auth } = useApp();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="font-display text-4xl"><Tx k="wishlist" /> <span className="text-ash">({wishlist.length})</span></h1>
      <p className="mt-2 text-sm text-ash">
        {auth ? 'Saved to your account — it follows you everywhere.' : 'Saved on this device. Sign in to keep it across devices.'}
      </p>

      {wishlist.length === 0 ? (
        <div className="mt-16 grid place-items-center py-10 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-satin/70 text-ash"><Heart size={24} /></span>
          <p className="mt-6 font-display text-2xl">Nothing saved yet</p>
          <p className="mt-2 max-w-xs text-sm text-ash">Tap the heart on any piece to keep it here for later.</p>
          <Link to="/shop" className="btn-primary mt-8">Discover Pieces</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 xl:grid-cols-5">
          {wishlist.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
