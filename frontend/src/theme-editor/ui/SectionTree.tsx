import { memo, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Square } from 'lucide-react';
import { useEditor } from '../core/store';
import { getBlockSchema, getSectionSchema, labelFor } from '../core/registry';
import type { BlockNode, SectionGroup, SectionNode } from '../core/types';
import { NodeMenu } from './NodeMenu';
import { resolveIcon } from './iconRegistry';

/* ============================================================================
 * Left panel — the page structure tree.
 * Sections and blocks share one recursive row component so nesting is
 * unlimited and drag-and-drop works at any depth.
 * ========================================================================== */

const GROUP_LABEL: Record<SectionGroup, string> = { header: 'Header', body: 'Template', footer: 'Footer' };

function Icon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const C = resolveIcon(name);
  return <C size={size} className={className} />;
}

export default function SectionTree() {
  const doc = useEditor((s) => s.doc);
  const query = useEditor((s) => s.sidebarQuery);
  const openAddSection = useEditor((s) => s.openAddSection);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return null;
    const hits = new Set<string>();
    const walk = (n: SectionNode | BlockNode, chain: string[]) => {
      const label = labelFor(n).toLowerCase();
      const schema = getSectionSchema(n.type) || getBlockSchema(n.type);
      const inSettings = JSON.stringify(n.settings).toLowerCase().includes(q);
      const inFields = (schema?.settings || []).some((f) => (f.label || '').toLowerCase().includes(q));
      if (label.includes(q) || inSettings || inFields) [...chain, n.id].forEach((i) => hits.add(i));
      (n as SectionNode).blocks?.forEach((b) => walk(b, [...chain, n.id]));
    };
    (['header', 'body', 'footer'] as SectionGroup[]).forEach((g) => doc[g].forEach((s) => walk(s, [])));
    return hits;
  }, [q, doc]);

  return (
    <div className="te-scroll flex-1 overflow-y-auto pb-6">
      {(['header', 'body', 'footer'] as SectionGroup[]).map((group) => (
        <div key={group} className="border-b border-neutral-100 py-1.5">
          <p className="px-3 py-1.5 text-[15px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            {GROUP_LABEL[group]}
          </p>
          {doc[group]
            .filter((s) => !matches || matches.has(s.id))
            .map((section, i) => (
              <TreeNode key={section.id} node={section} group={group} depth={0} index={i}
                parentId={group} matches={matches} />
            ))}
          {group !== 'header' && (
            <button onClick={() => openAddSection(group)}
              className="mx-1.5 mt-1 flex w-[calc(100%-12px)] items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] font-medium text-[#005BD3] transition hover:bg-[#005BD3]/8">
              <Plus size={14} /> Add section
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

interface RowProps {
  node: SectionNode | BlockNode;
  group: SectionGroup;
  depth: number;
  index: number;
  parentId: string | SectionGroup;
  matches: Set<string> | null;
}

const TreeNode = memo(function TreeNode({ node, group, depth, index, parentId, matches }: RowProps) {
  const selectedId = useEditor((s) => s.selectedId);
  const expanded = useEditor((s) => s.expanded[node.id]);
  const select = useEditor((s) => s.select);
  const toggleExpanded = useEditor((s) => s.toggleExpanded);
  const dropNode = useEditor((s) => s.dropNode);
  const openAddBlock = useEditor((s) => s.openAddBlock);
  const rename = useEditor((s) => s.rename);

  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const isSection = depth === 0;
  const schema = isSection ? getSectionSchema(node.type) : getBlockSchema(node.type);
  const kids = (node as SectionNode).blocks || [];
  const canNest = !isSection ? !!(schema as any)?.accepts?.length : true;
  const hasKids = kids.length > 0;
  const active = selectedId === node.id;
  const locked = isSection && !!(schema as any)?.locked;

  const onDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - r.top;
    if (canNest && y > r.height * 0.32 && y < r.height * 0.68) setDragOver('inside');
    else setDragOver(y < r.height / 2 ? 'before' : 'after');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/plain');
    setDragOver(null);
    if (!id || id === node.id) return;
    if (dragOver === 'inside' && canNest) {
      dropNode(id, node.id, kids.length);
      toggleExpanded(node.id, true);
    } else {
      dropNode(id, parentId, dragOver === 'after' ? index + 1 : index);
    }
  };

  const commitRename = () => {
    setEditing(false);
    if (draft.trim() !== labelFor(node)) rename(node.id, draft.trim());
  };

  return (
    <div>
      {dragOver === 'before' && <div className="te-drop-line" style={{ marginLeft: 12 + depth * 14 }} />}
      <div
        draggable={!locked}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={() => setDragOver(null)}
        onDrop={onDrop}
        onClick={() => select(node.id)}
        onDoubleClick={() => { setDraft(labelFor(node)); setEditing(true); }}
        title={schema?.description || labelFor(node)}
        className={`group relative mx-1.5 flex items-center gap-1 rounded-md pr-1 transition ${
          active ? 'bg-[#005BD3]/10' : 'hover:bg-neutral-100'
        } ${dragOver === 'inside' ? 'ring-2 ring-inset ring-[#005BD3]' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {hasKids ? (
          <button onClick={(e) => { e.stopPropagation(); toggleExpanded(node.id); }}
            className="grid h-7 w-5 shrink-0 place-items-center text-neutral-400 hover:text-neutral-900">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : <span className="w-5 shrink-0" />}

        <Icon name={(schema as any)?.icon || 'Square'} size={13}
          className={`shrink-0 ${node.hidden ? 'text-neutral-300' : active ? 'text-[#005BD3]' : 'text-neutral-500'}`} />

        {editing ? (
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-[#005BD3] px-1 py-0.5 text-[15px] outline-none" />
        ) : (
          <span className={`min-w-0 flex-1 truncate py-1.5 text-[15px] ${
            node.hidden ? 'text-neutral-400 line-through' : active ? 'font-medium text-neutral-900' : 'text-neutral-700'
          }`}>
            {labelFor(node)}
          </span>
        )}

        <NodeMenu node={node} isSection={isSection} locked={locked} onRename={() => { setDraft(labelFor(node)); setEditing(true); }} />
      </div>

      {expanded && hasKids && (
        <div>
          {kids.filter((k) => !matches || matches.has(k.id)).map((k, i) => (
            <TreeNode key={k.id} node={k} group={group} depth={depth + 1} index={i} parentId={node.id} matches={matches} />
          ))}
        </div>
      )}

      {expanded && canNest && (
        <button onClick={(e) => { e.stopPropagation(); openAddBlock(node.id); }}
          className="mx-1.5 flex items-center gap-1.5 rounded-md py-1.5 text-left text-[13.5px] font-medium text-neutral-500 transition hover:text-[#005BD3]"
          style={{ paddingLeft: 24 + depth * 14 }}>
          <Plus size={12} /> Add block
        </button>
      )}

      {dragOver === 'after' && <div className="te-drop-line" style={{ marginLeft: 12 + depth * 14 }} />}
    </div>
  );
});
