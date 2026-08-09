import { MessageCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function WhatsAppFloat() {
  const { settings } = useApp();
  const wa = settings?.integrations?.whatsapp;
  if (!wa?.enabled || !wa.number) return null;
  const num = String(wa.number).replace(/\D/g, '');
  if (num.length < 10) return null;
  const href = `https://wa.me/${num}?text=${encodeURIComponent(wa.message || 'Hi!')}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-pearl shadow-e-2 transition hover:bg-charcoal">
      <MessageCircle size={22} strokeWidth={1.5} />
    </a>
  );
}
