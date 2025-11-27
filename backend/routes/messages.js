const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Send message
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { recipient, group, content, messageType } = req.body;
    
    const message = new Message({
      sender: req.userId,
      recipient: recipient || undefined,
      group: group || undefined,
      content,
      media: req.file ? {
        type: req.file.mimetype.startsWith('image') ? 'image' : 
              req.file.mimetype.startsWith('video') ? 'video' : 
              req.file.mimetype.startsWith('audio') ? 'audio' : 'file',
        url: req.file.path,
        filename: req.file.originalname
      } : undefined,
      messageType: messageType || 'text'
    });

    await message.save();
    await message.populate('sender', 'username fullName avatar');
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversation messages
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: userId },
        { sender: userId, recipient: req.userId }
      ]
    })
    .populate('sender', 'username fullName avatar')
    .sort({ createdAt: -1 })
    .limit(limit * page)
    .skip((page - 1) * limit);
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get group messages
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await Message.find({ group: groupId })
      .populate('sender', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark message as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversations list
router.get('/', auth, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.userId }, { recipient: req.userId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.userId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatar: 1,
            isOnline: 1
          },
          lastMessage: 1
        }
      }
    ]);
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;