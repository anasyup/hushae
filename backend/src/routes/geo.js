const express = require('express');

const router = express.Router();

// Pakistan bounding box — sanity check so a wrong/foreign pin is caught
const PK = { latMin: 23.4, latMax: 37.2, lngMin: 60.4, lngMax: 78.0 };

function extractLatLng(text) {
  if (!text) return null;
  const t = String(text);
  // Covers: "@33.56,73.15", "q=33.56,73.15", "ll=33.56,73.15", !3d33.56!4d73.15, plain "33.56, 73.15"
  const patterns = [
    /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) {
      const lat = parseFloat(m[1]); const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

function validatePK(lat, lng) {
  return lat >= PK.latMin && lat <= PK.latMax && lng >= PK.lngMin && lng <= PK.lngMax;
}

// Public: POST /api/geo/resolve { url } → { lat, lng, mapsLink }
// Handles full Google Maps URLs, plain "lat,lng", and short share links (maps.app.goo.gl / goo.gl/maps)
router.post('/resolve', async (req, res) => {
  const { url = '' } = req.body || {};
  const input = String(url).trim();
  if (!input) return res.status(400).json({ message: 'Google Maps link paste karein' });

  let found = extractLatLng(input);

  // Short link? Follow redirects server-side and parse the final URL / page
  if (!found && /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps|google\.com\/maps|maps\.google)/i.test(input)) {
    try {
      const target = /^https?:\/\//i.test(input) ? input : `https://${input}`;
      const r = await fetch(target, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
      found = extractLatLng(r.url);
      if (!found) {
        const html = await r.text();
        found = extractLatLng(html.slice(0, 600000));
      }
    } catch (e) {
      return res.status(400).json({ message: 'Link open nahi hua — location pin karke share link dobara copy karein' });
    }
  }

  if (!found) {
    return res.status(400).json({ message: 'Is link se location nahi mili — Google Maps mein pin karke "Share" → link copy karke paste karein' });
  }
  if (!validatePK(found.lat, found.lng)) {
    return res.status(400).json({ message: 'Ye location Pakistan mein nahi lagti — pin sahi jagah lagayen' });
  }
  res.json({
    lat: +found.lat.toFixed(6),
    lng: +found.lng.toFixed(6),
    mapsLink: `https://www.google.com/maps?q=${found.lat},${found.lng}`,
  });
});

module.exports = router;
