const express = require('express');
const router = express.Router();
const MarketplaceItem = require('../models/MarketplaceItem');
const auth = require('../middleware/auth');

// Get nearby items (within 6km)
router.get('/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 6000 } = req.query;
    
    const items = await MarketplaceItem.find({
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'available'
    }).populate('seller', 'username avatar isVerified').limit(50);
    
    const itemsWithDistance = items.map(item => {
      const distance = calculateDistance(
        parseFloat(lat), parseFloat(lng),
        item.location.coordinates.coordinates[1],
        item.location.coordinates.coordinates[0]
      );
      return { ...item.toObject(), distance: distance.toFixed(2) };
    });
    
    res.json(itemsWithDistance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get items by category nearby
router.get('/nearby/category/:category', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 6000 } = req.query;
    
    const items = await MarketplaceItem.find({
      category: req.params.category,
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'available'
    }).populate('seller', 'username avatar isVerified');
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search nearby items
router.get('/nearby/search', auth, async (req, res) => {
  try {
    const { lat, lng, query, minPrice, maxPrice, radius = 6000 } = req.query;
    
    const filter = {
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'available'
    };
    
    if (query) {
      filter.$or = [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { tags: new RegExp(query, 'i') }
      ];
    }
    
    if (minPrice) filter.price = { $gte: parseFloat(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };
    
    const items = await MarketplaceItem.find(filter)
      .populate('seller', 'username avatar isVerified')
      .limit(50);
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trending items nearby
router.get('/nearby/trending', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 6000 } = req.query;
    
    const items = await MarketplaceItem.find({
      'location.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius)
        }
      },
      status: 'available'
    })
    .populate('seller', 'username avatar isVerified')
    .sort('-views -likes')
    .limit(20);
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get item details with seller location
router.get('/item/:id/location', auth, async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id)
      .populate('seller', 'username avatar location');
    
    if (req.query.userLat && req.query.userLng) {
      const distance = calculateDistance(
        parseFloat(req.query.userLat), parseFloat(req.query.userLng),
        item.location.coordinates.coordinates[1],
        item.location.coordinates.coordinates[0]
      );
      res.json({ ...item.toObject(), distance: distance.toFixed(2) });
    } else {
      res.json(item);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
