const express = require('express');
const router = express.Router();
const BusinessPage = require('../models/BusinessPage');
const auth = require('../middleware/auth');

// Business Pages (25 APIs)
router.post('/pages', auth, async (req, res) => {
  try {
    const page = new BusinessPage({ ...req.body, owner: req.user.id });
    await page.save();
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages', auth, async (req, res) => {
  try {
    const pages = await BusinessPage.find({ owner: req.user.id });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:id', async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id);
    page.metrics.pageViews += 1;
    await page.save();
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pages/:id', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pages/:id', auth, async (req, res) => {
  try {
    await BusinessPage.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    res.json({ message: 'Business page deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/follow', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id);
    if (!page.followers.includes(req.user.id)) {
      page.followers.push(req.user.id);
      await page.save();
    }
    res.json({ message: 'Following page', followers: page.followers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/unfollow', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id);
    page.followers = page.followers.filter(f => f.toString() !== req.user.id);
    await page.save();
    res.json({ message: 'Unfollowed page', followers: page.followers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const page = await BusinessPage.findById(req.params.id);
    page.reviews.push({ user: req.user.id, rating, comment });
    page.totalReviews = page.reviews.length;
    page.averageRating = page.reviews.reduce((sum, r) => sum + r.rating, 0) / page.reviews.length;
    await page.save();
    res.json({ message: 'Review added', averageRating: page.averageRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:id/reviews', async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id).populate('reviews.user', 'username avatar');
    res.json(page.reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/products', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $push: { products: req.body } },
      { new: true }
    );
    res.json(page.products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:id/products', async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id);
    res.json(page.products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pages/:id/products/:productId', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOne({ _id: req.params.id, owner: req.user.id });
    const product = page.products.id(req.params.productId);
    Object.assign(product, req.body);
    await page.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pages/:id/products/:productId', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOne({ _id: req.params.id, owner: req.user.id });
    page.products.id(req.params.productId).remove();
    await page.save();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/services', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $push: { services: req.body } },
      { new: true }
    );
    res.json(page.services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:id/services', async (req, res) => {
  try {
    const page = await BusinessPage.findById(req.params.id);
    res.json(page.services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/services/:serviceId/book', auth, async (req, res) => {
  try {
    const { date, time } = req.body;
    res.json({ message: 'Appointment booked', date, time });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pages/:id/analytics', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOne({ _id: req.params.id, owner: req.user.id });
    res.json(page.metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/verify', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { verified: true },
      { new: true }
    );
    res.json({ message: 'Page verified', page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query, category, location } = req.query;
    const filter = {};
    if (query) filter.name = new RegExp(query, 'i');
    if (category) filter.category = category;
    if (location) filter['contact.address.city'] = location;
    const pages = await BusinessPage.find(filter).limit(20);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    const pages = await BusinessPage.find({
      'contact.address.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius) * 1000
        }
      }
    });
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const categories = ['Restaurant', 'Retail', 'Services', 'Healthcare', 'Education', 'Entertainment', 'Technology', 'Real Estate'];
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const pages = await BusinessPage.find().sort('-metrics.pageViews').limit(10);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/hours', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { hours: req.body.hours },
      { new: true }
    );
    res.json(page.hours);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/contact', auth, async (req, res) => {
  try {
    const { message, email, phone } = req.body;
    res.json({ message: 'Contact request sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pages/:id/claim', auth, async (req, res) => {
  try {
    const page = await BusinessPage.findByIdAndUpdate(
      req.params.id,
      { owner: req.user.id },
      { new: true }
    );
    res.json({ message: 'Page claimed', page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
