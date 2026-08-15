import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ background: '#FAF8F5', minHeight: '80vh' }}
      className="flex items-center justify-center">
      <div className="text-center px-4 pt-[220px] pb-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ash">404</p>
        <h1 className="mt-4 h1">Page not found</h1>
        <p className="mt-3 body-sm text-ash max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="min-h-[44px] bg-obsidian px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white flex items-center transition-opacity hover:opacity-80">
            Home
          </Link>
          <Link to="/shop" className="min-h-[44px] border border-line px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-obsidian flex items-center hover:bg-alabaster">
            Shop all
          </Link>
        </div>
      </div>
    </div>
  );
}
