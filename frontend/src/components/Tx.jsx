// Backward-compatible label component. Site is English-only now, but we keep the
// component so we don't have to touch every callsite.
import { useApp } from '../store/AppContext';

export default function Tx({ k, className = '' }) {
  const { t } = useApp();
  return <span className={className}>{t(k)}</span>;
}
