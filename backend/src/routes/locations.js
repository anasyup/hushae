const express = require('express');
const { LOCATIONS, PROVINCES } = require('../data/locations');

const router = express.Router();

// Public: list of provinces
router.get('/', (req, res) => {
  res.json({ provinces: PROVINCES });
});

// Public: cities of one province → GET /api/locations/Punjab/cities
router.get('/:province/cities', (req, res) => {
  const cities = LOCATIONS[req.params.province];
  if (!cities) return res.status(404).json({ message: 'Province not found' });
  res.json({ province: req.params.province, cities });
});

module.exports = router;
