const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Get trending hashtags
router.get('/trending', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;
    
    let dateFilter = new Date();
    switch (timeframe) {
      case '1h': dateFilter.setHours(dateFilter.getHours() - 1); break;
      case '24h': dateFilter.setDate(dateFilter.getDate() - 1); break;
      case '7d': dateFilter.setDate(dateFilter.getDate() - 7); break;
      default: dateFilter.setDate(dateFilter.getDate() - 1);
    }
    
    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { hashtag: '$_id', count: 1, _id: 0 } }
    ]);
    
    res.json(trending);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search hashtags
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    const hashtags = await Post.aggregate([
      { $unwind: '$tags' },
      { $match: { tags: { $regex: q, $options: 'i' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { hashtag: '$_id', count: 1, _id: 0 } }
    ]);
    
    res.json(hashtags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get posts by hashtag
router.get('/:hashtag/posts', async (req, res) => {
  try {
    const { hashtag } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const posts = await Post.find({ tags: hashtag })
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;