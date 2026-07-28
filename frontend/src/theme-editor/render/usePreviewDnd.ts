import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================================
 * Direct drag-and-drop inside the live preview.
 *
 * Every rendered node carries `data-node-id`. This hook adds pointer handling
 * on top of that markup, so the merchant can grab a section or block on the
 * page itself and drop it somewhere else — no sidebar required.
 *
 * It reports the intent upward; the editor owns the mutation.
 * ========================================================================== */

export type DropEdge = 'before' | 'after' | 'inside';

export interface DropTarget {
  id: string;
  edge: DropEdge;
  rect: DOMRect;
}

interface Options {
  enabled: boolean;
  onMove: (id: string, targetId: string, edge: DropEdge) => void;
  /** Node types that accept children, so 'inside' is offered. */
  canNest: (id: string) => boolean;
}

const DRAG_THRESHOLD = 6;

export function usePreviewDnd({ enabled, onMove, canNest }: Options) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const start = useRef<{ x: number; y: number; id: string } | null>(null);
  const armed = useRef(false);

  const nodeAt = useCallback((x: number, y: number, exclude: string) => {
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      const host = (el as HTMLElement).closest?.('[data-node-id]') as HTMLElement | null;
      if (!host) continue;
      const id = host.dataset.nodeId!;
      if (!id || id === exclude) continue;
      // Skip ancestors of the dragged node — dropping into yourself is invalid.
      const dragged = document.querySelector(`[data-node-id="${exclude}"]`);
      if (dragged && host.contains(dragged)) continue;
      return host;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const handle = (e.target as HTMLElement).closest?.('[data-drag-handle]') as HTMLElement | null;
      const host = handle
        ? (handle.closest('[data-node-id]') as HTMLElement | null)
        : null;
      if (!host) return;
      start.current = { x: e.clientX, y: e.clientY, id: host.dataset.nodeId! };
      armed.current = false;
    };

    const onMoveEvt = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!armed.current) {
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < DRAG_THRESHOLD) return;
        armed.current = true;
        setDraggingId(s.id);
        document.body.style.userSelect = 'none';
      }
      const host = nodeAt(e.clientX, e.clientY, s.id);
      if (!host) { setTarget(null); return; }
      const rect = host.getBoundingClientRect();
      const rel = (e.clientY - rect.top) / Math.max(1, rect.height);
      const id = host.dataset.nodeId!;
      let edge: DropEdge = rel < 0.5 ? 'before' : 'after';
      if (canNest(id) && rel > 0.3 && rel < 0.7) edge = 'inside';
      setTarget({ id, edge, rect });
    };

    const onUp = () => {
      const s = start.current;
      const t = target;
      start.current = null;
      document.body.style.userSelect = '';
      if (armed.current && s && t) onMove(s.id, t.id, t.edge);
      armed.current = false;
      setDraggingId(null);
      setTarget(null);
    };

    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMoveEvt, true);
    document.addEventListener('pointerup', onUp, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMoveEvt, true);
      document.removeEventListener('pointerup', onUp, true);
    };
  }, [enabled, nodeAt, onMove, target, canNest]);

  return { draggingId, target };
}
