const express = require('express');
const Call = require('../models/Call');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/initiate', auth, async (req, res) => {
  try {
    const { recipientId, callType } = req.body;
    
    if (!recipientId || !callType) {
      return res.status(400).json({ error: 'Recipient and call type required' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const call = await Call.create({
      caller: req.user.id,
      recipient: recipientId,
      callType,
      status: 'initiated',
      startTime: new Date(),
      deviceInfo: {
        caller: {
          type: req.body.deviceType || 'unknown',
          os: req.body.os,
          browser: req.body.browser
        }
      },
      webrtc: {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        signaling: []
      },
      encryption: {
        enabled: true,
        algorithm: 'AES-256-GCM',
        keyExchange: 'DTLS-SRTP'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(recipientId).emit('incoming-call', {
        callId: call._id,
        caller: req.user.id,
        callType,
        sessionId: call.webrtc.sessionId
      });
    }

    res.json({ call });
  } catch (error) {
    logger.error('Initiate call error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/accept', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    if (call.recipient.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    call.status = 'connected';
    call.deviceInfo.recipient = {
      type: req.body.deviceType || 'unknown',
      os: req.body.os,
      browser: req.body.browser
    };
    await call.save();

    const io = req.app.get('io');
    if (io) {
      io.to(call.caller.toString()).emit('call-accepted', {
        callId: call._id,
        sessionId: call.webrtc.sessionId
      });
    }

    res.json({ message: 'Call accepted', call });
  } catch (error) {
    logger.error('Accept call error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/decline', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.status = 'declined';
    call.endTime = new Date();
    await call.save();

    const io = req.app.get('io');
    if (io) {
      io.to(call.caller.toString()).emit('call-declined', { callId: call._id });
    }

    res.json({ message: 'Call declined' });
  } catch (error) {
    logger.error('Decline call error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/end', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.status = 'ended';
    call.endTime = new Date();
    call.duration = Math.floor((call.endTime - call.startTime) / 1000);
    
    if (req.body.quality) {
      call.quality = req.body.quality;
    }

    await call.save();

    const io = req.app.get('io');
    if (io) {
      const otherId = call.caller.toString() === req.user.id ? call.recipient.toString() : call.caller.toString();
      io.to(otherId).emit('call-ended', { callId: call._id });
    }

    res.json({ message: 'Call ended', duration: call.duration });
  } catch (error) {
    logger.error('End call error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/signal', auth, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }

    call.webrtc.signaling.push({
      type,
      data,
      timestamp: new Date()
    });
    await call.save();

    const io = req.app.get('io');
    if (io) {
      const otherId = call.caller.toString() === req.user.id ? call.recipient.toString() : call.caller.toString();
      io.to(otherId).emit('call-signal', { callId: call._id, type, data });
    }

    res.json({ message: 'Signal sent' });
  } catch (error) {
    logger.error('Signal error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/screen-share/start', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    call.features.screenSharing = {
      enabled: true,
      startedAt: new Date()
    };
    await call.save();

    const io = req.app.get('io');
    if (io) {
      const otherId = call.caller.toString() === req.user.id ? call.recipient.toString() : call.caller.toString();
      io.to(otherId).emit('screen-share-started', { callId: call._id });
    }

    res.json({ message: 'Screen sharing started' });
  } catch (error) {
    logger.error('Screen share error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/screen-share/stop', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    if (call.features.screenSharing) {
      call.features.screenSharing.enabled = false;
      call.features.screenSharing.duration = Math.floor((new Date() - call.features.screenSharing.startedAt) / 1000);
    }
    await call.save();

    const io = req.app.get('io');
    if (io) {
      const otherId = call.caller.toString() === req.user.id ? call.recipient.toString() : call.caller.toString();
      io.to(otherId).emit('screen-share-stopped', { callId: call._id });
    }

    res.json({ message: 'Screen sharing stopped' });
  } catch (error) {
    logger.error('Screen share stop error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reaction', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });

    if (!call.features.reactions) call.features.reactions = [];
    call.features.reactions.push({
      user: req.user.id,
      emoji,
      timestamp: new Date()
    });
    await call.save();

    const io = req.app.get('io');
    if (io) {
      const otherId = call.caller.toString() === req.user.id ? call.recipient.toString() : call.caller.toString();
      io.to(otherId).emit('call-reaction', { callId: call._id, emoji, userId: req.user.id });
    }

    res.json({ message: 'Reaction sent' });
  } catch (error) {
    logger.error('Reaction error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const calls = await Call.find({
      $or: [{ caller: req.user.id }, { recipient: req.user.id }]
    })
    .sort({ startTime: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('caller', 'fullName avatar username')
    .populate('recipient', 'fullName avatar username');

    const total = await Call.countDocuments({
      $or: [{ caller: req.user.id }, { recipient: req.user.id }]
    });

    res.json({
      calls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Call history error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
