import { useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useEditor } from '../core/store';
import { getBlockSchema, getSectionSchema, sectionsByCategory } from '../core/registry';
import { findNode } from '../core/docUtils';
import type { BlockSchema } from '../core/types';
import { resolveIcon } from './iconRegistry';

/* Slide-over browsers for adding a section or a block. */

function Icon({ name, size = 16 }: { name?: string; size?: number }) {
  const C = resolveIcon(name);
  return <C size={size} />;
}

export function AddSectionPanel() {
  const group = useEditor((s) => s.addSectionFor);
  const close = useEditor((s) => s.openAddSection);
  const insert = useEditor((s) => s.insertSection);
  const doc = useEditor((s) => s.doc);
  const [q, setQ] = useState('');

  const categories = useMemo(() => sectionsByCategory(), []);
  if (!group) return null;

  const counts = new Map<string, number>();
  (['header', 'body', 'footer'] as const).forEach((g) => doc[g].forEach((s) => counts.set(s.type, (counts.get(s.type) || 0) + 1)));

  return (
    <Overlay title="Add section" onClose={() => close(null)} q={q} setQ={setQ} placeholder="Search sections">
      {[...categories.entries()].map(([cat, list]) => {
        const items = list.filter((s) =>
          (!s.groups || s.groups.includes(group)) &&
          (!q || s.name.toLowerCase().includes(q.toLowerCase()) || cat.toLowerCase().includes(q.toLowerCase())));
        if (!items.length) return null;
        return (
          <div key={cat} className="mb-4">
            <p className="mb-1.5 px-1 text-[13px] font-bold uppercase tracking-[0.12em] text-neutral-400">{cat}</p>
            <div className="space-y-0.5">
              {items.map((s) => {
                const atLimit = s.limit !== undefined && (counts.get(s.type) || 0) >= s.limit;
                return (
                  <button key={s.type} disabled={atLimit} onClick={() => insert(s.type, group)}
                    className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-neutral-100 text-neutral-600">
                      <Icon name={s.icon} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-neutral-900">{s.name}</span>
                      {s.description && <span className="mt-0.5 block text-[11.5px] leading-snug text-neutral-500">{s.description}</span>}
                      {atLimit && <span className="mt-0.5 block text-[13px] text-amber-600">Limit reached</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Overlay>
  );
}

export function AddBlockPanel() {
  const parentId = useEditor((s) => s.addBlockFor);
  const close = useEditor((s) => s.openAddBlock);
  const insert = useEditor((s) => s.insertBlock);
  const doc = useEditor((s) => s.doc);
  const [q, setQ] = useState('');

  if (!parentId) return null;
  const loc = findNode(doc, parentId);
  if (!loc) return null;

  const parentSchema: any = loc.isSection ? getSectionSchema(loc.node.type) : getBlockSchema(loc.node.type);
  const allowedTypes: string[] = loc.isSection
    ? (parentSchema?.blocks?.length
      ? parentSchema.blocks.map((b: BlockSchema) => b.type)
      : DEFAULT_SECTION_BLOCKS)
    : (parentSchema?.accepts || []);

  const schemas = allowedTypes.map((t) => getBlockSchema(t)).filter(Boolean) as BlockSchema[];
  const kids = (loc.node as any).blocks || [];
  const full = parentSchema?.maxBlocks && kids.length >= parentSchema.maxBlocks;

  const list = schemas.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Overlay title="Add block" onClose={() => close(null)} q={q} setQ={setQ} placeholder="Search blocks">
      {full && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">This section has reached its block limit.</p>}
      {list.length === 0 && <p className="p-6 text-center text-xs text-neutral-400">No blocks available here.</p>}
      <div className="space-y-0.5">
        {list.map((s) => {
          const used = kids.filter((k: any) => k.type === s.type).length;
          const atLimit = (s.limit !== undefined && used >= s.limit) || full;
          return (
            <button key={s.type} disabled={atLimit} onClick={() => insert(parentId, s.type)}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-neutral-100 text-neutral-600">
                <Icon name={s.icon} size={15} />
              </span>
              <span className="flex-1 text-[13px] font-medium text-neutral-900">{s.name}</span>
              {s.accepts?.length ? <span className="text-[13px] text-neutral-400">nests</span> : null}
            </button>
          );
        })}
      </div>
    </Overlay>
  );
}

const DEFAULT_SECTION_BLOCKS = [
  'heading', 'text', 'richtext', 'eyebrow', 'button', 'button_row', 'image', 'video', 'icon',
  'spacer', 'divider_block', 'group', 'section_header', 'product_card', 'testimonial',
  'faq_item', 'icon_item', 'timeline_item', 'slide', 'tab', 'countdown', 'html',
];

function Overlay({
  title, onClose, q, setQ, placeholder, children,
}: {
  title: string; onClose: () => void; q: string; setQ: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3">
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded text-neutral-500 hover:bg-neutral-100">
          <ArrowLeft size={15} />
        </button>
        <p className="flex-1 text-[14px] font-semibold text-neutral-900">{title}</p>
      </div>
      <div className="border-b border-neutral-100 px-3 py-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5">
          <Search size={12} className="text-neutral-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            className="w-full bg-transparent text-xs outline-none" />
        </div>
      </div>
      <div className="te-scroll flex-1 overflow-y-auto p-2.5">{children}</div>
    </div>
  );
}
