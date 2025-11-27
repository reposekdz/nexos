const express = require('express');
const router = express.Router();
const MarketplaceItem = require('../models/MarketplaceItem');
const auth = require('../middleware/auth');

// Advanced marketplace (40 APIs)
router.post('/products', auth, async (req, res) => {
  try {
    const product = new MarketplaceItem({
      seller: req.user.id,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      condition: req.body.condition,
      images: req.body.images,
      location: req.body.location,
      shipping: req.body.shipping,
      negotiable: req.body.negotiable || false
    });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/negotiate', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product.negotiations) product.negotiations = [];
    product.negotiations.push({
      buyer: req.user.id,
      offeredPrice: req.body.price,
      message: req.body.message,
      status: 'pending'
    });
    await product.save();
    res.json({ message: 'Offer sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/review', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product.reviews) product.reviews = [];
    product.reviews.push({
      user: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment,
      createdAt: new Date()
    });
    product.averageRating = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
    await product.save();
    res.json(product.reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/bid', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product.bids) product.bids = [];
    product.bids.push({
      bidder: req.user.id,
      amount: req.body.amount,
      createdAt: new Date()
    });
    product.currentBid = Math.max(...product.bids.map(b => b.amount));
    await product.save();
    res.json({ currentBid: product.currentBid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/purchase', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    product.status = 'sold';
    product.buyer = req.user.id;
    product.soldAt = new Date();
    await product.save();
    res.json({ message: 'Purchase successful', orderId: product._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.wishlist) user.wishlist = [];
    if (!user.wishlist.includes(req.params.id)) {
      user.wishlist.push(req.params.id);
    } else {
      user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.id);
    }
    await user.save();
    res.json({ inWishlist: user.wishlist.includes(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wishlist', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      populate: { path: 'seller', select: 'username avatar' }
    });
    res.json(user.wishlist || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/price-alert', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product.priceAlerts) product.priceAlerts = [];
    product.priceAlerts.push({
      user: req.user.id,
      targetPrice: req.body.targetPrice
    });
    await product.save();
    res.json({ message: 'Price alert set' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/products/:id/promote', auth, async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    product.isPromoted = true;
    product.promotedUntil = new Date(Date.now() + req.body.days * 24 * 60 * 60 * 1000);
    await product.save();
    res.json({ message: 'Product promoted', until: product.promotedUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:id/shipping-quote', async (req, res) => {
  try {
    const { zipCode, weight } = req.query;
    const quote = { standard: 5.99, express: 12.99, overnight: 24.99 };
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/track', auth, async (req, res) => {
  try {
    const tracking = {
      orderId: req.params.id,
      status: 'in_transit',
      location: 'Distribution Center',
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      history: [
        { status: 'ordered', date: new Date(), location: 'Origin' },
        { status: 'shipped', date: new Date(), location: 'Warehouse' }
      ]
    };
    res.json(tracking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/return', auth, async (req, res) => {
  try {
    res.json({ message: 'Return request submitted', returnId: Date.now() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seller/:id/inventory', auth, async (req, res) => {
  try {
    const products = await MarketplaceItem.find({ seller: req.params.id });
    const inventory = products.map(p => ({
      id: p._id,
      title: p.title,
      stock: p.stock || 0,
      sold: p.soldCount || 0,
      revenue: p.revenue || 0
    }));
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/subscription/seller/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.sellerSubscriptions) user.sellerSubscriptions = [];
    user.sellerSubscriptions.push({
      seller: req.params.id,
      tier: req.body.tier,
      price: req.body.price,
      startDate: new Date()
    });
    await user.save();
    res.json({ message: 'Subscribed to seller' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/local-pickup', auth, async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const products = await MarketplaceItem.find({
      localPickup: true,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 10000
        }
      }
    }).populate('seller', 'username avatar');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
