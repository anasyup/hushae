import { Heart } from 'lucide-react';
import { useApp } from '../store/AppContext';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/ui/EmptyState';
import Tx from '../components/Tx';

export default function Wishlist() {
  const { wishlist, auth } = useApp();

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-h1"><Tx k="wishlist" /> <span className="text-ash">({wishlist.length})</span></h1>
      <p className="mt-2 text-body-sm">
        {auth ? 'Saved to your account — it follows you everywhere.' : 'Saved on this device. Sign in to keep it across devices.'}
      </p>

      {wishlist.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here for later."
          action={{ label: 'Discover Pieces', to: '/shop' }}
        />
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-gap-md gap-y-gap-xl md:grid-cols-3 xl:grid-cols-5">
          {wishlist.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
