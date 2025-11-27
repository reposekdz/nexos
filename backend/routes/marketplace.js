const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create marketplace item
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, currency, category, condition, location, tags } = req.body;
    
    const item = new MarketplaceItem({
      seller: req.userId,
      title,
      description,
      price: parseFloat(price),
      currency,
      category,
      condition,
      location,
      images: req.files?.map(file => file.path) || [],
      tags: tags ? tags.split(',') : []
    });

    await item.save();
    await item.populate('seller', 'username fullName avatar');
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get marketplace items
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, condition, location } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    let query = { isAvailable: true };
    
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (condition) query.condition = condition;
    if (location) query.location = { $regex: location, $options: 'i' };
    
    const items = await MarketplaceItem.find(query)
      .populate('seller', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'username fullName avatar');
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like item
router.post('/:id/like', auth, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const isLiked = item.likes.includes(req.userId);
    if (isLiked) {
      item.likes.pull(req.userId);
    } else {
      item.likes.push(req.userId);
    }

    await item.save();
    res.json({ liked: !isLiked, likesCount: item.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update item availability
router.put('/:id/availability', auth, async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const item = await MarketplaceItem.findOneAndUpdate(
      { _id: req.params.id, seller: req.userId },
      { isAvailable },
      { new: true }
    );
    
    if (!item) return res.status(404).json({ message: 'Item not found or unauthorized' });
    
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's items
router.get('/user/my-items', auth, async (req, res) => {
  try {
    const items = await MarketplaceItem.find({ seller: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;