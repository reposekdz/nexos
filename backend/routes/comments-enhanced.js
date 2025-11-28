const express = require('express');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Create Comment
router.post('/posts/:postId/comments', auth, async (req, res) => {
  try {
    const { content, parentComment, media, mentions } = req.body;

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let depth = 0;
    let threadPath = req.params.postId;

    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (parent) {
        depth = parent.depth + 1;
        threadPath = parent.threadPath + '/' + parentComment;
      }
    }

    const comment = await Comment.create({
      author: req.user.id,
      post: req.params.postId,
      parentComment,
      content,
      media,
      mentions,
      depth,
      threadPath
    });

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $inc: { repliesCount: 1 }
      });
    }

    await Notification.create({
      recipient: post.author,
      sender: req.user.id,
      type: 'comment',
      title: 'New Comment',
      message: 'commented on your post',
      data: { postId: post._id, commentId: comment._id }
    });

    const populated = await Comment.findById(comment._id)
      .populate('author', 'username fullName avatar isVerified');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Comments for Post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

    const comments = await Comment.find({
      post: req.params.postId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'username fullName avatar isVerified')
      .sort({ [sortBy]: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({
      post: req.params.postId,
      parentComment: null,
      isDeleted: false
    });

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Replies to Comment
router.get('/comments/:commentId/replies', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const replies = await Comment.find({
      parentComment: req.params.commentId,
      isDeleted: false
    })
      .populate('author', 'username fullName avatar isVerified')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit Comment
router.put('/comments/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;

    const comment = await Comment.findOne({
      _id: req.params.id,
      author: req.user.id,
      isDeleted: false
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.editHistory.push({
      content: comment.content,
      editedAt: new Date()
    });

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Comment
router.delete('/comments/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      author: req.user.id
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = '[deleted]';
    await comment.save();

    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $inc: { repliesCount: -1 }
      });
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React to Comment
router.post('/comments/:id/reactions', auth, async (req, res) => {
  try {
    const { type } = req.body;

    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const existingReaction = comment.reactions.find(
      r => r.user.toString() === req.user.id
    );

    if (existingReaction) {
      comment.reactionCounts[existingReaction.type] -= 1;
      comment.reactions = comment.reactions.filter(
        r => r.user.toString() !== req.user.id
      );

      if (existingReaction.type !== type) {
        comment.reactions.push({ user: req.user.id, type });
        comment.reactionCounts[type] += 1;
      }
    } else {
      comment.reactions.push({ user: req.user.id, type });
      comment.reactionCounts[type] += 1;
    }

    await comment.save();

    res.json({ reactionCounts: comment.reactionCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;