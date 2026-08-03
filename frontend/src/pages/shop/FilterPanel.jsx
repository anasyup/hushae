import { Check } from 'lucide-react';

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const TIERS = ['Economy', 'Standard', 'Premium'];
export const BADGES = ['Breathable', 'Cooling', 'Seamless', 'Sweat Control', 'Support', 'Silk-Touch', 'Quick Dry'];
export const FITS = ['Regular', 'Relaxed', 'Slim', 'Seamless'];
export const COLORS = [
  { name: 'Black', hex: '#1A1A1A' }, { name: 'Soft White', hex: '#FFFFFF' }, { name: 'White', hex: '#FFFFFF' },
  { name: 'Nude', hex: '#E3C9B3' }, { name: 'Blush', hex: '#E8C7C8' }, { name: 'Sage', hex: '#8F9C8B' },
  { name: 'Slate', hex: '#6B7280' }, { name: 'Navy', hex: '#1F2A44' }, { name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Heather Grey', hex: '#9AA0A6' }, { name: 'Olive', hex: '#6B7252' },
  { name: 'Cream', hex: '#F4EFE6' }, { name: 'Dove Grey', hex: '#B7B7B7' },
];
export const PRICE_BANDS = [
  { key: '0-1000', label: 'Under PKR 1,000', min: '', max: '1000' },
  { key: '1000-2500', label: 'PKR 1,000 – 2,500', min: '1000', max: '2500' },
  { key: '2500-5000', label: 'PKR 2,500 – 5,000', min: '2500', max: '5000' },
  { key: '5000-', label: 'PKR 5,000 +', min: '5000', max: '' },
];

function SectionLabel({ children }) {
  return <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6E6E6B] mb-3">{children}</p>;
}

export default function FilterPanel({ catList, f, touch = false }) {
  const { get, list, setOne, setMany, toggleMany } = f;
  const band = PRICE_BANDS.find((b) => b.min === get('minPrice') && b.max === get('maxPrice'));

  const chip = 'rounded-[1px] border text-[12px] transition-colors duration-150';
  const off  = 'border-[#E3E2DF] text-[#6E6E6B] hover:border-[#0E0E0E] hover:text-[#0E0E0E]';
  const on   = 'border-[#0E0E0E] bg-[#0E0E0E] text-white';
  const pad  = touch ? 'px-4 py-2.5 min-h-[44px]' : 'px-3.5 py-2 min-h-[36px]';

  return (
    <div className="space-y-6">

      {/* Category */}
      {catList.length > 0 && (
        <div>
          <SectionLabel>Category</SectionLabel>
          <div className="space-y-0.5">
            {catList.map((c) => {
              const sel = get('category') === c.slug;
              return (
                <button key={c.slug} type="button" aria-pressed={sel}
                  onClick={() => setOne('category', sel ? '' : c.slug)}
                  className={`block w-full text-left text-[13px] transition-colors duration-150 ${touch ? 'py-3' : 'py-2'} ${sel ? 'text-[#0E0E0E] font-medium' : 'text-[#6E6E6B] hover:text-[#0E0E0E]'}`}>
                  {c.name}{sel && <span className="ml-2 text-[10px] uppercase tracking-[0.14em]">— selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Availability */}
      <div>
        <SectionLabel>Availability</SectionLabel>
        <button type="button" aria-pressed={get('availability') === 'in'}
          onClick={() => setOne('availability', get('availability') === 'in' ? '' : 'in')}
          className={`inline-flex items-center gap-1.5 ${chip} ${pad} ${get('availability') === 'in' ? on : off}`}>
          {get('availability') === 'in' && <Check size={11} strokeWidth={2.5} />} In stock only
        </button>
      </div>

      {/* Price */}
      <div>
        <SectionLabel>Price</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {PRICE_BANDS.map((b) => {
            const sel = band?.key === b.key;
            return (
              <button key={b.key} type="button" aria-pressed={sel}
                onClick={() => setMany(sel ? { minPrice: '', maxPrice: '' } : { minPrice: b.min, maxPrice: b.max })}
                className={`${chip} ${pad} ${sel ? on : off}`}>{b.label}</button>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div>
        <SectionLabel>Size</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => {
            const sel = list('size').includes(s);
            return (
              <button key={s} type="button" aria-pressed={sel} onClick={() => toggleMany('size', s)} aria-label={`Size ${s}`}
                className={`${chip} px-3 ${touch ? 'min-w-[48px] min-h-[44px]' : 'min-w-[40px] min-h-[36px]'} flex items-center justify-center ${sel ? on : off}`}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* Colour */}
      <div>
        <SectionLabel>Colour</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const sel = list('color').includes(c.name);
            return (
              <button key={c.name} type="button" aria-pressed={sel} onClick={() => toggleMany('color', c.name)}
                aria-label={c.name} title={c.name}
                className={`grid place-items-center rounded-[1px] border transition-all duration-150 ${touch ? 'h-10 w-10' : 'h-7 w-7'} ${sel ? 'border-[#0E0E0E] ring-1 ring-[#0E0E0E] ring-offset-1' : 'border-[#E3E2DF] hover:border-[#6E6E6B]'}`}
                style={{ backgroundColor: c.hex }}>
                {sel && <Check size={touch ? 14 : 11} strokeWidth={2.5} className={['#FFFFFF','#E3C9B3','#E8C7C8','#F4EFE6','#9AA0A6','#B7B7B7'].includes(c.hex) ? 'text-[#0E0E0E]' : 'text-white'} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tier */}
      <div>
        <SectionLabel>Tier</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((t) => {
            const sel = list('tier').includes(t);
            return <button key={t} type="button" aria-pressed={sel} onClick={() => toggleMany('tier', t)} className={`${chip} ${pad} ${sel ? on : off}`}>{t}</button>;
          })}
        </div>
      </div>

      {/* Fit */}
      <div>
        <SectionLabel>Fit</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {FITS.map((t) => {
            const sel = list('fit').includes(t);
            return <button key={t} type="button" aria-pressed={sel} onClick={() => toggleMany('fit', t)} className={`${chip} ${pad} ${sel ? on : off}`}>{t}</button>;
          })}
        </div>
      </div>

      {/* Fabric technology */}
      <div>
        <SectionLabel>Fabric technology</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((b) => {
            const sel = list('badge').includes(b);
            return <button key={b} type="button" aria-pressed={sel} onClick={() => toggleMany('badge', b)} className={`${chip} ${pad} ${sel ? on : off}`}>{b}</button>;
          })}
        </div>
      </div>

    </div>
  );
}
