// ---------------------------------------------------------------------------
// HUSHAE seed catalog: 10 categories x 10 products (100 SKUs)
// Names / tiers / prices are fixed as specified; copy, fabric, sizing, imagery
// are composed here so every product reads individually.
// Imagery: verified Unsplash fashion/fabric/lifestyle photography (temporary
// placeholders, replaced later by final AI product photography).
// ---------------------------------------------------------------------------

const U = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const POOLS = {
  w: {
    main: ['photo-1445205170230-053b83016050', 'photo-1515886657613-9f3515b0c78f', 'photo-1524504388940-b1c1722653e1', 'photo-1490481651871-ab68de25d43d', 'photo-1487222477894-8943e31ef7b2', 'photo-1519744792095-2f2205e87b6f', 'photo-1594633312681-425c7b97ccd1', 'photo-1554568218-0f1715e72254', 'photo-1556905055-8f358a7a47b2', 'photo-1523381210434-271e8be1f52b'],
    detail: ['photo-1564859228273-274232fdb516', 'photo-1550859492-d5da9d8e45f3', 'photo-1550684376-efcbd6e3f031', 'photo-1557672172-298e090bd0f1', 'photo-1541701494587-cb58502866ab', 'photo-1528459801416-a9e53bbf4e17', 'photo-1520903920243-00d872a2d1c9', 'photo-1621072156002-e2fccdc0b176'],
    life: ['photo-1522771739844-6a9f6d5f14af', 'photo-1540518614846-7eded433c457', 'photo-1505693416388-ac5ce068fe85', 'photo-1618220179428-22790b461013', 'photo-1616486338812-3dadae4b4ace', 'photo-1509942774463-acf339cf87d5'],
  },
  m: {
    main: ['photo-1521572163474-6864f9cf17ab', 'photo-1620799140408-edc6dcb6d633', 'photo-1618354691373-d851c5c3a990', 'photo-1576566588028-4147f3842f27', 'photo-1503341504253-dff4815485f1', 'photo-1596755094514-f87e34085b2c', 'photo-1602810318383-e386cc2a3ccf', 'photo-1617137968427-85924c800a22', 'photo-1620012253295-c15cc3e65df4', 'photo-1586363104862-3a5e2ab60d99'],
    detail: ['photo-1564859228273-274232fdb516', 'photo-1550684376-efcbd6e3f031', 'photo-1557672172-298e090bd0f1', 'photo-1441986300917-64674bd600d8', 'photo-1523381210434-271e8be1f52b', 'photo-1556905055-8f358a7a47b2', 'photo-1434389677669-e08b4cac3105', 'photo-1608748010899-18f300247112'],
    life: ['photo-1594938298603-c8148c4dae35', 'photo-1507679799987-c73779587ccf', 'photo-1611312449408-fcece27cdbb7', 'photo-1552374196-c4e7ffc6e126', 'photo-1492562080023-ab3db95bfbce', 'photo-1519085360753-af0119f7cbe7', 'photo-1516826957135-700dedea698c', 'photo-1610652492500-ded49ceeb378'],
  },
};

const W_COLORS = [
  { name: 'Nude', hex: '#E3C9B3' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Soft White', hex: '#FFFFFF' },
  { name: 'Blush', hex: '#E8C7C8' }, { name: 'Sage', hex: '#8F9C8B' }, { name: 'Slate', hex: '#6B7280' },
];
const M_COLORS = [
  { name: 'Black', hex: '#1A1A1A' }, { name: 'White', hex: '#FFFFFF' }, { name: 'Charcoal', hex: '#3A3A3A' },
  { name: 'Navy', hex: '#1F2A44' }, { name: 'Heather Grey', hex: '#9AA0A6' }, { name: 'Olive', hex: '#6B7252' },
];

const CARE = {
  easy: ['Machine wash cold with like colours', 'Use a gentle detergent; avoid bleach', 'Line dry in shade to protect elasticity'],
  delicate: ['Hand wash cold or gentle machine cycle in a wash bag', 'Do not bleach, wring or tumble dry', 'Lay flat to dry away from direct sunlight'],
  thermal: ['Machine wash cold, inside out', 'Do not use fabric softener — it coats performance fibres', 'Air dry flat; do not iron directly on elastane'],
};

const LETTER = ['S', 'M', 'L', 'XL'];
const LETTER_XX = ['S', 'M', 'L', 'XL', 'XXL'];
const BRA = ['32B', '34B', '34C', '36B', '36C', '38C'];
const WAIST = ['M', 'L', 'XL', 'XXL'];

const TIER_LINE = {
  Economy: 'Honest, everyday value — soft hand-feel, clean stitching, and a fit that holds through repeat washes.',
  Standard: 'Our core line: elevated fabric blends and considered fits, built for the daily rotation.',
  Premium: 'From the Signature edit — finer yarns, zero-dig finishes and a second-skin feel that disappears under clothing.',
};

const CATS = [
  {
    slug: 'bras', name: 'Bras', gender: 'women', sizes: BRA, care: 'delicate', bundle: 'panties',
    desc: 'Wire-free comfort to sculpted support — bras engineered for real days, in breathable cotton, modal and cooling mesh.',
    blurb: 'A bra should disappear on the body and never on quality. This edit spans wireless lounge shapes to structured support, each pattern graded on real fit models for a true-to-size, no-dig fit.',
    fabrics: ['92% combed cotton, 8% elastane — brushed inner cups', '84% micro-modal, 11% silk-touch nylon, 5% elastane', '78% recycled cooling poly, 22% elastane mesh panels'],
    badgePool: ['Support', 'Breathable', 'Seamless', 'Sweat Control', 'Cooling'],
    items: [
      ['Aura Seamless Wireless Bra', 'Standard', 1450], ['Liora Cotton T-Shirt Bra', 'Economy', 750],
      ['Maison Full Coverage Support Bra', 'Standard', 1650], ['Avra Lace Detail Balconette Bra', 'Premium', 2800],
      ['Orlen Active Support Sports Bra', 'Standard', 1800], ['Niva Soft Cup Lounge Bra', 'Economy', 690],
      ['Celest Cooling Mesh Back Bra', 'Standard', 1550], ['Evaleena Lightly Padded Everyday Bra', 'Standard', 1350],
      ['Nora Nursing Comfort Bra', 'Standard', 1700], ['Serene Silk-Touch Bralette', 'Premium', 2400],
    ],
  },
  {
    slug: 'panties', name: 'Panties', gender: 'women', sizes: LETTER, care: 'easy', bundle: 'bras',
    desc: 'Briefs, hipsters and boyshorts in stay-soft cotton and invisible-under-anything seamless knits.',
    blurb: 'The foundation of every drawer. Cut for zero ride-up and no visible lines, with gussets lined in breathable cotton and waistbands that sit flat — never tight, never loose.',
    fabrics: ['95% combed cotton, 5% elastane — cotton-lined gusset', '90% seamless micro-nylon, 10% elastane — laser-cut edges', '93% modal, 7% elastane — butter-soft knit'],
    badgePool: ['Seamless', 'Breathable', 'Sweat Control', 'Tag-Free', '4-Way Stretch'],
    items: [
      ['Aria Cotton Brief 3-Pack', 'Economy', 650], ['Vela Seamless Hipster', 'Standard', 850],
      ['Mira High-Waist Brief', 'Standard', 950], ['Opal Bikini Brief 3-Pack', 'Economy', 590],
      ['Luna Soft Boyshort', 'Standard', 890], ['Sylvie Lace-Edge Brief', 'Premium', 1450],
      ['Ember Active Brief', 'Standard', 990], ['Nero Nude-Line Hipster', 'Standard', 920],
      ['Kaira Modal Mini Brief', 'Premium', 1350], ['Pearl Silk-Touch Brief', 'Premium', 1800],
    ],
  },
  {
    slug: 'shapewear', name: 'Shapewear', gender: 'women', sizes: LETTER_XX, care: 'delicate', bundle: 'camisoles-slips',
    desc: 'Light-to-firm smoothing that moves with you — breathable panels, no rolling, no squeezing.',
    blurb: 'Shapewear you can actually breathe in. Zoned compression smooths where you want it and stretches where you do not, with bonded edges that vanish under the closest fits.',
    fabrics: ['72% nylon, 28% elastane — zoned compression knit', '80% breathable power-mesh, 20% elastane — bonded edges', '75% microfibre, 25% elastane — cotton gusset lining'],
    badgePool: ['Support', 'Seamless', 'Breathable', '4-Way Stretch', 'Cooling'],
    items: [
      ['Contour Light Control Brief', 'Economy', 1100], ['Linea High-Waist Shaper', 'Standard', 1900],
      ['SculptEase Mid-Thigh Short', 'Standard', 2100], ['Formelle Smooth Bodysuit', 'Premium', 3900],
      ['Nova Postpartum Support Wrap', 'Standard', 2300], ['Silhouette Camisole Shaper', 'Standard', 1800],
      ['Vale Back-Smoothing Bodysuit', 'Premium', 4200], ['Aero Compression Short', 'Standard', 2200],
      ['Bridal Smooth Slip Shaper', 'Premium', 4500], ['Elite Hourglass Bodysuit', 'Premium', 4400],
    ],
  },
  {
    slug: 'sleepwear-loungewear', name: 'Sleepwear & Loungewear', gender: 'women', sizes: LETTER, care: 'easy', bundle: 'camisoles-slips',
    desc: 'Sleep shirts, pajama sets and robes in cloud-soft knits — made for slow mornings and deep sleep.',
    blurb: 'The hours between evening and morning deserve better fabric. These pieces drape loosely, wash beautifully and feel like the softest thing you own.',
    fabrics: ['100% combed cotton jersey — enzyme-washed for softness', '94% modal, 6% elastane — cool-touch drape', 'Matte satin (96% poly, 4% elastane) — fluid, crease-resistant'],
    badgePool: ['Breathable', 'Cooling', 'Tag-Free', '4-Way Stretch'],
    items: [
      ['Alba Cotton Sleep Shirt', 'Economy', 1200], ['Mila Lounge Pajama Set', 'Standard', 2200],
      ['Satin Calm Camisole Set', 'Premium', 3200], ['Noura Long Nightdress', 'Standard', 2100],
      ['Aura Soft Robe', 'Premium', 3500], ['Lyra Summer Nightie', 'Economy', 1350],
      ['Maison Modal Lounge Set', 'Premium', 3800], ['Silken Bridal Robe Set', 'Premium', 4500],
      ['Cloud Knit Winter Pajama', 'Standard', 2600], ['Elara Slip Nightdress', 'Premium', 3100],
    ],
  },
  {
    slug: 'camisoles-slips', name: 'Camisoles & Slips', gender: 'women', sizes: LETTER, care: 'delicate', bundle: 'panties',
    desc: 'Featherweight layering pieces — camisoles and slips that sit smooth under everything you wear.',
    blurb: 'The quiet layer that makes every outfit work. Adjustable straps, anti-static finishes and hems that stay put from morning to midnight.',
    fabrics: ['100% combed cotton — fine-rib knit', '92% modal, 8% elastane — anti-static finish', 'Matte satin-touch stretch — 94% poly, 6% elastane'],
    badgePool: ['Breathable', 'Seamless', 'Cooling', 'Tag-Free'],
    items: [
      ['Iris Cotton Camisole', 'Economy', 650], ['PureLine Full Slip', 'Economy', 850],
      ['Oriel Spaghetti Cami', 'Economy', 590], ['SmoothBase Long Slip', 'Standard', 1250],
      ['Vale Lace-Edge Camisole', 'Premium', 1800], ['AirSoft Tank Cami', 'Standard', 950],
      ['Satin Layer Cami', 'Premium', 1900], ['Bridal Base Slip', 'Premium', 2400],
      ['Modal Stretch Camisole', 'Standard', 1100], ['Luxe Silk-Touch Long Slip', 'Premium', 2600],
    ],
  },
  {
    slug: 'briefs', name: 'Briefs', gender: 'men', sizes: LETTER_XX, care: 'easy', bundle: 'vests-undershirts',
    desc: 'Classic and modern briefs in combed cotton and modal — support without squeeze, softness that lasts.',
    blurb: 'A proper brief is invisible in wear and obvious in comfort. Contoured pouches, no-roll waistbands and flatlock seams, wash after wash.',
    fabrics: ['95% combed cotton, 5% elastane — pre-shrunk', '92% micro-modal, 8% elastane — silk-hand feel', '85% cotton, 15% cooling poly mesh zones'],
    badgePool: ['Support', 'Breathable', 'Sweat Control', 'Tag-Free', 'Cooling'],
    items: [
      ['Atlas Cotton Brief 3-Pack', 'Economy', 750], ['Aero Support Brief', 'Standard', 950],
      ['Core Full-Cut Brief', 'Economy', 550], ['Terra Daily Brief', 'Economy', 590],
      ['Prime No-Ride Brief', 'Standard', 1150], ['Motion Active Brief', 'Standard', 1250],
      ['Modal Executive Brief', 'Premium', 1700], ['CoolMesh Summer Brief', 'Standard', 1200],
      ['Signature Comfort Brief', 'Premium', 1800], ['Luxe Silk-Touch Brief', 'Premium', 2100],
    ],
  },
  {
    slug: 'boxers', name: 'Boxers', gender: 'men', sizes: LETTER_XX, care: 'easy', bundle: 'vests-undershirts',
    desc: 'Relaxed woven and jersey boxers — airy, easy and cut with room where it matters.',
    blurb: 'From crisp woven checks to lounge-soft jersey, our boxers are cut generously through the leg with covered waistbands and mother-of-pearl-effect buttons.',
    fabrics: ['100% combed cotton poplin — garment washed', '96% cotton, 4% elastane jersey — soft stretch', '100% cotton cambric — feather-light weave'],
    badgePool: ['Breathable', 'Tag-Free', 'Cooling', '4-Way Stretch'],
    items: [
      ['Harbor Cotton Boxer', 'Economy', 650], ['Metro Printed Boxer', 'Economy', 720],
      ['Regent Loose Boxer 3-Pack', 'Standard', 1600], ['Slate Check Boxer', 'Standard', 950],
      ['Lounge Sleep Boxer', 'Economy', 690], ['AirLite Summer Boxer', 'Standard', 1050],
      ['Modal Soft Boxer', 'Premium', 1450], ['Executive Satin Boxer', 'Premium', 1900],
      ['CottonFlex Boxer Brief Hybrid', 'Standard', 1250], ['Premium Gift Boxer Set', 'Premium', 2600],
    ],
  },
  {
    slug: 'trunks', name: 'Trunks', gender: 'men', sizes: LETTER_XX, care: 'easy', bundle: 'vests-undershirts',
    desc: 'The modern middle length — trunks with stay-put legs, contoured support and zero chafe.',
    blurb: 'Shorter than a boxer brief, sharper than a brief. Four-way stretch bodies, no-chafe flat seams and waistbands engineered not to fold.',
    fabrics: ['92% cotton, 8% elastane — four-way stretch', '89% micro-modal, 11% elastane — brushed waistband', '80% cooling nylon, 20% elastane — perfor-mesh panels'],
    badgePool: ['4-Way Stretch', 'Sweat Control', 'Support', 'Cooling', 'Seamless'],
    items: [
      ['Core Cotton Trunk', 'Economy', 690], ['Motion Stretch Trunk', 'Standard', 1150],
      ['Aero Mesh Trunk', 'Standard', 1300], ['Atlas Athletic Trunk', 'Standard', 1250],
      ['Prime No-Chafe Trunk', 'Premium', 1700], ['Modal Smooth Trunk', 'Premium', 1600],
      ['Urban 3-Pack Trunk', 'Standard', 2200], ['CoolTech Performance Trunk', 'Premium', 2100],
      ['Luxe Comfort Trunk', 'Premium', 1950], ['Executive Gift Trunk', 'Premium', 2400],
    ],
  },
  {
    slug: 'vests-undershirts', name: 'Vests & Undershirts', gender: 'men', sizes: LETTER_XX, care: 'easy', bundle: 'briefs',
    desc: 'The Pakistani essential, perfected — rib vests and undershirts in breathable, stay-white cotton.',
    blurb: 'Cut longer to stay tucked, bound at the neck so it never sags, and woven to breathe through peak summer. This is the everyday layer, done properly.',
    fabrics: ['100% combed cotton rib — 220 GSM stay-white knit', '95% cotton, 5% elastane — body-contour fit', '85% cotton, 15% cooling polyester mesh'],
    badgePool: ['Breathable', 'Sweat Control', 'Cooling', 'Tag-Free'],
    items: [
      ['Pure Cotton Rib Vest', 'Economy', 450], ['AirLite Sleeveless Vest', 'Standard', 750],
      ['Core 3-Pack Vest', 'Economy', 1100], ['Formal Half-Sleeve Undershirt', 'Standard', 850],
      ['Cooling Mesh Vest', 'Standard', 950], ['Modal Soft Vest', 'Premium', 1300],
      ['Winter Thermal Vest', 'Standard', 1200], ['Executive Undershirt', 'Premium', 1500],
      ['Compression Support Vest', 'Premium', 1750], ['Luxe Cotton-Silk Vest', 'Premium', 1650],
    ],
  },
  {
    slug: 'thermal-sports', name: 'Thermal & Sports Innerwear', gender: 'men', sizes: WAIST, care: 'thermal', bundle: 'vests-undershirts',
    desc: 'Base layers for Murree winters and match days — brushed thermals and sweat-wicking compressions.',
    blurb: 'Engineered for extremes: brushed-back thermals that trap warmth without bulk, and compression knits that wick sweat from warm-up to cool-down.',
    fabrics: ['88% poly, 12% elastane — brushed thermal backing', '90% micro-poly, 10% elastane — sweat-wicking yarn', '82% nylon, 18% elastane — compression grade knit'],
    badgePool: ['Sweat Control', '4-Way Stretch', 'Breathable', 'Support', 'Quick Dry'],
    items: [
      ['Base Thermal Top', 'Economy', 950], ['Base Thermal Bottom', 'Economy', 900],
      ['Winter Core Thermal Set', 'Standard', 2200], ['Motion Compression Shirt', 'Standard', 1600],
      ['Cricket Compression Short', 'Standard', 1450], ['AllWeather Thermal Top', 'Premium', 2400],
      ['Pro Active Compression Set', 'Premium', 3300], ['ColdShield Thermal Set', 'Premium', 3500],
      ['Performance Layer Vest', 'Standard', 1350], ['Executive Sports Inner Set', 'Premium', 3800],
    ],
  },
];

const pick = (arr, i) => arr[i % arr.length];

function buildCatalog() {
  const categories = CATS.map((c, ci) => ({
    name: c.name, slug: c.slug, gender: c.gender, description: c.desc,
    image: U(pick(POOLS[c.gender === 'women' ? 'w' : 'm'].main, ci), 800),
    sortOrder: ci,
  }));

  const products = [];
  CATS.forEach((c, ci) => {
    const g = c.gender === 'women' ? 'w' : 'm';
    const pool = POOLS[g];
    const colors = c.gender === 'women' ? W_COLORS : M_COLORS;

    c.items.forEach(([name, tier, price], ii) => {
      const badges = [pick(c.badgePool, ii), pick(c.badgePool, ii + 2)].filter((v, i, a) => a.indexOf(v) === i);
      if (tier === 'Premium') badges.push('Silk-Touch');
      if (name.endsWith('3-Pack') || name.includes('3-Pack')) badges.push('Value Pack');

      const fabric = pick(c.fabrics, ii);
      const onSale = (ci + ii) % 5 === 3;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const firstBadge = badges[0].toLowerCase();

      const shortDescription = `${c.desc.split('—')[0].trim()} — this piece brings ${firstBadge} comfort in a refined, stay-true fit.`;
      const description = [
        c.blurb,
        `${name} is finished in ${fabric.split('—')[0].trim()}, with ${badges.join(' and ').toLowerCase()} performance built into the yarn rather than sprayed on top.`,
        TIER_LINE[tier],
        'Pair it with the rest of the HUSHAE edit for a drawer that finally makes sense.',
      ].join(' ');

      products.push({
        name, slug,
        sku: `VL-${c.gender === 'women' ? 'W' : 'M'}${String(ci + 1).padStart(2, '0')}${String(ii + 1).padStart(2, '0')}`,
        gender: c.gender, categorySlug: c.slug, tier, price,
        /* v2 — sale windows: only ~1 in 5 seeded products is on sale, and the
           explicit onSale flag (not compareAtPrice) is what marks it. New
           product launches default to NOT on sale until the merchant opts in. */
        onSale,
        saleStart: null,
        saleEnd: null,
        compareAtPrice: onSale ? Math.round(price * 1.3 / 10) * 10 : null,
        stock: (ci % 3 === 0 && ii === 2) ? 4 : (ci % 4 === 1 && ii === 7) ? 3 : 8 + ((ii * 13 + ci * 7) % 53),
        images: [
          { url: U(pick(pool.main, ci + ii)), alt: `${name} — front view` },
          { url: U(pick(pool.detail, ci * 2 + ii)), alt: `${name} — fabric detail` },
          { url: U(pick(pool.life, ci + ii * 3)), alt: `${name} — styled look` },
          { url: U(pick(pool.detail, ci + ii + 5)), alt: `${name} — close-up texture` },
        ],
        shortDescription, description,
        sizes: c.sizes,
        colors: [pick(colors, ii), pick(colors, ii + 2), pick(colors, ii + 4)]
          .filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i),
        fabric, badges, care: CARE[c.care],
        ratingAvg: Math.min(4.9, 4.2 + ((ii * 7 + ci) % 7) * 0.1),
        ratingCount: 14 + ((ii * 37 + ci * 11) % 210),
        isBestSeller: ii <= 1,
        isFeatured: tier === 'Premium' && (ii === 3 || ii === 9),
        bundleSlug: c.bundle,
      });
    });
  });

  return { categories, products };
}

module.exports = { buildCatalog };
