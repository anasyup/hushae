import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-white">
      <div className="px-4 pb-20 pt-[130px] text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-ash">404</p>
        <h1 className="mt-5 font-display text-3xl font-light uppercase tracking-[0.14em] text-obsidian md:text-4xl">Page not found</h1>
        <p className="body-sm mx-auto mt-4 max-w-sm text-ash">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            Home
          </Link>
          <Link to="/shop" className="btn-outline">
            Shop all
          </Link>
        </div>
      </div>
    </div>
  );
}
