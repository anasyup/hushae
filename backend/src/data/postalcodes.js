// Pakistan postal code knowledge base (Pakistan Post GPO codes — delivery verification)
// 1) Major cities → primary postal code (hint / one-tap fill)
const CITY_POSTAL = {
  'Lahore': '54000', 'Faisalabad': '38000', 'Rawalpindi': '46000', 'Multan': '60000',
  'Gujranwala': '52250', 'Sialkot': '51310', 'Bahawalpur': '63100', 'Sargodha': '40100',
  'Gujrat': '50700', 'Sheikhupura': '39350', 'Jhang': '35200', 'Kasur': '55050',
  'Rahim Yar Khan': '64200', 'Sahiwal': '57000', 'Okara': '56300', 'Wah Cantt': '47040',
  'Dera Ghazi Khan': '32200', 'Chiniot': '35400', 'Kamoke': '52470', 'Hafizabad': '52110',
  'Khanewal': '58150', 'Muzaffargarh': '34200', 'Attock': '43600', 'Jhelum': '49600',
  'Chakwal': '48800', 'Mianwali': '42200', 'Bhakkar': '30040', 'Layyah': '31200',
  'Vehari': '61100', 'Narowal': '51600', 'Pakpattan': '57400', 'Toba Tek Singh': '36050',
  'Mandi Bahauddin': '50400', 'Khushab': '41000', 'Lodhran': '59320', 'Bahawalnagar': '62300',
  'Rajanpur': '33500', 'Kot Addu': '34050', 'Murree': '47150', 'Taxila': '47080',
  'Burewala': '61010', 'Arifwala': '57450', 'Chishtian': '62350', 'Mian Channu': '58000',
  'Khanpur': '64100', 'Ahmadpur East': '63350', 'Daska': '51010', 'Gojra': '36120',
  'Muridke': '39000', 'Jaranwala': '37250', 'Wazirabad': '52000', 'Pattoki': '55300',
  'Karachi': '74200', 'Hyderabad': '71000', 'Sukkur': '65200', 'Larkana': '77150',
  'Mirpurkhas': '69000', 'Nawabshah': '67450', 'Jacobabad': '79000', 'Shikarpur': '78100',
  'Khairpur': '66020', 'Dadu': '76200', 'Badin': '72200', 'Thatta': '73130',
  'Sanghar': '68100', 'Umerkot': '69100', 'Ghotki': '65110', 'Kotri': '76000',
  'Peshawar': '25000', 'Mardan': '23200', 'Abbottabad': '22010', 'Mingora': '19130',
  'Kohat': '26000', 'Dera Ismail Khan': '29050', 'Bannu': '26100', 'Nowshera': '24100',
  'Charsadda': '24420', 'Swabi': '23430', 'Haripur': '22620', 'Mansehra': '21300',
  'Chitral': '17200', 'Timergara': '18300', 'Buner': '19290', 'Lakki Marwat': '28420',
  'Quetta': '87300', 'Hub': '90250', 'Turbat': '92600', 'Khuzdar': '89100',
  'Chaman': '86100', 'Gwadar': '91200', 'Zhob': '85200', 'Sibi': '82000', 'Loralai': '84700',
  'Gilgit': '15100', 'Skardu': '16100', 'Chilas': '14100', 'Astore': '15050',
  'Muzaffarabad': '13100', 'Mirpur': '10250', 'Rawalakot': '12350', 'Kotli': '11100',
  'Bagh': '12500', 'Bhimber': '10040', 'Islamabad': '44000',
};

// 2) Strict prefix rules for the biggest cities only (codes here are unambiguous)
const STRICT_PREFIX = {
  'Lahore': { prefixes: ['54', '55'], example: '54000' },
  'Karachi': { prefixes: ['74', '75'], example: '74200' },
  'Islamabad': { prefixes: ['44'], example: '44000' },
  'Rawalpindi': { prefixes: ['46'], example: '46000' },
  'Peshawar': { prefixes: ['25'], example: '25000' },
  'Quetta': { prefixes: ['87'], example: '87300' },
  'Multan': { prefixes: ['60'], example: '60000' },
  'Faisalabad': { prefixes: ['38'], example: '38000' },
  'Gujranwala': { prefixes: ['52'], example: '52250' },
  'Sialkot': { prefixes: ['51'], example: '51310' },
  'Hyderabad': { prefixes: ['71'], example: '71000' },
  'Bahawalpur': { prefixes: ['63'], example: '63100' },
  'Sargodha': { prefixes: ['40'], example: '40100' },
  'Abbottabad': { prefixes: ['22'], example: '22010' },
  'Sukkur': { prefixes: ['65'], example: '65200' },
  'Larkana': { prefixes: ['77'], example: '77150' },
};

// 3) Province bands — ONLY unambiguous ranges (a code here can't belong to any other province)
const PROVINCE_BANDS = [
  { min: 10000, max: 13999, provinces: ['Azad Kashmir'] },
  { min: 14000, max: 16999, provinces: ['Gilgit-Baltistan'] },
  { min: 18000, max: 29999, provinces: ['Khyber Pakhtunkhwa'] },
  { min: 44000, max: 45999, provinces: ['Islamabad (ICT)'] },
  { min: 74000, max: 75999, provinces: ['Sindh'] },
  { min: 80000, max: 95999, provinces: ['Balochistan'] },
];

// Full verification → { ok, message?, suggestion? }
function postalCheck(code, province, city) {
  const c = String(code || '').trim();
  if (!/^\d{5}$/.test(c)) {
    return { ok: false, message: 'Incorrect postal code — it must be exactly 5 digits (e.g. 54000)' };
  }
  const n = parseInt(c, 10);
  const band = PROVINCE_BANDS.find((b) => n >= b.min && n <= b.max);
  if (band && band.provinces.length === 1 && band.provinces[0] !== province) {
    return { ok: false, message: `Incorrect — ${c} is a ${band.provinces[0]} postal code. Fix the province or the code` };
  }
  const strict = STRICT_PREFIX[city];
  if (strict && !strict.prefixes.some((p) => c.startsWith(p))) {
    return {
      ok: false,
      message: `Incorrect postal code — ${city}'s code starts with ${strict.prefixes.join(' or ')} (e.g. ${strict.example})`,
      suggestion: strict.example,
    };
  }
  // Known city: typed code must belong to the same regional family (first two digits)
  const hint = CITY_POSTAL[city];
  if (!strict && hint && c.slice(0, 2) !== hint.slice(0, 2)) {
    return {
      ok: false,
      message: `Incorrect postal code — ${city}'s postal code is ${hint}`,
      suggestion: hint,
    };
  }
  return { ok: true };
}

module.exports = { CITY_POSTAL, STRICT_PREFIX, PROVINCE_BANDS, postalCheck };
