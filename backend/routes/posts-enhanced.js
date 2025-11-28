const express = require('express');
const Post = require('../models/Post');
const PostDraft = require('../models/PostDraft');
const LinkPreview = require('../models/LinkPreview');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');
const router = express.Router();

// Save Post Draft
router.post('/drafts', auth, async (req, res) => {
  try {
    const { content, media, audience, location, feeling, tags } = req.body;
    
    const draft = await PostDraft.create({
      author: req.user.id,
      content,
      media,
      audience,
      location,
      feeling,
      tags,
      autoSavedAt: new Date()
    });

    res.status(201).json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User's Drafts
router.get('/drafts', auth, async (req, res) => {
  try {
    const drafts = await PostDraft.find({ author: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Draft
router.put('/drafts/:id', auth, async (req, res) => {
  try {
    const draft = await PostDraft.findOneAndUpdate(
      { _id: req.params.id, author: req.user.id },
      { ...req.body, autoSavedAt: new Date() },
      { new: true }
    );

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Draft
router.delete('/drafts/:id', auth, async (req, res) => {
  try {
    const draft = await PostDraft.findOneAndDelete({
      _id: req.params.id,
      author: req.user.id
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Publish Draft as Post
router.post('/drafts/:id/publish', auth, async (req, res) => {
  try {
    const draft = await PostDraft.findOne({
      _id: req.params.id,
      author: req.user.id
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const post = await Post.create({
      author: req.user.id,
      content: draft.content,
      media: draft.media,
      audience: draft.audience,
      location: draft.location,
      feeling: draft.feeling,
      tags: draft.tags
    });

    await PostDraft.findByIdAndDelete(draft._id);

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Link Preview
router.post('/link-preview', auth, async (req, res) => {
  try {
    const { url } = req.body;

    const existing = await LinkPreview.findOne({ url });
    if (existing && (Date.now() - existing.lastFetched < 7 * 24 * 60 * 60 * 1000)) {
      existing.fetchCount += 1;
      await existing.save();
      return res.json(existing);
    }

    const linkPreviewService = require('../services/linkPreviewService');
    const preview = await linkPreviewService.fetchPreview(url);

    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;