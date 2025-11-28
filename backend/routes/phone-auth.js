const express = require('express');
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
  return phone.replace(/\D/g, '');
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendSMS = async (phoneNumber, code) => {
  if (process.env.TWILIO_ACCOUNT_SID) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Your Nexos code is: ${code}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      return true;
    } catch (error) {
      logger.error('SMS error:', error);
      return false;
    }
  }
  logger.info(`[DEV] OTP for ${phoneNumber}: ${code}`);
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
      const username = `user_${phoneNormalized.slice(-10)}_${Date.now()}`;
      const email = `${username}@nexos-phone.temp`;
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
