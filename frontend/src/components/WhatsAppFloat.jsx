import { MessageCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';

/*
 * Floating WhatsApp contact button.
 *
 * MEASURED at 390px: this sat at `bottom-5 right-5 z-40` while MobileNav is a
 * 53px bar docked at bottom-0 — also z-40. The bubble overlapped the nav by
 * 48x33px, physically covering the ACCOUNT tab, and because both carried the
 * same z-index the winner was decided by DOM order rather than intent.
 *
 * It now clears the nav using the --nav-h variable MobileNav publishes (which
 * includes the iOS safe-area inset), and takes z-45 so it sits above the nav
 * but below the PDP buy bar (z-50) and the consent notice (z-90). On md+ the
 * nav is display:none, --nav-h reports 0px, and the button falls back to its
 * original 20px inset.
 */
export default function WhatsAppFloat() {
  const { settings } = useApp();
  const wa = settings?.integrations?.whatsapp;
  if (!wa?.enabled || !wa.number) return null;
  const num = String(wa.number).replace(/\D/g, '');
  if (num.length < 10) return null;
  const href = `https://wa.me/${num}?text=${encodeURIComponent(wa.message || 'Hi!')}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      style={{ bottom: 'calc(var(--nav-h, 0px) + var(--consent-h, 0px) + 1.25rem)' }}
      className="fixed right-5 z-[45] flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-pearl shadow-e-2 transition hover:bg-charcoal"
    >
      <MessageCircle size={22} strokeWidth={1.5} />
    </a>
  );
}
