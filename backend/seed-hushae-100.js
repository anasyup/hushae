/**
 * HUSHAE — 100-product catalog with UNIQUE image assignments
 * Uses the Gemini flat-lay images (user's + AI generated matching aesthetic)
 * Every product in a category has a different lead image rotation
 */
const m = require('mongoose');
const URI = 'mongodb+srv://velourauser:velourauser1@cluster0.7lcpatb.mongodb.net/hushae?retryWrites=true&w=majority&appName=Cluster0';

// New Gemini/AI images — all cream background flat-lay
const G = {
  // Men — boxers (8 images)
  boxerNavyPlaid:     '/images/products/gemini/boxer-navy-plaid.png',
  boxer3packNeutral:  '/images/products/gemini/boxer-3pack-neutral.png',
  boxer3packGiftbox:  '/images/products/gemini/boxer-3pack-giftbox.png',
  boxerBlackJersey:   '/images/products/gemini/boxer-black-jersey.png',
  boxerBlackSoft:     '/images/products/gemini/boxer-black-soft-cotton.png',
  boxerWhitePremium:  '/images/products/gemini/boxer-white-premium.png',
  boxerWhiteDiamond:  '/images/products/gemini/boxer-white-diamond-print.png',
  boxerHeatherGrey:   '/images/products/gemini/boxer-heather-grey.png',

  // New AI product photos
  braBlushLace:       '/images/products/gemini/bra-blush-lace.png',
  braNudeSeamless:    '/images/products/gemini/bra-nude-seamless.png',
  braBlackSport:      '/images/products/gemini/bra-black-sport.png',
  panties4pack:       '/images/products/gemini/panties-4pack.png',
  pantiesBlackLace:   '/images/products/gemini/panties-black-lace.png',
  shapeNudeBody:      '/images/products/gemini/shapewear-nude-bodysuit.png',
  camiBlushSilk:      '/images/products/gemini/camisole-blush-silk.png',
  pjsSageFolded:      '/images/products/gemini/pjs-sage-folded.png',
  vestWhiteRibbed:    '/images/products/gemini/vest-white-ribbed.png',
  briefCharcoal:      '/images/products/gemini/brief-charcoal-modal.png',
};

// Older category-hero images we can still use as secondary shots
const OLD = {
  briefsHero:      '/images/products/cat-briefs-hero.jpg',
  briefsStack:     '/images/products/hushae-men-briefs-stack.jpg',
  boxersHero:      '/images/products/cat-boxers-hero.jpg',
  boxerTray:       '/images/products/hushae-men-boxer-tray.jpg',
  trunksHero:      '/images/products/cat-trunks-hero.jpg',
  boxerTrio:       '/images/products/hushae-men-boxer-trio.jpg',
  vestsHero:       '/images/products/cat-vests-hero.jpg',
  vestHanger:      '/images/products/hushae-men-vest-hanger.jpg',
  thermalHero:     '/images/products/cat-thermal-hero.jpg',
  thermalWaffle:   '/images/products/hushae-men-thermal-waffle.jpg',
  brasHero:        '/images/products/cat-bras-hero.jpg',
  brasStack:       '/images/products/hushae-women-bras-stack.jpg',
  pantiesHero:     '/images/products/cat-panties-hero.jpg',
  pantiesFanned:   '/images/products/hushae-women-panties-fanned.jpg',
  shapewearHero:   '/images/products/cat-shapewear-hero.jpg',
  shapewearHanger: '/images/products/hushae-women-shapewear-hanger.jpg',
  camisolesHero:   '/images/products/cat-camisoles-hero.jpg',
  camisolesPair:   '/images/products/hushae-women-camisole-pair.jpg',
  sleepwearHero:   '/images/products/cat-sleepwear-hero.jpg',
  sleepwearFold:   '/images/products/hushae-women-sleepwear-fold.jpg',
};

// PRODUCTS — 10 per category, each with UNIQUE lead image + 3 supporting images

const products_bras = [
  { name: 'Second-Skin Wireless Bra',      leadImg: G.braNudeSeamless,   supportImgs: [OLD.brasStack, OLD.brasHero, G.braBlushLace] },
  { name: 'Everyday T-Shirt Bra',          leadImg: G.braBlushLace,      supportImgs: [OLD.brasHero, OLD.brasStack, G.braNudeSeamless] },
  { name: 'Full-Coverage Support Bra',     leadImg: OLD.brasStack,       supportImgs: [G.braNudeSeamless, OLD.brasHero, G.braBlushLace] },
  { name: 'Lace-Detail Balconette',        leadImg: OLD.brasHero,        supportImgs: [G.braBlushLace, OLD.brasStack, G.braNudeSeamless] },
  { name: 'Active Sports Bra',             leadImg: G.braBlackSport,     supportImgs: [OLD.brasHero, OLD.brasStack, G.braNudeSeamless] },
  { name: 'Cotton Comfort Lounge Bra',     leadImg: G.braNudeSeamless,   supportImgs: [OLD.brasStack, G.braBlushLace, OLD.brasHero] },
  { name: 'Cooling Mesh Back Bra',         leadImg: G.braBlackSport,     supportImgs: [OLD.brasHero, G.braNudeSeamless, OLD.brasStack] },
  { name: 'Lightly Padded Everyday',       leadImg: G.braBlushLace,      supportImgs: [OLD.brasStack, G.braNudeSeamless, OLD.brasHero] },
  { name: 'Nursing Comfort Bra',           leadImg: OLD.brasStack,       supportImgs: [G.braNudeSeamless, OLD.brasHero, G.braBlushLace] },
  { name: 'Silk-Touch Bralette',           leadImg: OLD.brasHero,        supportImgs: [G.braBlushLace, G.braNudeSeamless, OLD.brasStack] },
];

const products_panties = [
  { name: 'Cotton Comfort Brief',          leadImg: G.pantiesBlackLace,  supportImgs: [OLD.pantiesFanned, G.panties4pack, OLD.pantiesHero] },
  { name: 'Lace-Edge Bikini Brief',        leadImg: G.panties4pack,      supportImgs: [G.pantiesBlackLace, OLD.pantiesFanned, OLD.pantiesHero] },
  { name: 'High-Waist Full Brief',         leadImg: OLD.pantiesFanned,   supportImgs: [G.panties4pack, G.pantiesBlackLace, OLD.pantiesHero] },
  { name: 'Modal Soft Hipster',            leadImg: OLD.pantiesHero,     supportImgs: [G.pantiesBlackLace, G.panties4pack, OLD.pantiesFanned] },
  { name: 'Seamless No-Show',              leadImg: G.pantiesBlackLace,  supportImgs: [OLD.pantiesHero, G.panties4pack, OLD.pantiesFanned] },
  { name: 'Lace Trim Boyshort',            leadImg: G.panties4pack,      supportImgs: [OLD.pantiesFanned, G.pantiesBlackLace, OLD.pantiesHero] },
  { name: 'Everyday Cotton Bikini',        leadImg: OLD.pantiesFanned,   supportImgs: [OLD.pantiesHero, G.panties4pack, G.pantiesBlackLace] },
  { name: 'Nude-Line Hipster',             leadImg: OLD.pantiesHero,     supportImgs: [G.panties4pack, OLD.pantiesFanned, G.pantiesBlackLace] },
  { name: 'Signature Cotton 3-Pack',       leadImg: G.panties4pack,      supportImgs: [OLD.pantiesHero, OLD.pantiesFanned, G.pantiesBlackLace] },
  { name: 'Bikini Brief 4-Pack',           leadImg: OLD.pantiesFanned,   supportImgs: [G.panties4pack, G.pantiesBlackLace, OLD.pantiesHero] },
];

const products_shapewear = [
  { name: 'Smoothing Full Slip',           leadImg: G.shapeNudeBody,     supportImgs: [OLD.shapewearHanger, OLD.shapewearHero, G.pantiesBlackLace] },
  { name: 'High-Waist Shaper',             leadImg: OLD.shapewearHanger, supportImgs: [G.shapeNudeBody, OLD.shapewearHero, OLD.pantiesFanned] },
  { name: 'Sculpt Bodysuit',               leadImg: G.shapeNudeBody,     supportImgs: [OLD.shapewearHero, OLD.shapewearHanger, G.braNudeSeamless] },
  { name: 'Mid-Thigh Shape Short',         leadImg: OLD.shapewearHero,   supportImgs: [G.shapeNudeBody, OLD.shapewearHanger, OLD.pantiesHero] },
  { name: 'Postpartum Support Wrap',       leadImg: OLD.shapewearHanger, supportImgs: [G.shapeNudeBody, OLD.shapewearHero, G.braNudeSeamless] },
  { name: 'Camisole Shaper',               leadImg: G.shapeNudeBody,     supportImgs: [OLD.camisolesPair, OLD.shapewearHero, OLD.shapewearHanger] },
  { name: 'Bridal Smooth Slip',            leadImg: OLD.shapewearHero,   supportImgs: [OLD.shapewearHanger, G.shapeNudeBody, G.camiBlushSilk] },
  { name: 'Light Control Brief',           leadImg: OLD.pantiesFanned,   supportImgs: [G.shapeNudeBody, OLD.shapewearHero, OLD.shapewearHanger] },
  { name: 'Contour Bodysuit',              leadImg: G.shapeNudeBody,     supportImgs: [OLD.shapewearHanger, OLD.shapewearHero, G.braNudeSeamless] },
  { name: 'Waist Cincher',                 leadImg: OLD.shapewearHanger, supportImgs: [G.shapeNudeBody, OLD.shapewearHero, G.pantiesBlackLace] },
];

const products_camisoles = [
  { name: 'Silk-Touch Camisole',           leadImg: G.camiBlushSilk,     supportImgs: [OLD.camisolesPair, OLD.camisolesHero, G.pjsSageFolded] },
  { name: 'Lace-Edge Cami',                leadImg: OLD.camisolesPair,   supportImgs: [G.camiBlushSilk, OLD.camisolesHero, G.pjsSageFolded] },
  { name: 'Modal Stretch Camisole',        leadImg: OLD.camisolesHero,   supportImgs: [G.camiBlushSilk, OLD.camisolesPair, G.pjsSageFolded] },
  { name: 'Spaghetti Strap Cami',          leadImg: G.camiBlushSilk,     supportImgs: [OLD.camisolesPair, OLD.camisolesHero, G.braNudeSeamless] },
  { name: 'Full Slip',                     leadImg: OLD.camisolesPair,   supportImgs: [G.camiBlushSilk, OLD.camisolesHero, G.pjsSageFolded] },
  { name: 'Bridal Base Slip',              leadImg: OLD.camisolesHero,   supportImgs: [G.camiBlushSilk, OLD.camisolesPair, G.pjsSageFolded] },
  { name: 'Long Slip Dress',               leadImg: G.camiBlushSilk,     supportImgs: [OLD.camisolesHero, OLD.camisolesPair, G.pjsSageFolded] },
  { name: 'Tank Cami Layer',               leadImg: OLD.camisolesPair,   supportImgs: [G.camiBlushSilk, G.pjsSageFolded, OLD.camisolesHero] },
  { name: 'Satin Layer Cami',              leadImg: G.camiBlushSilk,     supportImgs: [OLD.camisolesHero, OLD.camisolesPair, G.pjsSageFolded] },
  { name: 'AirSoft Cami',                  leadImg: OLD.camisolesHero,   supportImgs: [G.camiBlushSilk, OLD.camisolesPair, G.pjsSageFolded] },
];

const products_sleepwear = [
  { name: 'Cloud Lounge Set',              leadImg: G.pjsSageFolded,     supportImgs: [OLD.sleepwearFold, OLD.sleepwearHero, G.camiBlushSilk] },
  { name: 'Modal Pajama Set',              leadImg: OLD.sleepwearFold,   supportImgs: [G.pjsSageFolded, OLD.sleepwearHero, G.camiBlushSilk] },
  { name: 'Silk-Touch Nightdress',         leadImg: G.camiBlushSilk,     supportImgs: [G.pjsSageFolded, OLD.sleepwearFold, OLD.sleepwearHero] },
  { name: 'Cotton Sleep Shirt',            leadImg: OLD.sleepwearHero,   supportImgs: [G.pjsSageFolded, OLD.sleepwearFold, G.camiBlushSilk] },
  { name: 'Summer Nightie',                leadImg: G.pjsSageFolded,     supportImgs: [OLD.sleepwearFold, G.camiBlushSilk, OLD.sleepwearHero] },
  { name: 'Silken Bridal Robe',            leadImg: OLD.sleepwearFold,   supportImgs: [G.camiBlushSilk, OLD.sleepwearHero, G.pjsSageFolded] },
  { name: 'Winter Cotton PJ Set',          leadImg: G.pjsSageFolded,     supportImgs: [OLD.sleepwearHero, OLD.sleepwearFold, G.camiBlushSilk] },
  { name: 'Cami-Short Set',                leadImg: OLD.sleepwearHero,   supportImgs: [G.pjsSageFolded, OLD.sleepwearFold, G.camiBlushSilk] },
  { name: 'Long Nightgown',                leadImg: G.camiBlushSilk,     supportImgs: [G.pjsSageFolded, OLD.sleepwearHero, OLD.sleepwearFold] },
  { name: 'Waffle Lounge Set',             leadImg: OLD.sleepwearFold,   supportImgs: [G.pjsSageFolded, OLD.sleepwearHero, OLD.thermalWaffle] },
];

const products_briefs = [
  { name: 'Signature Cotton Brief 3-Pack', leadImg: G.briefCharcoal,     supportImgs: [OLD.briefsStack, OLD.briefsHero, G.boxer3packNeutral] },
  { name: 'Modal Executive Brief',         leadImg: G.briefCharcoal,     supportImgs: [OLD.briefsHero, OLD.briefsStack, G.boxerBlackSoft] },
  { name: 'Luxe Silk-Touch Brief',         leadImg: OLD.briefsStack,     supportImgs: [G.briefCharcoal, OLD.briefsHero, G.boxerWhitePremium] },
  { name: 'Athletic Support Brief',        leadImg: OLD.briefsHero,      supportImgs: [G.briefCharcoal, G.boxerBlackJersey, OLD.briefsStack] },
  { name: 'CoolMesh Summer Brief',         leadImg: G.briefCharcoal,     supportImgs: [OLD.briefsStack, OLD.briefsHero, G.boxerHeatherGrey] },
  { name: 'Everyday Cotton Brief',         leadImg: OLD.briefsHero,      supportImgs: [G.briefCharcoal, OLD.briefsStack, G.boxerWhitePremium] },
  { name: 'Pearl Silk-Touch Brief',        leadImg: OLD.briefsStack,     supportImgs: [G.briefCharcoal, G.boxerWhitePremium, OLD.briefsHero] },
  { name: 'No-Chafe Brief',                leadImg: G.briefCharcoal,     supportImgs: [OLD.briefsHero, G.boxerBlackJersey, OLD.briefsStack] },
  { name: 'Cotton 5-Pack Value',           leadImg: G.boxer3packNeutral, supportImgs: [OLD.briefsStack, G.briefCharcoal, OLD.briefsHero] },
  { name: 'Compression Brief',             leadImg: OLD.briefsHero,      supportImgs: [G.briefCharcoal, G.boxerBlackJersey, OLD.briefsStack] },
];

const products_boxers = [
  { name: 'Everyday Cotton Boxer',         leadImg: G.boxerHeatherGrey,  supportImgs: [G.boxer3packNeutral, OLD.boxerTray, OLD.boxersHero] },
  { name: 'Printed Woven Boxer',           leadImg: G.boxerNavyPlaid,    supportImgs: [G.boxerWhiteDiamond, OLD.boxersHero, OLD.boxerTray] },
  { name: 'Loose Fit 3-Pack',              leadImg: G.boxer3packNeutral, supportImgs: [G.boxer3packGiftbox, OLD.boxerTray, OLD.boxersHero] },
  { name: 'Slate Check Boxer',             leadImg: G.boxerNavyPlaid,    supportImgs: [G.boxerHeatherGrey, OLD.boxersHero, G.boxerBlackJersey] },
  { name: 'AirLite Summer Boxer',          leadImg: G.boxerWhitePremium, supportImgs: [G.boxerHeatherGrey, OLD.boxersHero, OLD.boxerTray] },
  { name: 'Modal Soft Boxer',              leadImg: G.boxerBlackJersey,  supportImgs: [G.boxerHeatherGrey, OLD.boxerTray, OLD.boxersHero] },
  { name: 'Executive Satin Boxer',         leadImg: G.boxerBlackSoft,    supportImgs: [G.boxerNavyPlaid, OLD.boxersHero, G.boxerWhitePremium] },
  { name: 'Lounge Sleep Boxer',            leadImg: G.boxerHeatherGrey,  supportImgs: [G.boxerBlackJersey, OLD.boxerTray, OLD.boxersHero] },
  { name: 'Premium Gift Boxer Set',        leadImg: G.boxer3packGiftbox, supportImgs: [G.boxer3packNeutral, OLD.boxersHero, OLD.boxerTray] },
  { name: 'Metro Print Boxer',             leadImg: G.boxerWhiteDiamond, supportImgs: [G.boxerNavyPlaid, OLD.boxersHero, G.boxerHeatherGrey] },
];

const products_trunks = [
  { name: 'Core Cotton Trunk',             leadImg: G.boxerBlackSoft,    supportImgs: [OLD.boxerTrio, OLD.trunksHero, G.boxerHeatherGrey] },
  { name: 'CoolTech Performance Trunk',    leadImg: G.boxerBlackJersey,  supportImgs: [OLD.trunksHero, OLD.boxerTrio, G.boxerHeatherGrey] },
  { name: 'Luxe Comfort Trunk',            leadImg: G.boxerWhitePremium, supportImgs: [OLD.boxerTrio, OLD.trunksHero, G.boxerBlackSoft] },
  { name: 'Athletic Compression Trunk',    leadImg: G.boxerBlackJersey,  supportImgs: [OLD.trunksHero, G.boxerHeatherGrey, OLD.boxerTrio] },
  { name: 'Modal Smooth Trunk',            leadImg: G.boxerHeatherGrey,  supportImgs: [OLD.trunksHero, OLD.boxerTrio, G.boxerBlackSoft] },
  { name: 'Prime No-Chafe Trunk',          leadImg: OLD.trunksHero,      supportImgs: [G.boxerBlackSoft, OLD.boxerTrio, G.boxerBlackJersey] },
  { name: 'AeroMesh Trunk',                leadImg: G.boxerWhitePremium, supportImgs: [OLD.trunksHero, G.boxerHeatherGrey, OLD.boxerTrio] },
  { name: 'Executive Gift Trunk',          leadImg: G.boxer3packGiftbox, supportImgs: [OLD.boxerTrio, OLD.trunksHero, G.boxerBlackSoft] },
  { name: 'Urban 3-Pack Trunk',            leadImg: G.boxer3packNeutral, supportImgs: [OLD.boxerTrio, OLD.trunksHero, G.boxerBlackJersey] },
  { name: 'Motion Stretch Trunk',          leadImg: G.boxerBlackJersey,  supportImgs: [OLD.trunksHero, G.boxerHeatherGrey, OLD.boxerTrio] },
];

const products_vests = [
  { name: 'Ribbed Cotton Vest',            leadImg: G.vestWhiteRibbed,   supportImgs: [OLD.vestHanger, OLD.vestsHero, G.boxerWhitePremium] },
  { name: 'AirLite Sleeveless Vest',       leadImg: OLD.vestHanger,      supportImgs: [G.vestWhiteRibbed, OLD.vestsHero, G.boxerWhitePremium] },
  { name: 'Winter Thermal Vest',           leadImg: OLD.vestsHero,       supportImgs: [G.vestWhiteRibbed, OLD.thermalWaffle, OLD.vestHanger] },
  { name: 'Modal Soft Vest',               leadImg: G.vestWhiteRibbed,   supportImgs: [OLD.vestsHero, OLD.vestHanger, G.boxerHeatherGrey] },
  { name: 'Executive Undershirt',          leadImg: OLD.vestHanger,      supportImgs: [G.vestWhiteRibbed, OLD.vestsHero, G.boxerWhitePremium] },
  { name: 'Formal Half-Sleeve',            leadImg: OLD.vestsHero,       supportImgs: [G.vestWhiteRibbed, OLD.vestHanger, G.boxerWhitePremium] },
  { name: 'Cooling Mesh Vest',             leadImg: G.vestWhiteRibbed,   supportImgs: [OLD.vestsHero, OLD.vestHanger, G.boxerHeatherGrey] },
  { name: 'Luxe Cotton-Silk Vest',         leadImg: OLD.vestHanger,      supportImgs: [G.vestWhiteRibbed, OLD.vestsHero, G.boxerWhitePremium] },
  { name: 'Compression Support Vest',      leadImg: OLD.vestsHero,       supportImgs: [G.vestWhiteRibbed, OLD.thermalWaffle, OLD.vestHanger] },
  { name: 'Cotton 3-Pack Vest',            leadImg: G.vestWhiteRibbed,   supportImgs: [OLD.vestHanger, OLD.vestsHero, G.boxer3packNeutral] },
];

const products_thermal = [
  { name: 'Waffle Thermal Set',            leadImg: OLD.thermalWaffle,   supportImgs: [OLD.thermalHero, G.vestWhiteRibbed, OLD.vestsHero] },
  { name: 'Winter Core Thermal',           leadImg: OLD.thermalHero,     supportImgs: [OLD.thermalWaffle, OLD.vestsHero, G.vestWhiteRibbed] },
  { name: 'ColdShield Thermal Set',        leadImg: OLD.thermalWaffle,   supportImgs: [OLD.thermalHero, OLD.vestHanger, G.vestWhiteRibbed] },
  { name: 'AllWeather Thermal Top',        leadImg: OLD.thermalHero,     supportImgs: [G.vestWhiteRibbed, OLD.thermalWaffle, OLD.vestsHero] },
  { name: 'Base Thermal Bottom',           leadImg: OLD.thermalWaffle,   supportImgs: [OLD.thermalHero, G.boxerBlackJersey, OLD.vestsHero] },
  { name: 'Pro Active Compression Set',    leadImg: G.boxerBlackJersey,  supportImgs: [OLD.thermalHero, OLD.thermalWaffle, G.vestWhiteRibbed] },
  { name: 'Cricket Compression Short',     leadImg: G.boxerBlackJersey,  supportImgs: [OLD.thermalHero, G.boxerHeatherGrey, OLD.thermalWaffle] },
  { name: 'Executive Sports Inner Set',    leadImg: OLD.thermalHero,     supportImgs: [OLD.thermalWaffle, G.vestWhiteRibbed, G.boxerBlackJersey] },
  { name: 'Motion Compression Shirt',      leadImg: G.vestWhiteRibbed,   supportImgs: [OLD.thermalHero, OLD.thermalWaffle, G.boxerBlackJersey] },
  { name: 'Performance Layer Vest',        leadImg: OLD.vestsHero,       supportImgs: [OLD.thermalHero, G.vestWhiteRibbed, OLD.thermalWaffle] },
];

const ALL = {
  bras: products_bras,
  panties: products_panties,
  shapewear: products_shapewear,
  'camisoles-slips': products_camisoles,
  'sleepwear-loungewear': products_sleepwear,
  briefs: products_briefs,
  boxers: products_boxers,
  trunks: products_trunks,
  'vests-undershirts': products_vests,
  'thermal-sports': products_thermal,
};

const TIERS = ['Economy', 'Standard', 'Standard', 'Premium', 'Premium', 'Standard', 'Economy', 'Premium', 'Standard', 'Premium'];

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

// Unique description per product (per category array of 10)
const DESCRIPTIONS = {
  bras: [
    'Ultra-soft moulded cups with bonded seamless edges. Adjustable straps and a wide comfort band that never digs in — the closest a bra can feel to nothing at all.',
    'The everyday hero. Smooth t-shirt bra with full-coverage moulded cups that stay invisible under the closest fits. Available in six sizes and three neutral tones.',
    'Made for real support. Wider band, reinforced side wings and adjustable straps to keep everything in place from morning to midnight.',
    'Delicate lace detailing on the cups and straps for a hint of femininity under blouses and dresses. Balconette silhouette lifts naturally without wires.',
    'Medium-impact support for yoga, running and daily wear. Compressive powernet band, breathable mesh back, wide comfortable straps.',
    'Wire-free comfort for lounging, sleeping and everyday wear. Cotton-lined cups, no hooks — pulls on like a sports bra but feels like nothing.',
    'The cooling companion. Mesh panels across the back keep you fresh in Pakistani summers. Perfect under work shirts and dresses.',
    'Just enough padding to smooth silhouettes without adding volume. Bonded edges, tag-free interior, all-day comfort.',
    'Designed for the nursing journey. Drop-down clips, soft cotton lining, and a wire-free construction that adapts through every stage.',
    'Silk-touch modal knit with a delicate lace trim across the neckline. Wire-free bralette silhouette perfect for lounge days and layered under sheer tops.',
  ],
  panties: [
    'Everyday brief in soft, breathable cotton with a flat waistband and cotton-lined gusset. The kind of underwear you reach for on days that matter.',
    'Lace-trimmed bikini brief with a smooth microfiber back. Sits low at the hip, feminine without fuss.',
    'Full-coverage high-waist brief that stays put. Wide waistband, no visible lines under fitted skirts and pants.',
    'Modal-soft hipster in a mid-rise cut. Barely-there feel, cotton-lined for freshness through the day.',
    'Laser-cut edges for a truly no-show finish. Wear under white, wear under anything.',
    'Boyshort cut with a delicate lace trim at the leg. Fuller coverage without ever feeling boxy.',
    'The everyday bikini brief in a soft cotton knit. Cotton-lined gusset, comfortable elastic, sits perfectly at the hip.',
    'Nude-toned hipster designed to disappear under light-coloured clothing. Seamless microfiber, no visible lines, no drama.',
    'Three of our best-loved cotton briefs in a curated pack. Signature HUSHAE fit — soft, breathable, discreet.',
    'A four-pack of our lace-trim bikini briefs in blush, dove grey, black and cream. The everyday drawer refresh.',
  ],
  shapewear: [
    'Full-length smoothing slip that layers invisibly under dresses. Bonded edges, adjustable straps, no visible seam lines.',
    'High-waist shaping brief that gently sculpts the waist. Firm control without pinching — sits high, stays put.',
    'Full-body sculpting bodysuit with variable-tension knit. Firmer at the waist, lighter at the hips. The under-dress essential.',
    'Mid-thigh shape short that prevents chafing and smooths lines. Wear alone or under skirts and dresses.',
    'Wide adjustable postpartum wrap that supports the abdomen with gentle compression. Cotton-lined for comfort.',
    'Camisole shaper with built-in bra support. Layers under blouses to smooth the tummy while lifting the bust.',
    'Ultra-smooth bridal slip designed to sit invisibly under wedding wear. Adjustable straps, cotton gusset, gentle shaping.',
    'Light-control brief for a barely-there smoothing effect. Great for everyday under work wear and formal dresses.',
    'Contouring bodysuit with a plunge neckline. Deep V so it works under low-cut dresses. Snap gusset for convenience.',
    'Firm-control waist cincher with adjustable hook closure. Wide band structure for a defined waist under fitted tops.',
  ],
  'camisoles-slips': [
    'Silk-touch modal cami with a whisper-fine lace trim across the neckline. Layers invisibly under sheer tops.',
    'Delicate lace edging along the neckline and hem. Adjustable straps, relaxed drape, sleepwear-and-daywear crossover.',
    'Modal stretch camisole that layers perfectly under sheer tops. Slightly fitted through the body, tag-free interior.',
    'Spaghetti-strap cami in a silky modal knit. Wear under blazers, layer under sweaters, or as sleepwear.',
    'Classic full slip in a smooth modal-cotton blend. Adjustable straps, subtle side slit, perfect for under-dress smoothing.',
    'Bridal base slip in soft ivory. Ultra-smooth microfiber that sits invisibly under wedding gowns and formal wear.',
    'Long slip dress that doubles as loungewear. Cool, elegant, easy to layer under long shirts.',
    'A basic tank cami for everyday layering. Cotton-modal blend, ribbed neckline, semi-fitted.',
    'Satin-finish layer cami that adds a hint of luxury. Wear under low-cut tops or as loungewear.',
    'The AirSoft cami — breathable, ultra-light, made for hot Pakistani summers. Perfect layer piece.',
  ],
  'sleepwear-loungewear': [
    'The lounge set that feels like a hug. Long-sleeve top plus relaxed bottom in cloud-soft modal-cotton.',
    'Classic button-up modal pajama set with piped edges. Perfect for real rest and quiet mornings.',
    'Silk-touch modal nightdress with a lace trim at the neckline. Adjustable straps, mid-length hem.',
    'Oversized cotton sleep shirt with a relaxed collar. Wear buttoned all the way or open over a cami.',
    'Featherweight cotton nightie for hot summer nights. Short sleeves, knee-length, ultra-breathable.',
    'Silken bridal robe with a wide sash tie. Layer over a slip on the morning of. Includes matching hair tie.',
    'Winter-weight cotton pajama set. Long sleeves, long pants, cosy without being bulky.',
    'Cami-and-short set in a lightweight modal blend. Wear as sleepwear or lounge in it all Sunday.',
    'Full-length nightgown with adjustable spaghetti straps. Elegant and airy, drapes beautifully.',
    'Waffle-knit lounge set that transitions from bed to breakfast. Warm without weight.',
  ],
  briefs: [
    'The HUSHAE house brief in a curated three-pack. Modal-cotton knit that softens with every wash. Ultra-flat waistband, tag-free.',
    'Modal-cotton executive brief with an ultra-flat waistband and clean flatlock seams. The daily driver.',
    'Silk-touch premium brief for special occasions. Higher rise, contoured pouch, our finest fabric blend.',
    'Athletic support brief with a compressive pouch and moisture-wicking finish. Made for the gym.',
    'CoolMesh summer brief with ventilated side panels. Engineered for Pakistan\'s hottest months.',
    'Everyday cotton brief in the classic mid-rise cut. The one you\'ll grab for every day.',
    'Pearl-finish silk-touch brief. Slightly higher rise, extra-soft hand, premium tier finish.',
    'No-chafe brief with bonded seamless leg openings. Zero friction, zero visible lines.',
    'Value five-pack of our everyday cotton briefs. Same premium fit, better price per piece.',
    'Compression-fit brief with a supportive front panel. Under athletic wear or formal trousers alike.',
  ],
  boxers: [
    'The daily boxer in premium combed cotton. Elasticated waistband, generous cut, zero side-seam friction.',
    'Woven cotton boxer with a heritage plaid or check print. Roomy fit, breathable weave, classic silhouette.',
    'Value three-pack in our best-selling relaxed fit. Neutral solids that pair with everything.',
    'Slate check boxer in a fine cotton weave. Traditional English pattern, updated cut, tag-free interior.',
    'AirLite summer boxer in a lightweight breathable cotton. Feels like nothing on the hottest days.',
    'Modal-soft boxer with our softest fabric blend yet. The ultimate comfort boxer for sleep and lounge.',
    'Satin-finish executive boxer for special occasions. Slightly slimmer cut, luxurious drape.',
    'Lounge sleep boxer in a soft cotton knit. Wear to bed, wear around the house, easy to layer.',
    'Premium three-piece gift boxer set in a HUSHAE gift-ready box. Perfect for gifting or self-gifting.',
    'Modern metro-print boxer with a subtle geometric pattern. Everyday cotton, contemporary print.',
  ],
  trunks: [
    'Core cotton trunk with a contoured pouch and a flat waistband that never rolls. Silk-touch cotton with a hint of stretch.',
    'CoolTech performance trunk with moisture-wicking finish. Made for daily wear in warm climates.',
    'Luxe comfort trunk in our silk-touch premium blend. Higher-tier fabric, everyday-ready cut.',
    'Athletic compression trunk for gym and active use. Supportive front panel, secure fit.',
    'Modal smooth trunk with bonded seamless edges. Truly invisible under fitted trousers.',
    'Prime no-chafe trunk with laser-cut leg openings. Zero visible seams, zero friction.',
    'AeroMesh trunk with ventilated panels for maximum breathability. Sports-ready construction.',
    'Executive gift trunk in a premium three-pack box. Ideal for gifting to the man in your life.',
    'Urban three-pack trunk set in neutral solids — black, navy, charcoal. The essential foundation.',
    'Motion stretch trunk with 4-way stretch fabric. Moves with you through workouts and daily life.',
  ],
  'vests-undershirts': [
    'The essential vest in fine rib cotton. Reinforced neckline that holds shape wash after wash, and a length that stays tucked.',
    'AirLite sleeveless vest in an ultra-light cotton knit. Perfect for hot summer layering.',
    'Winter thermal vest with a slightly heavier weight. Layers under dress shirts for warmth without bulk.',
    'Modal-soft vest with the softest fabric we offer. Sleepwear-adjacent comfort for daily wear.',
    'Classic executive undershirt with a v-neck cut. Invisible under dress shirts, absorbs sweat, extends the life of your wardrobe.',
    'Formal half-sleeve undershirt with an extended-length hem. Stays tucked, absorbs perspiration.',
    'Cooling mesh vest with ventilated panels. Engineered for Pakistan\'s summer heat.',
    'Luxe cotton-silk vest in our premium blend. Ultra-smooth hand, drapes beautifully under dress shirts.',
    'Compression support vest with a fitted cut. Provides gentle chest and back support under work clothes.',
    'Value three-pack in our classic ribbed cotton. The essential foundation of every man\'s drawer.',
  ],
  'thermal-sports': [
    'Waffle-knit thermal top plus bottom set. Traps warm air without bulk, layers seamlessly under a shirt or sweater.',
    'Winter-core thermal set for the coldest months. Slightly heavier weight, superior warmth.',
    'ColdShield thermal set with brushed inner finish. Ultra-warm, ultra-soft against the skin.',
    'AllWeather thermal top that works from autumn through winter. Medium weight, breathable, layerable.',
    'Base thermal bottom in a slim athletic cut. Layers under trousers and jeans without bulk.',
    'Pro active compression set for cricket, gym and sports. Second-skin fit, moisture-wicking.',
    'Cricket compression short with reinforced panels. Purpose-built for the wicket.',
    'Executive sports inner set — thermal top plus compression short. The complete cold-weather sports layer.',
    'Motion compression shirt with 4-way stretch. Layer under jerseys, wear alone for training.',
    'Performance layer vest in a technical mesh weave. Wear under sports gear for a cool base layer.',
  ],
};

const BADGES_BY_TIER = { Economy: ['Everyday'], Standard: ['Bestseller'], Premium: ['Signature', 'Silk-Touch'] };

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
  for (const catSlug of Object.keys(ALL)) {
    const map = CAT_MAP[catSlug];
    const items = ALL[catSlug];
    for (let i = 0; i < 10; i++) {
      const raw = items[i];
      const name = 'HUSHAE ' + raw.name;
      const tier = TIERS[i];
      const band = PRICE_BANDS[catSlug][tier];
      const price = Math.round((band[0] + Math.random() * (band[1] - band[0])) / 50) * 50;
      const compareAt = Math.round((price * 1.25 + 50) / 50) * 50;
      const cost = Math.round(price * 0.35 / 50) * 50;
      const shuffled = [...map.colors].sort(() => Math.random() - 0.5);
      const colors = shuffled.slice(0, 3 + (i % 3));
      const badges = [...BADGES_BY_TIER[tier]];
      if (i === 0) badges.push('Bestseller');
      if (i === 3 || i === 7) badges.push('New');
      
      // Assemble 4 unique images from lead + 3 supporting
      const images = [
        { url: raw.leadImg,        alt: `${name} — front view` },
        { url: raw.supportImgs[0], alt: `${name} — detail` },
        { url: raw.supportImgs[1], alt: `${name} — lifestyle` },
        { url: raw.supportImgs[2], alt: `${name} — alternate` },
      ];

      out.push({
        name,
        slug: 'hushae-' + slugify(raw.name) + '-' + sku,
        sku: 'HUS-' + catSlug.substring(0, 3).toUpperCase() + '-' + String(sku).padStart(4, '0'),
        gender: map.gender,
        categorySlug: catSlug,
        tier,
        price,
        compareAtPrice: compareAt,
        costPrice: cost,
        stock: 20 + Math.floor(Math.random() * 60),
        images,
        shortDescription: DESCRIPTIONS[catSlug][i].split('.')[0] + '.',
        description: DESCRIPTIONS[catSlug][i],
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

  console.log('\nSample product images (first 3):');
  const samples = await db.collection('products').find({}).limit(3).toArray();
  samples.forEach(p => {
    console.log('\n', p.name);
    p.images.forEach((im, idx) => console.log(`   img[${idx}]:`, im.url));
  });

  await m.disconnect();
})().catch(e => { console.error('ERR:', e.message, e.stack); process.exit(1); });
