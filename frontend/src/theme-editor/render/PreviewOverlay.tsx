import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react';
import type { DropTarget } from './usePreviewDnd';

/* ============================================================================
 * On-canvas chrome for the preview: a floating toolbar pinned to the selected
 * node (drag handle, move up/down, duplicate, delete) and the drop indicator
 * shown while dragging.
 *
 * Rendered inside the iframe, positioned in viewport coordinates.
 * ========================================================================== */

interface Props {
  selectedId: string | null;
  label: string;
  dragging: boolean;
  target: DropTarget | null;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canModify: boolean;
}

export default function PreviewOverlay({
  selectedId, label, dragging, target, onMove, onDuplicate, onDelete, canModify,
}: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Keep the toolbar glued to the node through scrolling and reflow.
  useLayoutEffect(() => {
    if (!selectedId) { setRect(null); return undefined; }
    const measure = () => {
      const el = document.querySelector(`[data-node-id="${selectedId}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const el = document.querySelector(`[data-node-id="${selectedId}"]`);
    if (el) ro.observe(el);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const t = setInterval(measure, 400); // catches async image/layout shifts
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      clearInterval(t);
    };
  }, [selectedId]);

  return (
    <>
      {/* Drop indicator */}
      {dragging && target && (
        target.edge === 'inside' ? (
          <div className="te-overlay pointer-events-none fixed z-[9999] rounded-md"
            style={{
              top: target.rect.top, left: target.rect.left,
              width: target.rect.width, height: target.rect.height,
              outline: '2px solid #A68A56', outlineOffset: -2, background: 'rgba(0,91,211,.08)',
            }} />
        ) : (
          <div className="te-overlay pointer-events-none fixed z-[9999]"
            style={{
              top: target.edge === 'before' ? target.rect.top - 2 : target.rect.bottom - 2,
              left: target.rect.left, width: target.rect.width, height: 4,
              background: '#A68A56', borderRadius: 4, boxShadow: '0 0 0 3px rgba(0,91,211,.2)',
            }} />
        )
      )}

      {/* Selected-node toolbar */}
      {rect && !dragging && (
        <div
          className="te-overlay fixed z-[9998] flex items-center gap-0.5 rounded-lg bg-[#A68A56] px-1 py-1 text-white shadow-md"
          style={{
            top: Math.max(6, rect.top - 34),
            left: Math.min(Math.max(6, rect.left), window.innerWidth - 220),
          }}
        >
          <span
            data-drag-handle
            title="Drag to move"
            className="grid h-6 w-6 cursor-grab place-items-center rounded hover:bg-white/20 active:cursor-grabbing"
          >
            <GripVertical size={13} />
          </span>
          <span className="max-w-[110px] truncate px-1 text-[13px] font-semibold">{label}</span>
          {canModify && (
            <>
              <button onClick={() => onMove(-1)} title="Move up" className="grid h-6 w-6 place-items-center rounded hover:bg-white/20">
                <ArrowUp size={12} />
              </button>
              <button onClick={() => onMove(1)} title="Move down" className="grid h-6 w-6 place-items-center rounded hover:bg-white/20">
                <ArrowDown size={12} />
              </button>
              <button onClick={onDuplicate} title="Duplicate" className="grid h-6 w-6 place-items-center rounded hover:bg-white/20">
                <Copy size={12} />
              </button>
              <button onClick={onDelete} title="Delete" className="grid h-6 w-6 place-items-center rounded hover:bg-white/20">
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
