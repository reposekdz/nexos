const express = require('express');
const {
  LiveStream,
  StreamViewer,
  StreamChat,
  StreamPoll,
  StreamAnalytics,
  StreamHighlight,
  StreamModeration
} = require('../models/LiveStreaming');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/streams', auth, async (req, res) => {
  try {
    const stream = new LiveStream({
      streamId: `LIVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      streamer: req.userId,
      streaming: {
        ...req.body.streaming,
        rtmpUrl: `rtmp://stream.nexos.com/live`,
        streamKey: `sk_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
        playbackUrl: `https://stream.nexos.com/live/${req.userId}/${Date.now()}`
      }
    });
    
    await stream.save();
    
    res.status(201).json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/streams', auth, async (req, res) => {
  try {
    const { status, category, visibility } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {};
    
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (visibility) filter.visibility = visibility;
    
    const streams = await LiveStream.find(filter)
      .sort({ 'viewers.current': -1, actualStart: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('streamer', 'name avatar verified');
    
    const total = await LiveStream.countDocuments(filter);
    
    res.json({
      streams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/streams/my', auth, async (req, res) => {
  try {
    const streams = await LiveStream.find({ streamer: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(streams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/streams/:id', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
      .populate('streamer', 'name avatar verified followers');
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.visibility === 'private' && stream.streamer._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/streams/:id', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    Object.assign(stream, req.body);
    await stream.save();
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streams/:id/start', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    stream.status = 'live';
    stream.actualStart = new Date();
    await stream.save();
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streams/:id/end', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    stream.status = 'ended';
    stream.endedAt = new Date();
    stream.duration = Math.floor((stream.endedAt - stream.actualStart) / 1000);
    await stream.save();
    
    const analytics = new StreamAnalytics({
      stream: stream._id,
      streamer: req.userId,
      metrics: {
        peakViewers: stream.viewers.peak,
        totalViewers: stream.viewers.total,
        uniqueViewers: stream.viewers.unique,
        avgWatchTime: 0,
        totalWatchTime: 0,
        chatMessages: stream.engagement.comments,
        likes: stream.engagement.likes,
        shares: stream.engagement.shares,
        superChats: stream.engagement.superChats,
        donations: stream.engagement.donations
      }
    });
    
    await analytics.save();
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streams/:id/join', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    const existingViewer = await StreamViewer.findOne({
      stream: stream._id,
      viewer: req.userId
    });
    
    if (!existingViewer) {
      const viewer = new StreamViewer({
        stream: stream._id,
        viewer: req.userId,
        joinedAt: new Date()
      });
      await viewer.save();
      
      stream.viewers.current += 1;
      stream.viewers.total += 1;
      stream.viewers.unique += 1;
      
      if (stream.viewers.current > stream.viewers.peak) {
        stream.viewers.peak = stream.viewers.current;
      }
      
      await stream.save();
    }
    
    res.json({ streamKey: stream.streaming.playbackUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streams/:id/leave', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    const viewer = await StreamViewer.findOne({
      stream: stream._id,
      viewer: req.userId
    });
    
    if (viewer && !viewer.leftAt) {
      viewer.leftAt = new Date();
      viewer.watchTime = Math.floor((viewer.leftAt - viewer.joinedAt) / 1000);
      await viewer.save();
      
      stream.viewers.current = Math.max(0, stream.viewers.current - 1);
      await stream.save();
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/streams/:id/like', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    stream.engagement.likes += 1;
    await stream.save();
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/chat', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.body.streamId);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (!stream.features.chat) {
      return res.status(403).json({ message: 'Chat is disabled' });
    }
    
    const chat = new StreamChat({
      stream: req.body.streamId,
      user: req.userId,
      message: req.body.message,
      isSuperChat: req.body.isSuperChat || false,
      superChatAmount: req.body.superChatAmount,
      superChatCurrency: req.body.superChatCurrency
    });
    
    await chat.save();
    
    stream.engagement.comments += 1;
    if (chat.isSuperChat) {
      stream.engagement.superChats += 1;
    }
    await stream.save();
    
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/chat/:streamId', auth, async (req, res) => {
  try {
    const { before } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    
    const filter = { stream: req.params.streamId, deleted: false };
    
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await StreamChat.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'name avatar verified');
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/chat/:id', auth, async (req, res) => {
  try {
    const chat = await StreamChat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (chat.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    chat.deleted = true;
    await chat.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/chat/:id/pin', auth, async (req, res) => {
  try {
    const chat = await StreamChat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    const stream = await LiveStream.findById(chat.stream);
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    chat.pinned = !chat.pinned;
    await chat.save();
    
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/polls', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.body.streamId);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const poll = new StreamPoll({
      stream: req.body.streamId,
      question: req.body.question,
      options: req.body.options.map(opt => ({ text: opt, votes: 0 })),
      duration: req.body.duration,
      endsAt: new Date(Date.now() + (req.body.duration * 1000))
    });
    
    await poll.save();
    
    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/polls/:id/vote', auth, async (req, res) => {
  try {
    const poll = await StreamPoll.findById(req.params.id);
    
    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (poll.status !== 'active') {
      return res.status(400).json({ message: 'Poll is not active' });
    }
    
    const hasVoted = poll.voters.some(v => v.user.toString() === req.userId);
    
    if (hasVoted) {
      return res.status(400).json({ message: 'Already voted' });
    }
    
    const option = poll.options[req.body.optionIndex];
    if (!option) {
      return res.status(400).json({ message: 'Invalid option' });
    }
    
    option.votes += 1;
    poll.voters.push({ user: req.userId, optionIndex: req.body.optionIndex });
    poll.totalVotes += 1;
    
    await poll.save();
    
    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/highlights', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.body.streamId);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const highlight = new StreamHighlight({
      stream: req.body.streamId,
      title: req.body.title,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      duration: req.body.endTime - req.body.startTime,
      thumbnail: req.body.thumbnail,
      videoUrl: req.body.videoUrl
    });
    
    await highlight.save();
    
    res.status(201).json(highlight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/highlights/:streamId', auth, async (req, res) => {
  try {
    const highlights = await StreamHighlight.find({ stream: req.params.streamId })
      .sort({ createdAt: -1 });
    
    res.json(highlights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/moderation', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.body.streamId);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const modAction = new StreamModeration({
      stream: req.body.streamId,
      moderator: req.userId,
      action: req.body.action,
      targetUser: req.body.targetUser,
      reason: req.body.reason,
      duration: req.body.duration
    });
    
    await modAction.save();
    
    res.status(201).json(modAction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analytics/:streamId', auth, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.streamId);
    
    if (!stream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (stream.streamer.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const analytics = await StreamAnalytics.findOne({ stream: req.params.streamId });
    
    const viewers = await StreamViewer.find({ stream: req.params.streamId });
    
    const avgWatchTime = viewers.reduce((sum, v) => sum + (v.watchTime || 0), 0) / viewers.length;
    
    res.json({
      ...analytics?.toObject() || {},
      avgWatchTime,
      viewerRetention: stream.viewers.unique > 0 ? (stream.viewers.peak / stream.viewers.unique * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
