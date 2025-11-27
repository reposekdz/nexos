const express = require('express');
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const router = express.Router();

// Add reaction to post
router.post('/post/:id', auth, async (req, res) => {
  try {
    const { reactionType } = req.body; // like, love, wow, haha, sad, angry
    const post = await Post.findById(req.params.id);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Initialize reactions array if not exists
    if (!post.reactions) {
      post.reactions = [
        { type: 'like', users: [] },
        { type: 'love', users: [] },
        { type: 'wow', users: [] },
        { type: 'haha', users: [] },
        { type: 'sad', users: [] },
        { type: 'angry', users: [] }
      ];
    }
    
    // Remove user from all reaction types first
    post.reactions.forEach(reaction => {
      reaction.users.pull(req.userId);
    });
    
    // Add user to selected reaction type
    const reactionIndex = post.reactions.findIndex(r => r.type === reactionType);
    if (reactionIndex !== -1) {
      post.reactions[reactionIndex].users.push(req.userId);
    }
    
    await post.save();
    
    // Calculate reaction counts
    const reactionCounts = post.reactions.map(reaction => ({
      type: reaction.type,
      count: reaction.users.length,
      userReacted: reaction.users.includes(req.userId)
    }));
    
    res.json({ reactions: reactionCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove reaction from post
router.delete('/post/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Remove user from all reactions
    if (post.reactions) {
      post.reactions.forEach(reaction => {
        reaction.users.pull(req.userId);
      });
    }
    
    await post.save();
    
    const reactionCounts = post.reactions.map(reaction => ({
      type: reaction.type,
      count: reaction.users.length,
      userReacted: false
    }));
    
    res.json({ reactions: reactionCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get post reactions
router.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('reactions.users', 'username fullName avatar');
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const reactions = post.reactions || [];
    const reactionSummary = reactions.map(reaction => ({
      type: reaction.type,
      count: reaction.users.length,
      users: reaction.users.slice(0, 10) // Limit to first 10 users
    }));
    
    res.json({ reactions: reactionSummary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reaction to comment
router.post('/comment/:postId/:commentId', auth, async (req, res) => {
  try {
    const { reactionType } = req.body;
    const post = await Post.findById(req.params.postId);
    
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    // Initialize reactions if not exists
    if (!comment.reactions) {
      comment.reactions = [
        { type: 'like', users: [] },
        { type: 'love', users: [] },
        { type: 'haha', users: [] }
      ];
    }
    
    // Remove user from all reaction types first
    comment.reactions.forEach(reaction => {
      reaction.users.pull(req.userId);
    });
    
    // Add user to selected reaction type
    const reactionIndex = comment.reactions.findIndex(r => r.type === reactionType);
    if (reactionIndex !== -1) {
      comment.reactions[reactionIndex].users.push(req.userId);
    }
    
    await post.save();
    
    const reactionCounts = comment.reactions.map(reaction => ({
      type: reaction.type,
      count: reaction.users.length,
      userReacted: reaction.users.includes(req.userId)
    }));
    
    res.json({ reactions: reactionCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;