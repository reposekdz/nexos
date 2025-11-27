const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Story = require('../models/Story');
const Reel = require('../models/Reel');
const { createNotification } = require('./notifications');
const auth = require('../middleware/auth');

// Like post
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post.likes.includes(req.user.id)) {
      post.likes.push(req.user.id);
      await post.save();
      
      if (post.author._id.toString() !== req.user.id) {
        await createNotification({
          recipient: post.author._id,
          sender: req.user.id,
          type: 'like',
          contentId: post._id,
          contentType: 'post',
          message: `liked your post`
        });
        global.io?.to(post.author._id.toString()).emit('post-liked', { postId: post._id, userId: req.user.id });
      }
    } else {
      post.likes = post.likes.filter(l => l.toString() !== req.user.id);
      await post.save();
    }
    res.json({ likes: post.likes.length, isLiked: post.likes.includes(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share post
router.post('/posts/:id/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    if (!post.shares.includes(req.user.id)) {
      post.shares.push(req.user.id);
      await post.save();
      
      if (post.author._id.toString() !== req.user.id) {
        await createNotification({
          recipient: post.author._id,
          sender: req.user.id,
          type: 'share',
          contentId: post._id,
          contentType: 'post',
          message: `shared your post`
        });
      }
    }
    res.json({ shares: post.shares.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comment on post
router.post('/posts/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username');
    const comment = { user: req.user.id, text: req.body.text, createdAt: new Date() };
    post.comments.push(comment);
    await post.save();
    
    if (post.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: post.author._id,
        sender: req.user.id,
        type: 'comment',
        contentId: post._id,
        contentType: 'post',
        message: `commented on your post: "${req.body.text.substring(0, 50)}"`
      });
      global.io?.to(post.author._id.toString()).emit('new-comment', { postId: post._id, comment });
    }
    
    res.json({ comment, total: post.comments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like story
router.post('/stories/:id/like', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('author', 'username');
    if (!story.likes) story.likes = [];
    if (!story.likes.includes(req.user.id)) {
      story.likes.push(req.user.id);
      await story.save();
      
      if (story.author._id.toString() !== req.user.id) {
        await createNotification({
          recipient: story.author._id,
          sender: req.user.id,
          type: 'like',
          contentId: story._id,
          contentType: 'story',
          message: `liked your story`
        });
      }
    }
    res.json({ likes: story.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like reel
router.post('/reels/:id/like', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('author', 'username');
    if (!reel.likes.includes(req.user.id)) {
      reel.likes.push(req.user.id);
      await reel.save();
      
      if (reel.author._id.toString() !== req.user.id) {
        await createNotification({
          recipient: reel.author._id,
          sender: req.user.id,
          type: 'like',
          contentId: reel._id,
          contentType: 'reel',
          message: `liked your reel`
        });
      }
    } else {
      reel.likes = reel.likes.filter(l => l.toString() !== req.user.id);
      await reel.save();
    }
    res.json({ likes: reel.likes.length, isLiked: reel.likes.includes(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Comment on reel
router.post('/reels/:id/comment', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('author', 'username');
    const comment = { user: req.user.id, text: req.body.text, createdAt: new Date() };
    reel.comments.push(comment);
    await reel.save();
    
    if (reel.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: reel.author._id,
        sender: req.user.id,
        type: 'comment',
        contentId: reel._id,
        contentType: 'reel',
        message: `commented on your reel`
      });
    }
    
    res.json({ comment, total: reel.comments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save post
router.post('/posts/:id/save', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.savedPosts) user.savedPosts = [];
    if (!user.savedPosts.includes(req.params.id)) {
      user.savedPosts.push(req.params.id);
    } else {
      user.savedPosts = user.savedPosts.filter(p => p.toString() !== req.params.id);
    }
    await user.save();
    res.json({ saved: user.savedPosts.includes(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
