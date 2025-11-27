const express = require('express');
const Poll = require('../models/Poll');
const auth = require('../middleware/auth');
const router = express.Router();

// Create poll
router.post('/', auth, async (req, res) => {
  try {
    const { question, options, allowMultipleVotes, expiresAt, visibility } = req.body;
    
    const poll = new Poll({
      author: req.userId,
      question,
      options: options.map(text => ({ text, votes: [] })),
      allowMultipleVotes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      visibility
    });

    await poll.save();
    await poll.populate('author', 'username fullName avatar');
    
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vote on poll
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.id);
    
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isActive) return res.status(400).json({ message: 'Poll is not active' });
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Poll has expired' });
    }
    
    // Check if user already voted
    const hasVoted = poll.options.some(option => option.votes.includes(req.userId));
    
    if (hasVoted && !poll.allowMultipleVotes) {
      return res.status(400).json({ message: 'You have already voted' });
    }
    
    // Remove previous vote if not allowing multiple votes
    if (hasVoted && !poll.allowMultipleVotes) {
      poll.options.forEach(option => {
        option.votes.pull(req.userId);
      });
    }
    
    // Add new vote
    poll.options[optionIndex].votes.push(req.userId);
    
    await poll.save();
    await poll.populate('author', 'username fullName avatar');
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get poll results
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id)
      .populate('author', 'username fullName avatar');
    
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's polls
router.get('/user/:userId', async (req, res) => {
  try {
    const polls = await Poll.find({ author: req.params.userId })
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 });
    
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;