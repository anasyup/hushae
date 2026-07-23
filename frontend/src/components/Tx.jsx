import { useApp } from '../store/AppContext';

// Translated label — applies the Urdu face automatically.
export default function Tx({ k, className = '' }) {
  const { t, lang } = useApp();
  return <span className={`${lang === 'ur' ? 'font-urdu' : ''} ${className}`}>{t(k)}</span>;
}
