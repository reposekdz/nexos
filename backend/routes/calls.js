const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

// Initiate call
router.post('/initiate', auth, async (req, res) => {
  try {
    const { recipientId, callType } = req.body; // callType: 'video' or 'audio'
    
    // In a real implementation, you would:
    // 1. Check if recipient is online
    // 2. Create a call record in database
    // 3. Send real-time notification via Socket.io
    
    const callData = {
      callId: Date.now().toString(),
      caller: req.userId,
      recipient: recipientId,
      callType,
      status: 'initiated',
      timestamp: new Date()
    };
    
    // Emit to recipient via Socket.io (handled in server.js)
    req.app.get('io').to(recipientId).emit('incoming-call', callData);
    
    res.json(callData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Answer call
router.post('/answer', auth, async (req, res) => {
  try {
    const { callId, accept } = req.body;
    
    // Update call status and notify caller
    const response = {
      callId,
      status: accept ? 'accepted' : 'declined',
      timestamp: new Date()
    };
    
    // Emit response to caller
    req.app.get('io').emit('call-response', response);
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End call
router.post('/end', auth, async (req, res) => {
  try {
    const { callId } = req.body;
    
    // Update call record and notify participants
    const endData = {
      callId,
      status: 'ended',
      endedBy: req.userId,
      timestamp: new Date()
    };
    
    // Emit to all participants
    req.app.get('io').emit('call-ended', endData);
    
    res.json(endData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;