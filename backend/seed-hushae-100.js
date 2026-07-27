/**
 * HUSHAE — Full 100-product catalog builder
 * 5 women categories × 10 products + 5 men categories × 10 products
 * Every product gets 4 images from a curated per-category pool.
 */
const m = require('mongoose');
const URI = 'mongodb+srv://velourauser:velourauser1@cluster0.7lcpatb.mongodb.net/hushae?retryWrites=true&w=majority&appName=Cluster0';

// Image pools per category — 4 images each, all HUSHAE-branded, matching aesthetic
const IMG = {
  bras: [
    '/images/products/cat-bras-hero.jpg',
    '/images/products/hushae-women-bras-stack.jpg',
    '/images/categories/bras.jpg',
    '/images/products/cat-camisoles-hero.jpg',
  ],
  panties: [
    '/images/products/cat-panties-hero.jpg',
    '/images/products/hushae-women-panties-fanned.jpg',
    '/images/categories/panties.jpg',
    '/images/products/cat-bras-hero.jpg',
  ],
  shapewear: [
    '/images/products/cat-shapewear-hero.jpg',
    '/images/products/hushae-women-shapewear-hanger.jpg',
    '/images/categories/shapewear.jpg',
    '/images/products/cat-bras-hero.jpg',
  ],
  'camisoles-slips': [
    '/images/products/cat-camisoles-hero.jpg',
    '/images/products/hushae-women-camisole-pair.jpg',
    '/images/categories/camisoles-slips.jpg',
    '/images/products/cat-sleepwear-hero.jpg',
  ],
  'sleepwear-loungewear': [
    '/images/products/cat-sleepwear-hero.jpg',
    '/images/products/hushae-women-sleepwear-fold.jpg',
    '/images/categories/sleepwear-loungewear.jpg',
    '/images/products/cat-camisoles-hero.jpg',
  ],
  briefs: [
    '/images/products/cat-briefs-hero.jpg',
    '/images/products/hushae-men-briefs-stack.jpg',
    '/images/categories/briefs.jpg',
    '/images/products/cat-trunks-hero.jpg',
  ],
  boxers: [
    '/images/products/cat-boxers-hero.jpg',
    '/images/products/hushae-men-boxer-tray.jpg',
    '/images/categories/boxers.jpg',
    '/images/products/cat-boxers-hero.jpg',
  ],
  trunks: [
    '/images/products/cat-trunks-hero.jpg',
    '/images/products/hushae-men-boxer-trio.jpg',
    '/images/categories/trunks.jpg',
    '/images/products/cat-briefs-hero.jpg',
  ],
  'vests-undershirts': [
    '/images/products/cat-vests-hero.jpg',
    '/images/products/hushae-men-vest-hanger.jpg',
    '/images/categories/vests-undershirts.jpg',
    '/images/products/cat-thermal-hero.jpg',
  ],
  'thermal-sports': [
    '/images/products/cat-thermal-hero.jpg',
    '/images/products/hushae-men-thermal-waffle.jpg',
    '/images/categories/thermal-sports.jpg',
    '/images/products/cat-vests-hero.jpg',
  ],
};

// Product name templates per category (10 unique names each)
const NAMES = {
  bras: [
    'Second-Skin Wireless Bra', 'Everyday T-Shirt Bra', 'Full-Coverage Support Bra',
    'Lace-Detail Balconette', 'Active Sports Bra', 'Cotton Comfort Lounge Bra',
    'Cooling Mesh Back Bra', 'Lightly Padded Everyday', 'Nursing Comfort Bra', 'Silk-Touch Bralette',
  ],
  panties: [
    'Cotton Comfort Brief', 'Lace-Edge Bikini Brief', 'High-Waist Full Brief',
    'Modal Soft Hipster', 'Seamless No-Show', 'Lace Trim Boyshort',
    'Everyday Cotton Bikini', 'Nude-Line Hipster', 'Signature Cotton 3-Pack', 'Bikini Brief 4-Pack',
  ],
  shapewear: [
    'Smoothing Full Slip', 'High-Waist Shaper', 'Sculpt Bodysuit',
    'Mid-Thigh Shape Short', 'Postpartum Support Wrap', 'Camisole Shaper',
    'Bridal Smooth Slip', 'Light Control Brief', 'Contour Bodysuit', 'Waist Cincher',
  ],
  'camisoles-slips': [
    'Silk-Touch Camisole', 'Lace-Edge Cami', 'Modal Stretch Camisole',
    'Spaghetti Strap Cami', 'Full Slip', 'Bridal Base Slip',
    'Long Slip Dress', 'Tank Cami Layer', 'Satin Layer Cami', 'AirSoft Cami',
  ],
  'sleepwear-loungewear': [
    'Cloud Lounge Set', 'Modal Pajama Set', 'Silk-Touch Nightdress',
    'Cotton Sleep Shirt', 'Summer Nightie', 'Silken Bridal Robe',
    'Winter Cotton PJ Set', 'Cami-Short Set', 'Long Nightgown', 'Waffle Lounge Set',
  ],
  briefs: [
    'Signature Cotton Brief 3-Pack', 'Modal Executive Brief', 'Luxe Silk-Touch Brief',
    'Athletic Support Brief', 'CoolMesh Summer Brief', 'Everyday Cotton Brief',
    'Pearl Silk-Touch Brief', 'No-Chafe Brief', 'Cotton 5-Pack Value', 'Compression Brief',
  ],
  boxers: [
    'Everyday Cotton Boxer', 'Printed Woven Boxer', 'Loose Fit 3-Pack',
    'Slate Check Boxer', 'AirLite Summer Boxer', 'Modal Soft Boxer',
    'Executive Satin Boxer', 'Lounge Sleep Boxer', 'Premium Gift Boxer Set', 'Metro Print Boxer',
  ],
  trunks: [
    'Core Cotton Trunk', 'CoolTech Performance Trunk', 'Luxe Comfort Trunk',
    'Athletic Compression Trunk', 'Modal Smooth Trunk', 'Prime No-Chafe Trunk',
    'AeroMesh Trunk', 'Executive Gift Trunk', 'Urban 3-Pack Trunk', 'Motion Stretch Trunk',
  ],
  'vests-undershirts': [
    'Ribbed Cotton Vest', 'AirLite Sleeveless Vest', 'Winter Thermal Vest',
    'Modal Soft Vest', 'Executive Undershirt', 'Formal Half-Sleeve',
    'Cooling Mesh Vest', 'Luxe Cotton-Silk Vest', 'Compression Support Vest', 'Cotton 3-Pack Vest',
  ],
  'thermal-sports': [
    'Waffle Thermal Set', 'Winter Core Thermal', 'ColdShield Thermal Set',
    'AllWeather Thermal Top', 'Base Thermal Bottom', 'Pro Active Compression Set',
    'Cricket Compression Short', 'Executive Sports Inner Set', 'Motion Compression Shirt', 'Performance Layer Vest',
  ],
};

const TIERS = ['Economy', 'Standard', 'Standard', 'Premium', 'Premium', 'Standard', 'Economy', 'Premium', 'Standard', 'Premium'];

// Realistic PKR price bands per category
const PRICE_BANDS = {
  bras:                  { Economy: [800, 1100], Standard: [1400, 1900], Premium: [2400, 3400] },
  panties:               { Economy: [450, 650],  Standard: [850, 1250],  Premium: [1600, 2200] },
  shapewear:             { Economy: [1400, 1800],Standard: [2200, 2900], Premium: [3400, 4400] },
  'camisoles-slips':     { Economy: [850, 1150], Standard: [1500, 2000], Premium: [2600, 3600] },
  'sleepwear-loungewear':{ Economy: [1500, 2000],Standard: [2600, 3500], Premium: [4000, 5500] },
  briefs:                { Economy: [550, 800],  Standard: [1000, 1500], Premium: [1900, 2600] },
  boxers:                { Economy: [700, 950],  Standard: [1300, 1750], Premium: [2200, 3000] },
  trunks:                { Economy: [800, 1100], Standard: [1400, 1900], Premium: [2400, 3200] },
  'vests-undershirts':   { Economy: [450, 700],  Standard: [900, 1400],  Premium: [1800, 2500] },
  'thermal-sports':      { Economy: [1200, 1600],Standard: [2000, 2800], Premium: [3200, 4500] },
};

const W_COLORS_ALL = [
  { name: 'Nude', hex: '#E3C9B3' },{ name: 'Black', hex: '#1A1A1A' },{ name: 'Soft White', hex: '#FFFFFF' },
  { name: 'Blush', hex: '#E8C7C8' },{ name: 'Sage', hex: '#8F9C8B' },{ name: 'Slate', hex: '#6B7280' },
  { name: 'Cream', hex: '#F4EFE6' },{ name: 'Dove Grey', hex: '#B7B7B7' },
];
const M_COLORS_ALL = [
  { name: 'Black', hex: '#1A1A1A' },{ name: 'White', hex: '#FFFFFF' },{ name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Navy', hex: '#1F2A44' },{ name: 'Heather Grey', hex: '#9AA0A6' },{ name: 'Olive', hex: '#6B7252' },
  { name: 'Cream', hex: '#F4EFE6' },{ name: 'Sage', hex: '#8F9C8B' },
];

const LETTER = ['S', 'M', 'L', 'XL', 'XXL'];
const BRA_SIZES = ['32B', '34B', '34C', '36B', '36C', '38C'];
const WAIST_SIZES = ['M', 'L', 'XL', 'XXL'];

const CARE_STD = ['Machine wash cold with like colours', 'Do not bleach', 'Line dry in shade to protect elasticity'];
const CARE_DEL = ['Hand wash cold or gentle machine cycle in a wash bag', 'Do not bleach, wring or tumble dry', 'Lay flat to dry away from direct sunlight'];
const CARE_THM = ['Machine wash cold, inside out', 'Do not use fabric softener — it coats performance fibres', 'Air dry flat; do not iron directly on elastane'];

const FABRIC_BY_CAT = {
  bras: '78% Nylon · 22% Elastane',
  panties: '95% Cotton · 5% Elastane',
  shapewear: '82% Nylon · 18% Elastane',
  'camisoles-slips': '95% Modal · 5% Elastane · Lace trim',
  'sleepwear-loungewear': '80% Modal · 20% Cotton',
  briefs: '92% Modal · 8% Elastane',
  boxers: '100% Combed Cotton',
  trunks: '95% Cotton · 5% Elastane',
  'vests-undershirts': '100% Cotton Rib',
  'thermal-sports': '92% Cotton · 8% Elastane',
};

const DESC_BY_CAT = {
  bras: 'Cut in a second-skin knit with bonded seamless edges. Adjustable straps and a soft powernet band give confident hold without pressure — the closest a bra can feel to nothing at all.',
  panties: 'Everyday brief in a soft, breathable knit with a flat waistband and cotton-lined gusset. The kind of underwear you reach for on days that matter.',
  shapewear: 'Sculpts with variable-tension knit — firmer at the waist, lighter at the hips. Bonded seamless edges disappear under the closest fits.',
  'camisoles-slips': 'A silk-touch modal cami with a whisper-fine lace trim. Layers invisibly under sheer tops, sleeps beautifully by itself.',
  'sleepwear-loungewear': 'Cloud-soft modal-cotton knit — the kind of set you live in on Sundays. Cut for real rest, tailored for a quiet elegance.',
  briefs: 'The HUSHAE house brief — modal-cotton knit that gets softer with every wash. Ultra-flat waistband, tag-free interior, discreet finish.',
  boxers: 'A daily boxer in premium combed cotton. Elasticated waistband, generous cut, zero side-seam friction. Made for the rotation.',
  trunks: 'A modern-cut trunk with a contoured pouch and a flat waistband that never rolls. Silk-touch cotton with a hint of stretch.',
  'vests-undershirts': 'The essential vest in fine rib cotton. Reinforced neckline that holds shape wash after wash, and a length that stays tucked.',
  'thermal-sports': 'Engineered for cold days. Waffle-knit cotton traps warm air without bulk — layers seamlessly under a shirt or sweater.',
};

const BADGES_BY_TIER = { Economy: ['Everyday'], Standard: ['Bestseller'], Premium: ['Signature', 'Silk-Touch'] };

// Category → gender + which color/size pool
const CAT_MAP = {
  bras:                   { gender: 'women', sizes: BRA_SIZES,   colors: W_COLORS_ALL, care: CARE_DEL },
  panties:                { gender: 'women', sizes: LETTER,      colors: W_COLORS_ALL, care: CARE_STD },
  shapewear:              { gender: 'women', sizes: LETTER,      colors: W_COLORS_ALL, care: CARE_DEL },
  'camisoles-slips':      { gender: 'women', sizes: LETTER,      colors: W_COLORS_ALL, care: CARE_DEL },
  'sleepwear-loungewear': { gender: 'women', sizes: LETTER,      colors: W_COLORS_ALL, care: CARE_STD },
  briefs:                 { gender: 'men',   sizes: LETTER,      colors: M_COLORS_ALL, care: CARE_STD },
  boxers:                 { gender: 'men',   sizes: LETTER,      colors: M_COLORS_ALL, care: CARE_STD },
  trunks:                 { gender: 'men',   sizes: LETTER,      colors: M_COLORS_ALL, care: CARE_STD },
  'vests-undershirts':    { gender: 'men',   sizes: LETTER,      colors: M_COLORS_ALL, care: CARE_STD },
  'thermal-sports':       { gender: 'men',   sizes: WAIST_SIZES, colors: M_COLORS_ALL, care: CARE_THM },
};

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildAll() {
  const out = [];
  let sku = 100;
  for (const catSlug of Object.keys(NAMES)) {
    const map = CAT_MAP[catSlug];
    const names = NAMES[catSlug];
    for (let i = 0; i < 10; i++) {
      const name = 'HUSHAE ' + names[i];
      const tier = TIERS[i];
      const band = PRICE_BANDS[catSlug][tier];
      const price = Math.round((band[0] + Math.random() * (band[1] - band[0])) / 50) * 50;
      const compareAt = Math.round((price * 1.25 + 50) / 50) * 50;
      const cost = Math.round(price * 0.35 / 50) * 50;
      // Take 3 random colors from pool
      const shuffled = [...map.colors].sort(() => Math.random() - 0.5);
      const colors = shuffled.slice(0, 3 + (i % 3));
      const badges = [...BADGES_BY_TIER[tier]];
      if (i === 0) badges.push('Bestseller');
      if (i === 3 || i === 7) badges.push('New');

      out.push({
        name,
        slug: 'hushae-' + slugify(names[i]) + '-' + (sku),
        sku: 'HUS-' + catSlug.substring(0, 3).toUpperCase() + '-' + String(sku).padStart(4, '0'),
        gender: map.gender,
        categorySlug: catSlug,
        tier,
        price,
        compareAtPrice: compareAt,
        costPrice: cost,
        stock: 20 + Math.floor(Math.random() * 60),
        images: IMG[catSlug].map((url, idx) => ({ url, alt: `${name} — view ${idx + 1}` })),
        shortDescription: DESC_BY_CAT[catSlug].split('.')[0] + '.',
        description: DESC_BY_CAT[catSlug],
        sizes: map.sizes,
        colors,
        fabric: FABRIC_BY_CAT[catSlug],
        badges,
        care: map.care,
        isBestSeller: i < 2,
        isFeatured: i < 4,
      });
      sku++;
    }
  }
  return out;
}

(async () => {
  await m.connect(URI, { serverSelectionTimeoutMS: 20000 });
  const db = m.connection.db;

  const cats = await db.collection('categories').find({}).toArray();
  const catBySlug = Object.fromEntries(cats.map(c => [c.slug, c._id]));

  // Nuke existing products
  const nuked = await db.collection('products').deleteMany({});
  console.log('Deleted existing products:', nuked.deletedCount);

  const products = buildAll();
  const now = Date.now();
  const docs = products.map((p, i) => ({
    ...p,
    category: catBySlug[p.categorySlug],
    isActive: true,
    status: 'active',
    tags: [p.gender, p.categorySlug, p.tier.toLowerCase()],
    ratingAvg: Math.round((4.5 + Math.random() * 0.4) * 10) / 10,
    ratingCount: 15 + Math.floor(Math.random() * 60),
    createdAt: new Date(now - i * 1800 * 1000),
    updatedAt: new Date(now - i * 1800 * 1000),
    __v: 0,
  }));

  const r = await db.collection('products').insertMany(docs);
  console.log('Products inserted:', r.insertedCount);

  const women = await db.collection('products').countDocuments({ gender: 'women' });
  const men = await db.collection('products').countDocuments({ gender: 'men' });
  console.log('Women:', women, '| Men:', men);

  await m.disconnect();
})().catch(e => { console.error('ERR:', e.message, e.stack); process.exit(1); });
