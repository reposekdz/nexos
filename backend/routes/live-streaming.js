const express = require('express');
const LiveStream = require('../models/LiveStream');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// Create live stream
router.post('/create', auth, async (req, res) => {
  try {
    const { title, description, category, isPrivate, allowedUsers } = req.body;
    
    const streamKey = crypto.randomBytes(16).toString('hex');
    
    const liveStream = new LiveStream({
      streamer: req.userId,
      title,
      description,
      streamKey,
      rtmpUrl: `rtmp://localhost:1935/live/${streamKey}`,
      hlsUrl: `http://localhost:8080/hls/${streamKey}.m3u8`,
      category,
      isPrivate,
      allowedUsers: isPrivate ? allowedUsers : []
    });

    await liveStream.save();
    await liveStream.populate('streamer', 'username fullName avatar');
    
    res.status(201).json(liveStream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start live stream
router.post('/:id/start', auth, async (req, res) => {
  try {
    const liveStream = await LiveStream.findOne({
      _id: req.params.id,
      streamer: req.userId
    });
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    liveStream.status = 'live';
    liveStream.startedAt = new Date();
    await liveStream.save();
    
    // Notify followers about live stream
    const io = require('../server').io;
    io.emit('new-live-stream', {
      streamId: liveStream._id,
      streamer: liveStream.streamer,
      title: liveStream.title
    });
    
    res.json(liveStream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End live stream
router.post('/:id/end', auth, async (req, res) => {
  try {
    const liveStream = await LiveStream.findOne({
      _id: req.params.id,
      streamer: req.userId
    });
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    liveStream.status = 'ended';
    liveStream.endedAt = new Date();
    liveStream.duration = Math.floor((liveStream.endedAt - liveStream.startedAt) / 1000);
    
    await liveStream.save();
    
    res.json(liveStream);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join live stream
router.post('/:id/join', auth, async (req, res) => {
  try {
    const liveStream = await LiveStream.findById(req.params.id)
      .populate('streamer', 'username fullName avatar');
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    if (liveStream.status !== 'live') {
      return res.status(400).json({ message: 'Stream is not live' });
    }
    
    // Check if stream is private and user is allowed
    if (liveStream.isPrivate && !liveStream.allowedUsers.includes(req.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Add viewer if not already viewing
    if (!liveStream.viewers.includes(req.userId)) {
      liveStream.viewers.push(req.userId);
      liveStream.totalViews += 1;
      
      if (liveStream.viewers.length > liveStream.maxViewers) {
        liveStream.maxViewers = liveStream.viewers.length;
      }
      
      await liveStream.save();
    }
    
    res.json({
      stream: liveStream,
      viewerCount: liveStream.viewers.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave live stream
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const liveStream = await LiveStream.findById(req.params.id);
    
    if (liveStream) {
      liveStream.viewers.pull(req.userId);
      await liveStream.save();
    }
    
    res.json({ message: 'Left stream' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send chat message
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const liveStream = await LiveStream.findById(req.params.id);
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    const chatMessage = {
      user: req.userId,
      message,
      timestamp: new Date()
    };
    
    liveStream.chat.push(chatMessage);
    await liveStream.save();
    await liveStream.populate('chat.user', 'username fullName avatar');
    
    // Emit to all viewers
    const io = require('../server').io;
    io.to(`stream_${liveStream._id}`).emit('stream-chat-message', {
      ...chatMessage,
      user: liveStream.chat[liveStream.chat.length - 1].user
    });
    
    res.json(chatMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reaction
router.post('/:id/reaction', auth, async (req, res) => {
  try {
    const { type } = req.body; // like, love, wow, laugh, sad, angry
    const liveStream = await LiveStream.findById(req.params.id);
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    const reaction = {
      user: req.userId,
      type,
      timestamp: new Date()
    };
    
    liveStream.reactions.push(reaction);
    await liveStream.save();
    
    // Emit to all viewers
    const io = require('../server').io;
    io.to(`stream_${liveStream._id}`).emit('stream-reaction', reaction);
    
    res.json(reaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active live streams
router.get('/active', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    let query = { status: 'live' };
    if (category) query.category = category;
    
    const streams = await LiveStream.find(query)
      .populate('streamer', 'username fullName avatar')
      .sort({ startedAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    const streamsWithViewers = streams.map(stream => ({
      ...stream.toObject(),
      viewerCount: stream.viewers.length
    }));
    
    res.json(streamsWithViewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stream details
router.get('/:id', async (req, res) => {
  try {
    const liveStream = await LiveStream.findById(req.params.id)
      .populate('streamer', 'username fullName avatar')
      .populate('chat.user', 'username fullName avatar');
    
    if (!liveStream) {
      return res.status(404).json({ message: 'Stream not found' });
    }
    
    res.json({
      ...liveStream.toObject(),
      viewerCount: liveStream.viewers.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;