import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react';
import { useEditor } from '../core/store';
import type { BlockNode, SectionNode } from '../core/types';

/* Row context menu: rename, duplicate, hide, move, delete. */

export function NodeMenu({
  node, isSection, locked, onRename,
}: { node: SectionNode | BlockNode; isSection: boolean; locked?: boolean; onRename: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const duplicate = useEditor((s) => s.duplicate);
  const remove = useEditor((s) => s.remove);
  const toggleVisibility = useEditor((s) => s.toggleVisibility);
  const move = useEditor((s) => s.move);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const item = (icon: React.ReactNode, label: string, fn: () => void, danger = false) => (
    <button
      onClick={(e) => { e.stopPropagation(); fn(); setOpen(false); }}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13.5px] transition ${
        danger ? 'text-white/50 hover:bg-white/5' : 'text-neutral-700 hover:bg-neutral-100'}`}>
      {icon} {label}
    </button>
  );

  const confirmDelete = () => {
    const name = labelFor(node);
    if (window.confirm(`Delete “${name}”? This cannot be undone.`)) {
      remove(node.id);
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); toggleVisibility(node.id); }}
        title={node.hidden ? 'Show' : 'Hide'}
        className="grid h-6 w-6 place-items-center rounded text-neutral-400 opacity-0 transition hover:bg-neutral-200 hover:text-neutral-900 group-hover:opacity-100">
        {node.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={`grid h-6 w-6 place-items-center rounded text-neutral-400 transition hover:bg-neutral-200 hover:text-neutral-900 ${
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <MoreHorizontal size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-xl">
          {item(<Pencil size={12} />, 'Rename', onRename)}
          {item(<ArrowUp size={12} />, 'Move up', () => move(node.id, -1))}
          {item(<ArrowDown size={12} />, 'Move down', () => move(node.id, 1))}
          {!locked && item(<Copy size={12} />, 'Duplicate', () => duplicate(node.id))}
          {item(node.hidden ? <Eye size={12} /> : <EyeOff size={12} />, node.hidden ? 'Show' : 'Hide', () => toggleVisibility(node.id))}
          {!locked && (
            <>
              <div className="my-1 border-t border-neutral-100" />
              {item(<Trash2 size={12} />, 'Delete', confirmDelete, true)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
