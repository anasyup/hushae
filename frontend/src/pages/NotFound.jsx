import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-28 text-center">
      <p className="font-display text-7xl text-satin">404</p>
      <h1 className="mt-4 font-display text-3xl">This page slipped away</h1>
      <p className="mt-2 text-sm text-ash">The link may be old, or the piece may have moved.</p>
      <Link to="/" className="btn-primary mt-8">Back to Home</Link>
    </div>
  );
}
