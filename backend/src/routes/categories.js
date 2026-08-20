const express = require('express');
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, slugify } = require('../utils/helpers');

const router = express.Router();

// Public: active categories, optional ?gender=women|men ?all=1 (admin)
router.get('/', asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400');
  const q = {};
  if (req.query.gender) q.gender = req.query.gender;
  if (req.query.all !== '1') q.isActive = true;
  const cats = await Category.find(q).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ categories: cats });
}));

router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { name, gender, description = '', image = '', sortOrder = 0, slug } = req.body || {};
  if (!name || !gender) return res.status(400).json({ message: 'Name and gender are required' });
  const finalSlug = slugify(slug || name);
  const dup = await Category.findOne({ slug: finalSlug });
  if (dup) return res.status(409).json({ message: 'A category with this slug already exists' });
  const cat = await Category.create({ name, slug: finalSlug, gender, description, image, sortOrder });
  res.status(201).json({ category: cat });
}));

router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  const fields = ['name', 'gender', 'description', 'image', 'sortOrder', 'isActive'];
  fields.forEach((f) => { if (req.body[f] !== undefined) cat[f] = req.body[f]; });
  if (req.body.slug) cat.slug = slugify(req.body.slug);
  await cat.save();
  res.json({ category: cat });
}));

// Soft delete
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json({ category: cat, message: 'Category disabled' });
}));

module.exports = router;
