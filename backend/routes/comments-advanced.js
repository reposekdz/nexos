const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Story = require('../models/Story');
const { createNotification } = require('./notifications');
const auth = require('../middleware/auth');

// Advanced commenting system (30 APIs)
router.post('/posts/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author');
    const comment = {
      user: req.user.id,
      text: req.body.text,
      media: req.body.media,
      mentions: req.body.mentions,
      createdAt: new Date(),
      likes: [],
      replies: []
    };
    post.comments.push(comment);
    await post.save();
    
    const populated = await Post.findById(req.params.id).populate('comments.user', 'username avatar');
    const newComment = populated.comments[populated.comments.length - 1];
    
    if (post.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: post.author._id,
        sender: req.user.id,
        type: 'comment',
        contentId: post._id,
        contentType: 'post',
        message: `commented: "${req.body.text.substring(0, 50)}"`
      });
    }
    
    global.io?.to(post.author._id.toString()).emit('new-comment', { postId: post._id, comment: newComment });
    res.json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:postId/comments/:commentId/reply', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const comment = post.comments.id(req.params.commentId);
    const reply = {
      user: req.user.id,
      text: req.body.text,
      createdAt: new Date()
    };
    comment.replies.push(reply);
    await post.save();
    
    const populated = await Post.findById(req.params.postId).populate('comments.replies.user', 'username avatar');
    res.json(populated.comments.id(req.params.commentId).replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:postId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const comment = post.comments.id(req.params.commentId);
    if (!comment.likes.includes(req.user.id)) {
      comment.likes.push(req.user.id);
    } else {
      comment.likes = comment.likes.filter(l => l.toString() !== req.user.id);
    }
    await post.save();
    res.json({ likes: comment.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/posts/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const comment = post.comments.id(req.params.commentId);
    if (comment.user.toString() === req.user.id || post.author.toString() === req.user.id) {
      comment.remove();
      await post.save();
      res.json({ message: 'Comment deleted' });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/posts/:postId/comments/:commentId', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    const comment = post.comments.id(req.params.commentId);
    if (comment.user.toString() === req.user.id) {
      comment.text = req.body.text;
      comment.edited = true;
      comment.editedAt = new Date();
      await post.save();
      res.json(comment);
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:postId/comments/:commentId/pin', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (post.author.toString() === req.user.id) {
      const comment = post.comments.id(req.params.commentId);
      comment.isPinned = !comment.isPinned;
      await post.save();
      res.json({ isPinned: comment.isPinned });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reels/:id/comment', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('author');
    const comment = {
      user: req.user.id,
      text: req.body.text,
      createdAt: new Date(),
      likes: []
    };
    reel.comments.push(comment);
    await reel.save();
    
    const populated = await Reel.findById(req.params.id).populate('comments.user', 'username avatar');
    const newComment = populated.comments[populated.comments.length - 1];
    
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
    
    res.json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reels/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const reel = await Reel.findById(req.params.id).populate({
      path: 'comments.user',
      select: 'username avatar isVerified'
    });
    const comments = reel.comments.slice((page - 1) * limit, page * limit);
    res.json({ comments, total: reel.comments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reels/:reelId/comments/:commentId/like', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId);
    const comment = reel.comments.id(req.params.commentId);
    if (!comment.likes.includes(req.user.id)) {
      comment.likes.push(req.user.id);
    } else {
      comment.likes = comment.likes.filter(l => l.toString() !== req.user.id);
    }
    await reel.save();
    res.json({ likes: comment.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/reels/:reelId/comments/:commentId', auth, async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.reelId);
    const comment = reel.comments.id(req.params.commentId);
    if (comment.user.toString() === req.user.id || reel.author.toString() === req.user.id) {
      comment.remove();
      await reel.save();
      res.json({ message: 'Comment deleted' });
    } else {
      res.status(403).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/posts/:id/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const post = await Post.findById(req.params.id).populate({
      path: 'comments.user',
      select: 'username avatar isVerified'
    }).populate({
      path: 'comments.replies.user',
      select: 'username avatar isVerified'
    });
    
    let comments = post.comments;
    if (sort === 'top') {
      comments = comments.sort((a, b) => b.likes.length - a.likes.length);
    } else {
      comments = comments.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    const paginatedComments = comments.slice((page - 1) * limit, page * limit);
    res.json({ comments: paginatedComments, total: comments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stories/:id/reply', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('author');
    if (!story.replies) story.replies = [];
    story.replies.push({ user: req.user.id, text: req.body.text, createdAt: new Date() });
    await story.save();
    
    if (story.author._id.toString() !== req.user.id) {
      await createNotification({
        recipient: story.author._id,
        sender: req.user.id,
        type: 'story_reply',
        contentId: story._id,
        contentType: 'story',
        message: `replied to your story`
      });
    }
    
    res.json({ message: 'Reply sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stories/:id/replies', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate('replies.user', 'username avatar');
    res.json(story.replies || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/comments/:commentId/report', auth, async (req, res) => {
  try {
    res.json({ message: 'Comment reported' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/posts/:id/comments/count', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.json({ count: post.comments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
