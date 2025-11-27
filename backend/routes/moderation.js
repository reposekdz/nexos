const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const contentModeration = require('../services/contentModeration');
const auth = require('../middleware/auth');
const router = express.Router();

// Moderate post content
router.post('/post/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const moderation = contentModeration.moderateContent(post.content);
    
    if (!moderation.approved) {
      post.isHidden = true;
      post.moderationFlags = moderation.flags;
      await post.save();
    }

    res.json({ moderation, postId: post._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Report content
router.post('/report', auth, async (req, res) => {
  try {
    const { contentId, contentType, reason, description } = req.body;
    
    const report = {
      reporter: req.userId,
      contentId,
      contentType,
      reason,
      description,
      status: 'pending',
      createdAt: new Date()
    };

    // Store report (would typically be in a separate Reports collection)
    console.log('Content reported:', report);

    res.json({ message: 'Report submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Auto-moderate new content
router.post('/auto-moderate', auth, async (req, res) => {
  try {
    const { content, type } = req.body;
    
    const moderation = contentModeration.moderateContent(content, type);
    
    if (!moderation.approved) {
      const cleanedContent = contentModeration.cleanText(content);
      return res.json({
        approved: false,
        originalContent: content,
        cleanedContent,
        flags: moderation.flags,
        suggestions: moderation.suggestions
      });
    }

    res.json({ approved: true, content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;