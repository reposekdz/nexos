const fs = require('fs');
const path = require('path');

console.log('🚀 Nexos Platform - Complete Routes Generation for Features 601-800\n');

const baseDir = __dirname;
const backendDir = path.join(baseDir, 'backend');
const routesDir = path.join(backendDir, 'routes');

let stats = { routesCreated: 0 };

const routes = {
  'phone-auth.js': `const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PhoneVerification = require('../models/PhoneVerification');
const Contact = require('../models/Contact');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const router = express.Router();

const normalizePhone = (phone) => {
  return phone.replace(/\\D/g, '');
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (phoneNumber, code) => {
  if (process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: \`Your Nexos code is: \${code}. Valid for 10 minutes.\`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      return true;
    } catch (error) {
      logger.error('SMS error:', error);
      return false;
    }
  }
  logger.info(\`[DEV] OTP for \${phoneNumber}: \${code}\`);
  return true;
};

router.post('/send-otp', authLimiter, async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number required' });

    const phoneNormalized = normalizePhone(phoneNumber);
    const code = generateOTP();
    const codeHash = PhoneVerification.hashCode(code);

    await PhoneVerification.create({
      phoneNormalized,
      codeHash,
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendSMS(phoneNormalized, code);
    res.json({ message: 'OTP sent', phoneNormalized, expiresIn: 600 });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify-otp-login', authLimiter, async (req, res) => {
  try {
    const { phoneNumber, code, deviceInfo } = req.body;
    if (!phoneNumber || !code) return res.status(400).json({ error: 'Phone and code required' });

    const phoneNormalized = normalizePhone(phoneNumber);
    const codeHash = PhoneVerification.hashCode(code);

    const verification = await PhoneVerification.findOne({
      phoneNormalized,
      codeHash,
      verified: false
    }).sort({ createdAt: -1 });

    if (!verification || !verification.isValid()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    verification.verified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    let user = await User.findOne({ phoneNumber: phoneNormalized });
    let isNewUser = false;
    
    if (!user) {
      const username = \`user_\${phoneNormalized.slice(-10)}_\${Date.now()}\`;
      const email = \`\${username}@nexos-phone.temp\`;
      const tempPassword = crypto.randomBytes(32).toString('hex');
      
      user = await User.create({
        username,
        email,
        password: tempPassword,
        fullName: phoneNormalized,
        phoneNumber: phoneNormalized,
        phoneVerified: true,
        accountVerified: true
      });
      isNewUser = true;
    }

    const token = jwt.sign(
      { id: user._id, phoneNumber: phoneNormalized },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    await Session.create({
      user: user._id,
      token,
      refreshToken,
      deviceInfo: deviceInfo || {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;

    res.json({ message: 'Login successful', token, refreshToken, user: userResponse, isNewUser });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/contacts/sync', auth, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Contacts array required' });

    const synced = [];
    const matched = [];

    for (const contact of contacts) {
      const phoneNormalized = normalizePhone(contact.phoneNumber);
      
      const linkedUser = await User.findOne({ phoneNumber: phoneNormalized });
      
      const existingContact = await Contact.findOne({
        owner: req.user.id,
        phoneNormalized
      });

      if (existingContact) {
        existingContact.name = contact.name || existingContact.name;
        existingContact.linkedUser = linkedUser ? linkedUser._id : null;
        existingContact.syncedAt = new Date();
        await existingContact.save();
        synced.push(existingContact);
      } else {
        const newContact = await Contact.create({
          owner: req.user.id,
          phoneNumber: contact.phoneNumber,
          phoneNormalized,
          name: contact.name,
          linkedUser: linkedUser ? linkedUser._id : null,
          syncSource: 'device',
          syncedAt: new Date()
        });
        synced.push(newContact);
      }

      if (linkedUser) {
        matched.push({ contact: phoneNormalized, user: linkedUser._id });
      }
    }

    res.json({ 
      message: 'Contacts synced', 
      synced: synced.length, 
      matched: matched.length,
      contacts: synced
    });
  } catch (error) {
    logger.error('Contact sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/contacts', auth, async (req, res) => {
  try {
    const { search, favorite } = req.query;
    const query = { owner: req.user.id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search } }
      ];
    }
    
    if (favorite === 'true') {
      query.favorite = true;
    }

    const contacts = await Contact.find(query)
      .populate('linkedUser', 'fullName avatar username isOnline')
      .sort({ favorite: -1, name: 1 });

    res.json({ contacts });
  } catch (error) {
    logger.error('Get contacts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/contacts/:id', auth, async (req, res) => {
  try {
    const { name, favorite, labels } = req.body;
    
    const contact = await Contact.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (name) contact.name = name;
    if (typeof favorite !== 'undefined') contact.favorite = favorite;
    if (labels) contact.labels = labels;

    await contact.save();
    res.json({ message: 'Contact updated', contact });
  } catch (error) {
    logger.error('Update contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/contacts/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted' });
  } catch (error) {
    logger.error('Delete contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
`,

  'calls-enhanced.js': `const express = require('express');
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
        sessionId: \`session_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
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
`
};

console.log('Creating route files...');
for (const [filename, content] of Object.entries(routes)) {
  const filePath = path.join(routesDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Created route: ${filename}`);
    stats.routesCreated++;
  } else {
    console.log(`⊗ Route already exists: ${filename}`);
  }
}

console.log('\n✅ Routes Generation Complete!');
console.log(`📊 Routes Created: ${stats.routesCreated}`);