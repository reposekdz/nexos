const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Create post
router.post('/', auth, upload.array('media', 10), async (req, res) => {
  try {
    const { content, tags, location, visibility } = req.body;
    const media = req.files?.map(file => ({
      type: file.mimetype.startsWith('video') ? 'video' : 'image',
      url: file.path
    })) || [];

    const post = new Post({
      author: req.userId,
      content,
      media,
      tags: tags ? tags.split(',') : [],
      location,
      visibility
    });

    await post.save();
    await post.populate('author', 'username fullName avatar');
    
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get feed posts
router.get('/feed', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const posts = await Post.find({ visibility: 'public' })
      .populate('author', 'username fullName avatar')
      .populate('comments.user', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Like post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isLiked = post.likes.includes(req.userId);
    if (isLiked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.push(req.userId);
    }

    await post.save();
    res.json({ liked: !isLiked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ user: req.userId, text });
    await post.save();
    await post.populate('comments.user', 'username fullName avatar');
    
    res.json(post.comments[post.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share post
router.post('/:id/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.shares.includes(req.userId)) {
      post.shares.push(req.userId);
      await post.save();
    }

    res.json({ sharesCount: post.shares.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;