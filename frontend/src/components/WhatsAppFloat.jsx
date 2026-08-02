import { MessageCircle } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { storefrontConfig } from '../lib/storefrontConfig';

/**
 * WhatsApp floating action button.
 *
 * Dock lives at LEFT-bottom so it never collides with right-side promo
 * popup, toasts or the cookie consent sheet (which sits centre-bottom
 * above the mobile nav). Safe-area padding clears iOS home indicator.
 */
export default function WhatsAppFloat() {
  const { settings } = useApp();
  const wa = useMemo(() => storefrontConfig(settings).whatsapp, [settings]);
  if (!wa.enabled || !wa.href) return null;
  return (
    <a
      href={wa.href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      style={{ zIndex: 'var(--z-float)' }}
      className="fixed left-5 bottom-[calc(72px+env(safe-area-inset-bottom))] flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card
                 transition-transform duration-base ease-standard hover:scale-105 focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-obsidian focus-visible:ring-offset-2
                 motion-reduce:transform-none md:left-6 md:bottom-6"
    >
      <MessageCircle size={22} aria-hidden="true" />
    </a>
  );
}
