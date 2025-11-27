const express = require('express');
const Reel = require('../models/Reel');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create reel
router.post('/', auth, upload.single('video'), async (req, res) => {
  try {
    const { caption, hashtags, effects, audio } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Video is required' });
    }

    const reel = new Reel({
      author: req.userId,
      video: req.file.path,
      caption,
      hashtags: hashtags ? hashtags.split(',') : [],
      effects: effects ? effects.split(',') : [],
      audio: audio ? JSON.parse(audio) : undefined
    });

    await reel.save();
    await reel.populate('author', 'username fullName avatar');
    
    res.status(201).json(reel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get reels feed
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const reels = await Reel.find()
      .populate('author', 'username fullName avatar')
      .populate('comments.user', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    res.json(reels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like reel
router.post('/:id/like', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    const isLiked = reel.likes.includes(req.userId);
    if (isLiked) {
      reel.likes.pull(req.userId);
    } else {
      reel.likes.push(req.userId);
    }

    await reel.save();
    res.json({ liked: !isLiked, likesCount: reel.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment to reel
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    reel.comments.push({ user: req.userId, text });
    await reel.save();
    await reel.populate('comments.user', 'username fullName avatar');
    
    res.json(reel.comments[reel.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Increment views
router.post('/:id/view', auth, async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    
    if (!reel) return res.status(404).json({ message: 'Reel not found' });
    
    res.json({ views: reel.views });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;