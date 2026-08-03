import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ fontFamily: "'Archivo', system-ui, sans-serif", background: '#F7F5F1', minHeight: '80vh' }}
      className="flex items-center justify-center">
      <div className="text-center px-4 py-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E6E6B]">404</p>
        <h1 className="mt-4 h1">Page not found</h1>
        <p className="mt-3 body-sm text-[#6E6E6B] max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="min-h-[44px] bg-[#0E0E0E] px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-white flex items-center transition-opacity hover:opacity-80">
            Home
          </Link>
          <Link to="/shop" className="min-h-[44px] border border-[#E3E2DF] px-8 text-[12px] font-medium uppercase tracking-[0.10em] text-[#0E0E0E] flex items-center hover:bg-[#F7F6F4]">
            Shop all
          </Link>
        </div>
      </div>
    </div>
  );
}
