import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Stars from './Stars';

/* ============================================================================
 * Review photo lightbox.
 *
 * A real dialog, following the pattern proven in Sprints 2E and 2F: role,
 * aria-modal, labelled, focus moved in on open, trapped while open, Escape
 * closes, focus returns to the thumbnail that opened it.
 *
 * Arrow keys move between photos, which is what anyone who opens a gallery
 * reaches for first. The counter is announced politely so a screen reader
 * user knows where they are without the image itself being described.
 * ========================================================================== */
export default function MediaLightbox({ media, index, onClose, onIndex }) {
  const panelRef = useRef(null);
  const opener = useRef(null);
  const [zoom, setZoom] = useState(false);
  const open = index != null && index >= 0;

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    setZoom(false);

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight') { onIndex((index + 1) % media.length); return; }
      if (e.key === 'ArrowLeft') { onIndex((index - 1 + media.length) % media.length); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll('button');
      if (!f?.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 40);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, index, media, onClose, onIndex]);

  if (!open) return null;
  const item = media[index];

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-obsidian/92 backdrop-blur-sm"
      onClick={onClose}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Customer photo" className="flex h-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-body-sm text-alabaster/80" role="status">
            {index + 1} of {media.length}
          </p>
          <button
            type="button" onClick={onClose} aria-label="Close photo"
            className="grid h-11 w-11 place-items-center rounded-full text-alabaster/80 transition hover:bg-white/10 hover:text-alabaster"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-auto px-2 pb-2">
          {media.length > 1 && (
            <button
              type="button"
              onClick={() => onIndex((index - 1 + media.length) % media.length)}
              aria-label="Previous photo"
              className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-obsidian/50 text-alabaster transition hover:bg-obsidian/80"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          )}

          {/* Tap to zoom — the same affordance the product gallery uses. */}
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            aria-label={zoom ? 'Zoom out of this photo' : 'Zoom in — tap to zoom this photo'}
            className={`max-h-full ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          >
            <img
              src={item.url}
              alt={`Photo from ${item.by || 'a customer'}`}
              className={`mx-auto rounded-card object-contain transition-transform duration-base motion-reduce:transition-none ${
                zoom ? 'max-h-none scale-[1.8]' : 'max-h-[70vh] scale-100'
              }`}
            />
          </button>

          {media.length > 1 && (
            <button
              type="button"
              onClick={() => onIndex((index + 1) % media.length)}
              aria-label="Next photo"
              className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-obsidian/50 text-alabaster transition hover:bg-obsidian/80"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        {(item.by || item.rating) && (
          <div className="flex items-center justify-center gap-3 px-4 pb-5 pt-1">
            {item.rating ? <Stars value={item.rating} size={13} /> : null}
            {item.by && <span className="text-body-sm text-alabaster/80">{item.by}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
