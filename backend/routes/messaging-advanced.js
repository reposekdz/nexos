const express = require('express');
const crypto = require('crypto');
const {
  Conversation,
  Message,
  E2EKeyPair,
  SessionKey,
  VoiceMessage,
  MessageAttachment,
  TypingIndicator,
  MessageDraft,
  Call
} = require('../models/Messaging');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/conversations', auth, async (req, res) => {
  try {
    const conversation = new Conversation({
      conversationId: `CONV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: req.body.type,
      name: req.body.name,
      description: req.body.description,
      avatar: req.body.avatar,
      participants: req.body.participants || [],
      createdBy: req.userId
    });
    
    if (!conversation.participants.some(p => p.user.toString() === req.userId)) {
      conversation.participants.push({
        user: req.userId,
        role: 'owner',
        permissions: {
          canSend: true,
          canInvite: true,
          canRemove: true,
          canEditInfo: true
        }
      });
    }
    
    await conversation.save();
    
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/conversations', auth, async (req, res) => {
  try {
    const { type, archived } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = {
      participants: {
        $elemMatch: {
          user: req.userId,
          status: 'active'
        }
      }
    };
    
    if (type) filter.type = type;
    if (archived !== undefined) filter.archived = archived === 'true';
    
    const conversations = await Conversation.find(filter)
      .sort({ 'metadata.lastActivity': -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants.user', 'name avatar online')
      .populate('createdBy', 'name avatar');
    
    const conversationsWithUnread = conversations.map(conv => {
      const participant = conv.participants.find(p => p.user._id.toString() === req.userId);
      return {
        ...conv.toObject(),
        unreadCount: participant?.unreadCount || 0
      };
    });
    
    const total = await Conversation.countDocuments(filter);
    
    res.json({
      conversations: conversationsWithUnread,
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

router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants.user', 'name avatar online lastSeen')
      .populate('pinnedMessages');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const participant = conversation.participants.find(
      p => p.user._id.toString() === req.userId && p.status === 'active'
    );
    
    if (!participant) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const participant = conversation.participants.find(
      p => p.user.toString() === req.userId && p.permissions.canEditInfo
    );
    
    if (!participant) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    if (req.body.name) conversation.name = req.body.name;
    if (req.body.description) conversation.description = req.body.description;
    if (req.body.avatar) conversation.avatar = req.body.avatar;
    if (req.body.settings) Object.assign(conversation.settings, req.body.settings);
    
    await conversation.save();
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/conversations/:id/participants', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const participant = conversation.participants.find(
      p => p.user.toString() === req.userId && p.permissions.canInvite
    );
    
    if (!participant) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const { userIds } = req.body;
    
    for (const userId of userIds) {
      if (!conversation.participants.some(p => p.user.toString() === userId)) {
        conversation.participants.push({
          user: userId,
          role: 'member'
        });
      }
    }
    
    await conversation.save();
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/conversations/:id/participants/:userId', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const remover = conversation.participants.find(
      p => p.user.toString() === req.userId && p.permissions.canRemove
    );
    
    if (!remover && req.params.userId !== req.userId) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const targetParticipant = conversation.participants.find(
      p => p.user.toString() === req.params.userId
    );
    
    if (targetParticipant) {
      targetParticipant.status = 'left';
      targetParticipant.leftAt = new Date();
    }
    
    await conversation.save();
    
    res.json({ message: 'Participant removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.body.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    const participant = conversation.participants.find(
      p => p.user.toString() === req.userId && p.permissions.canSend
    );
    
    if (!participant) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    const message = new Message({
      messageId: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation: req.body.conversationId,
      sender: req.userId,
      type: req.body.type,
      content: req.body.content,
      media: req.body.media,
      replyTo: req.body.replyTo,
      forwarded: req.body.forwarded
    });
    
    if (conversation.settings.disappearingMessages.enabled) {
      message.expiresAt = new Date(Date.now() + conversation.settings.disappearingMessages.duration);
    }
    
    await message.save();
    
    conversation.metadata.messageCount += 1;
    conversation.metadata.lastMessageAt = new Date();
    conversation.metadata.lastActivity = new Date();
    
    conversation.participants.forEach(p => {
      if (p.user.toString() !== req.userId) {
        p.unreadCount += 1;
      }
    });
    
    await conversation.save();
    
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/messages', auth, async (req, res) => {
  try {
    const { conversationId, before, after } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = { conversation: conversationId };
    
    if (before) filter.createdAt = { $lt: new Date(before) };
    if (after) filter.createdAt = { $gt: new Date(after) };
    
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('replyTo', 'content sender')
      .populate('content.mentions', 'name avatar');
    
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'name avatar')
      .populate('conversation', 'type participants')
      .populate('replyTo');
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    message.content.text = req.body.content;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    message.deleted = true;
    message.deletedAt = new Date();
    message.content.text = '';
    message.media = [];
    await message.save();
    
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/messages/:id/reactions', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.userId && r.emoji === req.body.emoji
    );
    
    if (existingReaction) {
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.userId && r.emoji === req.body.emoji)
      );
    } else {
      message.reactions.push({
        user: req.userId,
        emoji: req.body.emoji
      });
    }
    
    await message.save();
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/messages/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (!message.readBy.some(r => r.user.toString() === req.userId)) {
      message.readBy.push({ user: req.userId });
      await message.save();
    }
    
    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      const participant = conversation.participants.find(p => p.user.toString() === req.userId);
      if (participant) {
        participant.lastRead = new Date();
        participant.unreadCount = 0;
        await conversation.save();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/keys/generate', auth, async (req, res) => {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    const keyPair = new E2EKeyPair({
      user: req.userId,
      keyId: `KEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      publicKey,
      privateKey
    });
    
    await keyPair.save();
    
    res.json({ keyId: keyPair.keyId, publicKey });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/keys/public/:userId', auth, async (req, res) => {
  try {
    const keyPair = await E2EKeyPair.findOne({
      user: req.params.userId,
      active: true
    }).sort({ createdAt: -1 });
    
    if (!keyPair) {
      return res.status(404).json({ message: 'Public key not found' });
    }
    
    res.json({ publicKey: keyPair.publicKey, keyId: keyPair.keyId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/session-keys', auth, async (req, res) => {
  try {
    const sessionKey = new SessionKey({
      conversation: req.body.conversationId,
      keyId: `SKEY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      encryptedKey: req.body.encryptedKey,
      participants: req.body.participants
    });
    
    await sessionKey.save();
    
    res.status(201).json(sessionKey);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/voice-messages', auth, async (req, res) => {
  try {
    const voiceMessage = new VoiceMessage({
      messageId: req.body.messageId,
      sender: req.userId,
      conversation: req.body.conversationId,
      audioUrl: req.body.audioUrl,
      duration: req.body.duration,
      waveform: req.body.waveform,
      transcription: req.body.transcription
    });
    
    await voiceMessage.save();
    
    res.status(201).json(voiceMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/attachments', auth, async (req, res) => {
  try {
    const attachment = new MessageAttachment({
      attachmentId: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: req.body.messageId,
      uploader: req.userId,
      type: req.body.type,
      url: req.body.url,
      filename: req.body.filename,
      mimeType: req.body.mimeType,
      size: req.body.size,
      metadata: req.body.metadata
    });
    
    await attachment.save();
    
    res.status(201).json(attachment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/typing', auth, async (req, res) => {
  try {
    const { conversationId } = req.body;
    
    await TypingIndicator.deleteMany({
      user: req.userId,
      conversation: conversationId
    });
    
    const indicator = new TypingIndicator({
      user: req.userId,
      conversation: conversationId
    });
    
    await indicator.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/typing/:conversationId', auth, async (req, res) => {
  try {
    const indicators = await TypingIndicator.find({
      conversation: req.params.conversationId,
      user: { $ne: req.userId }
    }).populate('user', 'name avatar');
    
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/drafts', auth, async (req, res) => {
  try {
    let draft = await MessageDraft.findOne({
      user: req.userId,
      conversation: req.body.conversationId
    });
    
    if (!draft) {
      draft = new MessageDraft({
        user: req.userId,
        conversation: req.body.conversationId,
        content: req.body.content,
        metadata: req.body.metadata
      });
    } else {
      draft.content = req.body.content;
      draft.metadata = req.body.metadata;
    }
    
    await draft.save();
    
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/drafts/:conversationId', auth, async (req, res) => {
  try {
    const draft = await MessageDraft.findOne({
      user: req.userId,
      conversation: req.params.conversationId
    });
    
    res.json(draft || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calls', auth, async (req, res) => {
  try {
    const call = new Call({
      callId: `CALL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversation: req.body.conversationId,
      initiator: req.userId,
      type: req.body.type,
      participants: req.body.participants || []
    });
    
    await call.save();
    
    res.status(201).json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/calls/:id/status', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    call.status = req.body.status;
    
    if (req.body.status === 'in_progress' && !call.startedAt) {
      call.startedAt = new Date();
    } else if (req.body.status === 'ended') {
      call.endedAt = new Date();
      call.calculateDuration();
    }
    
    await call.save();
    
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calls/:id/join', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    const participant = call.participants.find(p => p.user.toString() === req.userId);
    
    if (!participant) {
      call.participants.push({
        user: req.userId,
        joinedAt: new Date()
      });
    } else {
      participant.joinedAt = new Date();
    }
    
    await call.save();
    
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calls/:id/leave', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }
    
    const participant = call.participants.find(p => p.user.toString() === req.userId);
    
    if (participant) {
      participant.leftAt = new Date();
    }
    
    await call.save();
    
    res.json(call);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
