import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/* ============================================================================
 * SHARED ADMIN CONTROLS
 *
 * Measured before writing this. `function Toggle` appears in NINE admin files
 * and has drifted into FIVE different implementations:
 *
 *   SettingsSearch    md5 f804e6e1   has min-h-[44px]
 *   SettingsLoyalty   md5 f9a19acc   no min-height
 *   SettingsReviews   md5 f9a19acc   no min-height
 *   SettingsCX        md5 f9a19acc   no min-height
 *   SettingsCart      md5 55b32438   no min-height
 *   SettingsAccounts  md5 a4ca10d3   no min-height
 *   SettingsCheckout  md5 16b2ec3d   no min-height
 *
 * That drift is not cosmetic. Measured in the browser at 390px, the toggle
 * ROW (the real tap target, because the label wraps the button) is:
 *
 *   search 50px · loyalty 44px · reviews 50px · cart 50px ·
 *   experience 50px · accounts 50px · CHECKOUT 20px  <- 8 of 18 under 44
 *
 * The pages that pass are passing by accident: padding plus a description line
 * happens to clear 44. Remove the description and the row collapses, which is
 * exactly what happened on the checkout page.
 *
 * `Section` has three variants across four files for no reason at all.
 *
 * So this file exists to stop Sprint 2K adding a sixth copy, and the pages
 * that were already wrong are pointed at it. Nothing here changes how any
 * existing screen looks — only what a thumb can actually hit.
 * ========================================================================== */

const edLabel = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-white/35';
const edInput = 'h-8 w-full rounded-[4px] border border-white/20 bg-[#0A0A0A] px-3 text-[12px] text-white/85 outline-none placeholder:text-white/30 hover:border-white/40 focus:border-white/50 disabled:opacity-40';
const edHint = 'mt-1.5 text-[11px] leading-relaxed text-white/30';

export function Section({ title, description, children, tone, action, variant }) {
  if (variant === 'editorial') {
    return (
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="adm-index mb-0">{title}</p>
            {description && <p className="mt-2 text-[12px] leading-relaxed text-white/35">{description}</p>}
          </div>
          {action}
        </div>
        <div className="border-y border-white/10 py-6">{children}</div>
      </section>
    );
  }
  return (
    <section className={`rounded-2xl border bg-white p-6 ${tone === 'warn' ? 'border-amber-300' : 'border-neutral-200'}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-600">{title}</p>
          {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-600">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A switch whose tap target is the whole row.
 *
 * The <button> sits inside a <label>, and a button is a labelable element, so
 * the label forwards the click. min-h-[44px] is on the LABEL, not the pill —
 * the pill is 36x20 and always will be; the row is what a thumb aims at.
 */
export function Toggle({ label, description, checked, onChange, disabled, variant }) {
  if (variant === 'editorial') {
    return (
      <label className={`flex min-h-[44px] items-center justify-between gap-4 border-b border-white/5 py-3 last:border-0 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
        <span className="min-w-0">
          <span className="block text-[13px] text-white/85">{label}</span>
          {description && <span className="mt-0.5 block text-[12px] leading-relaxed text-white/35">{description}</span>}
        </span>
        <button
          type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full ${checked ? 'bg-white' : 'bg-white/20'} ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${checked ? 'left-[18px] bg-black' : 'left-0.5 bg-white'}`} />
        </button>
      </label>
    );
  }
  return (
    <label className={`flex min-h-[44px] items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition ${disabled ? 'opacity-55' : 'cursor-pointer hover:border-neutral-300'}`}>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-neutral-900">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] leading-relaxed text-neutral-600">{description}</span>}
      </span>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-neutral-900' : 'bg-neutral-300'} ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

/* useId() on every field: a <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500"> sitting next to an input
   is only visually a label. Sprint 2J measured 45 of 79 controls on one admin
   screen announcing "edit text, blank" to a screen reader because of exactly
   that. htmlFor is what connects them. */
export function Num({ label, hint, value, onChange, disabled, variant, ...rest }) {
  const id = useId();
  const editorial = variant === 'editorial';
  return (
    <div>
      <label className={editorial ? edLabel : 'mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500'} htmlFor={id}>{label}</label>
      <input
        id={id} className={editorial ? edInput : 'input'} type="number" value={value ?? 0} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        {...rest}
      />
      {hint && <p id={`${id}-h`} className={editorial ? edHint : 'mt-1.5 text-[12px] leading-relaxed text-neutral-600'}>{hint}</p>}
    </div>
  );
}

export function Text({ label, hint, value, onChange, disabled, variant, ...rest }) {
  const id = useId();
  const editorial = variant === 'editorial';
  return (
    <div>
      <label className={editorial ? edLabel : 'mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500'} htmlFor={id}>{label}</label>
      <input
        id={id} className={editorial ? edInput : 'input'} value={value ?? ''} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)} {...rest}
      />
      {hint && <p id={`${id}-h`} className={editorial ? edHint : 'mt-1.5 text-[12px] leading-relaxed text-neutral-600'}>{hint}</p>}
    </div>
  );
}

export function Select({ label, hint, value, onChange, options, disabled, variant }) {
  const id = useId();
  const editorial = variant === 'editorial';
  return (
    <div>
      <label className={editorial ? edLabel : 'mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500'} htmlFor={id}>{label}</label>
      <select
        id={id} className={editorial ? edInput : 'input'} value={value ?? ''} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p id={`${id}-h`} className={editorial ? edHint : 'mt-1.5 text-[12px] leading-relaxed text-neutral-600'}>{hint}</p>}
    </div>
  );
}

/** A datetime-local field. Stores ISO, displays local — the merchant thinks in
 *  Karachi time and the server thinks in UTC. */
export function DateTime({ label, hint, value, onChange, disabled, variant }) {
  const id = useId();
  const local = value ? new Date(value).toISOString().slice(0, 16) : '';
  const editorial = variant === 'editorial';
  return (
    <div>
      <label className={editorial ? edLabel : 'mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500'} htmlFor={id}>{label}</label>
      <input
        id={id} className={editorial ? edInput : 'input'} type="datetime-local" value={local} disabled={disabled}
        aria-describedby={hint ? `${id}-h` : undefined}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
      />
      {hint && <p id={`${id}-h`} className={editorial ? edHint : 'mt-1.5 text-[12px] leading-relaxed text-neutral-600'}>{hint}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`rounded-xl border bg-white px-4 py-3 ${tone === 'warn' ? 'border-amber-300' : 'border-neutral-200'}`}>
      <p className="text-[12px] uppercase tracking-wider text-neutral-600">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-neutral-600">{sub}</p>}
    </div>
  );
}

/** Collapsible group. Used by the promotion builder, where showing every
 *  option for all seven types at once is a wall nobody reads. */
export function Accordion({ title, subtitle, children, defaultOpen = false, badge, variant }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  if (variant === 'editorial') {
    return (
      <div className="border-y border-white/10">
        <h3>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={id}
            className="flex min-h-[44px] w-full items-center gap-3 py-4 text-left adm-row-hover"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-white">{title}</span>
              {subtitle && <span className="mt-0.5 block text-[12px] text-white/35">{subtitle}</span>}
            </span>
            {badge}
            <ChevronDown size={14} className={`shrink-0 text-white/35 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </h3>
        {open && <div id={id} className="border-t border-white/10 pb-6 pt-4">{children}</div>}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-neutral-900">{title}</span>
            {subtitle && <span className="mt-0.5 block text-[12px] text-neutral-600">{subtitle}</span>}
          </span>
          {badge}
          <ChevronDown size={16} className={`shrink-0 text-neutral-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </h3>
      {open && <div id={id} className="border-t border-neutral-200 p-4">{children}</div>}
    </div>
  );
}

/** The sticky save bar every settings screen ends with. */
export function SaveBar({ dirty, busy, onSave, onDiscard, disabled }) {
  if (!dirty) return null;
  return (
    <div className="sticky bottom-4 z-30 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-neutral-900 bg-neutral-900 px-4 py-3 text-white shadow-xl">
      <p className="text-[13px] font-medium">Unsaved changes</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onDiscard} className="min-h-[44px] rounded-lg border border-white/20 px-3 text-[12px] font-semibold text-white/80 transition hover:bg-white/10">
          Discard
        </button>
        <button type="button" onClick={onSave} disabled={busy || disabled} className="min-h-[44px] rounded-lg bg-white px-4 text-[12px] font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/** Consistent empty state, so twelve screens stop inventing their own. */
export function Empty({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
      <p className="font-sans text-xl text-neutral-900">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
