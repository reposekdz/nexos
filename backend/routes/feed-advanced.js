const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Advanced feed (25 APIs)
router.get('/home', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user.id);
    const posts = await Post.find({
      $or: [
        { author: { $in: user.following } },
        { author: req.user.id }
      ]
    })
    .populate('author', 'username avatar isVerified')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const posts = await Post.find({ author: { $in: user.friends || [] } })
      .populate('author', 'username avatar isVerified')
      .sort('-createdAt')
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/groups', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const posts = await Post.find({ group: { $in: user.groups || [] } })
      .populate('author', 'username avatar isVerified')
      .sort('-createdAt')
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/explore', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const posts = await Post.find({
      author: { $nin: [...user.following, req.user.id] },
      visibility: 'public'
    })
    .populate('author', 'username avatar isVerified')
    .sort('-likes -createdAt')
    .limit(30);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const posts = await Post.find({ visibility: 'public' })
      .populate('author', 'username avatar isVerified')
      .sort('-likes -shares -comments')
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', auth, async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;
    const results = {};
    
    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find({
        $or: [
          { content: new RegExp(query, 'i') },
          { tags: new RegExp(query, 'i') }
        ]
      }).populate('author', 'username avatar').limit(10);
    }
    
    if (type === 'all' || type === 'users') {
      results.users = await User.find({
        $or: [
          { username: new RegExp(query, 'i') },
          { fullName: new RegExp(query, 'i') }
        ]
      }).select('username fullName avatar isVerified').limit(10);
    }
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/hashtag/:tag', async (req, res) => {
  try {
    const posts = await Post.find({ tags: req.params.tag })
      .populate('author', 'username avatar isVerified')
      .sort('-createdAt')
      .limit(30);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'savedPosts',
      populate: { path: 'author', select: 'username avatar isVerified' }
    });
    res.json(user.savedPosts || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/filter', auth, async (req, res) => {
  try {
    const { category, dateRange, mediaType } = req.body;
    const filter = {};
    if (category) filter.category = category;
    if (mediaType) filter['media.type'] = mediaType;
    if (dateRange) {
      filter.createdAt = { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) };
    }
    const posts = await Post.find(filter)
      .populate('author', 'username avatar isVerified')
      .sort('-createdAt')
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/recommended', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const posts = await Post.find({
      tags: { $in: user.interests || [] },
      author: { $nin: user.following }
    })
    .populate('author', 'username avatar isVerified')
    .sort('-likes')
    .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
