const express = require('express');
const { LOCATIONS, PROVINCES } = require('../data/locations');
const { CITY_POSTAL, postalCheck } = require('../data/postalcodes');

const router = express.Router();

// Public: list of provinces
router.get('/', (req, res) => {
  res.json({ provinces: PROVINCES });
});

// Public: postal code hint for a city → GET /api/locations/postal-hint/Lahore
router.get('/postal-hint/:city', (req, res) => {
  const code = CITY_POSTAL[req.params.city];
  if (!code) return res.status(404).json({ message: 'No hint for this city' });
  res.json({ city: req.params.city, code });
});

// Public: verify postal code against province + city
router.post('/postal-check', (req, res) => {
  const { postalCode = '', province = '', city = '' } = req.body || {};
  const r = postalCheck(postalCode, province, city);
  res.json(r);
});

// Public: cities of one province → GET /api/locations/Punjab/cities
router.get('/:province/cities', (req, res) => {
  const cities = LOCATIONS[req.params.province];
  if (!cities) return res.status(404).json({ message: 'Province not found' });
  res.json({ province: req.params.province, cities });
});

module.exports = router;
