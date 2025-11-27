const express = require('express');
const Story = require('../models/Story');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create story
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { text, backgroundColor } = req.body;
    
    if (!req.file && !text) {
      return res.status(400).json({ message: 'Story must have media or text' });
    }

    const story = new Story({
      author: req.userId,
      media: req.file ? {
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        url: req.file.path
      } : undefined,
      text,
      backgroundColor
    });

    await story.save();
    await story.populate('author', 'username fullName avatar');
    
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stories
router.get('/', auth, async (req, res) => {
  try {
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 });
    
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// View story
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.views.includes(req.userId)) {
      story.views.push(req.userId);
      await story.save();
    }

    res.json({ viewsCount: story.views.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;