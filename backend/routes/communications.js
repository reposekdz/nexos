const express = require('express');
const EmailBounce = require('../models/EmailBounce');
const EmailUnsubscribe = require('../models/EmailUnsubscribe');
const PhoneVerification = require('../models/PhoneVerification');
const EmergencyContact = require('../models/EmergencyContact');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');
const crypto = require('crypto');
const router = express.Router();

router.post('/email/bounce-webhook', async (req, res) => {
  try {
    const { email, bounceType, reason, diagnosticCode, messageId, provider } = req.body;

    let bounce = await EmailBounce.findOne({ email });

    if (bounce) {
      bounce.bounceCount += 1;
      bounce.lastBounceAt = new Date();
      bounce.bounceType = bounceType;
      bounce.reason = reason || bounce.reason;
      await bounce.save();
    } else {
      bounce = await EmailBounce.create({
        email,
        bounceType,
        reason,
        diagnosticCode,
        messageId,
        provider: provider || 'sendgrid',
        status: bounceType === 'hard' ? 'suppressed' : 'active'
      });
    }

    if (bounceType === 'hard' || bounce.bounceCount >= 3) {
      bounce.status = 'suppressed';
      await bounce.save();
      logger.warn(`Email suppressed due to bounces: ${email}`);
    }

    res.json({ message: 'Bounce processed', bounce });
  } catch (error) {
    logger.error('Email bounce webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/email/bounces', [auth, adminOnly], async (req, res) => {
  try {
    const { status, bounceType, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (bounceType) query.bounceType = bounceType;

    const bounces = await EmailBounce.find(query)
      .populate('user', 'fullName email')
      .sort({ lastBounceAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await EmailBounce.countDocuments(query);

    res.json({
      bounces,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get bounces error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/email/unsubscribe', async (req, res) => {
  try {
    const { token, categories } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Unsubscribe token required' });
    }

    const unsubscribe = await EmailUnsubscribe.findOne({
      token,
      tokenExpiry: { $gt: new Date() }
    }).populate('user');

    if (!unsubscribe) {
      return res.status(404).json({ error: 'Invalid or expired unsubscribe link' });
    }

    if (categories && categories.length > 0) {
      unsubscribe.categories = categories;
      unsubscribe.unsubscribeAll = false;
    } else {
      unsubscribe.unsubscribeAll = true;
    }

    unsubscribe.ipAddress = req.ip;
    unsubscribe.userAgent = req.headers['user-agent'];
    unsubscribe.source = 'link';
    await unsubscribe.save();

    logger.info(`User unsubscribed: ${unsubscribe.user._id}`, { categories });

    res.json({
      message: 'Successfully unsubscribed',
      unsubscribed: unsubscribe.unsubscribeAll ? 'all' : unsubscribe.categories
    });
  } catch (error) {
    logger.error('Unsubscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/email/preferences', auth, async (req, res) => {
  try {
    const unsubscribe = await EmailUnsubscribe.findOne({
      user: req.user.id
    });

    const preferences = {
      marketing: true,
      promotional: true,
      newsletter: true,
      digest: true,
      social: true,
      transactional_optional: true
    };

    if (unsubscribe) {
      if (unsubscribe.unsubscribeAll) {
        Object.keys(preferences).forEach(key => preferences[key] = false);
      } else {
        unsubscribe.categories.forEach(cat => {
          preferences[cat] = false;
        });
      }
    }

    res.json({ preferences, unsubscribe });
  } catch (error) {
    logger.error('Get email preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/email/preferences', auth, async (req, res) => {
  try {
    const { preferences } = req.body;

    const unsubscribedCategories = [];
    Object.keys(preferences).forEach(key => {
      if (!preferences[key]) {
        unsubscribedCategories.push(key);
      }
    });

    let unsubscribe = await EmailUnsubscribe.findOne({ user: req.user.id });

    if (!unsubscribe) {
      unsubscribe = await EmailUnsubscribe.create({
        user: req.user.id,
        email: req.user.email,
        categories: unsubscribedCategories,
        unsubscribeAll: false,
        source: 'preference_center'
      });
    } else {
      unsubscribe.categories = unsubscribedCategories;
      unsubscribe.unsubscribeAll = false;
      await unsubscribe.save();
    }

    logger.info(`Email preferences updated: ${req.user.id}`);

    res.json({ message: 'Preferences updated', unsubscribe });
  } catch (error) {
    logger.error('Update email preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/phone/send-verification', auth, async (req, res) => {
  try {
    const { phoneNormalized, phoneCountry } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = PhoneVerification.hashCode(code);

    await PhoneVerification.deleteMany({
      user: req.user.id,
      phoneNormalized,
      verified: false
    });

    const verification = await PhoneVerification.create({
      user: req.user.id,
      phoneNormalized,
      phoneCountry,
      codeHash,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    if (smsService && smsService.sendSMS) {
      await smsService.sendSMS({
        to: phoneNormalized,
        message: `Your Nexos verification code is: ${code}. Valid for 10 minutes.`
      });
    }

    logger.info(`Phone verification code sent: ${req.user.id}`, { phone: phoneNormalized });

    res.json({
      message: 'Verification code sent',
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    logger.error('Send phone verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/phone/verify', auth, async (req, res) => {
  try {
    const { phoneNormalized, code } = req.body;

    const codeHash = PhoneVerification.hashCode(code);

    const verification = await PhoneVerification.findOne({
      user: req.user.id,
      phoneNormalized,
      codeHash,
      verified: false
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (!verification.isValid()) {
      return res.status(400).json({ error: 'Verification code expired or maximum attempts exceeded' });
    }

    verification.verified = true;
    verification.verifiedAt = new Date();
    await verification.save();

    logger.info(`Phone verified: ${req.user.id}`, { phone: phoneNormalized });

    res.json({
      message: 'Phone verified successfully',
      verification
    });
  } catch (error) {
    logger.error('Verify phone error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/emergency-contacts', auth, async (req, res) => {
  try {
    const { name, relationship, phoneNormalized, phoneCountry, email, alertTypes } = req.body;

    const contact = await EmergencyContact.create({
      user: req.user.id,
      name,
      relationship,
      phoneNormalized,
      phoneCountry,
      email,
      alertTypes: alertTypes || [],
      consentGiven: false,
      alertsEnabled: false
    });

    logger.info(`Emergency contact added: ${req.user.id}`, { contactId: contact._id });

    res.status(201).json(contact);
  } catch (error) {
    logger.error('Add emergency contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/emergency-contacts', auth, async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({
      user: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(contacts);
  } catch (error) {
    logger.error('Get emergency contacts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/emergency-contacts/:id', auth, async (req, res) => {
  try {
    const { name, relationship, phoneNormalized, phoneCountry, email, alertTypes, alertsEnabled } = req.body;

    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    if (name) contact.name = name;
    if (relationship) contact.relationship = relationship;
    if (phoneNormalized) contact.phoneNormalized = phoneNormalized;
    if (phoneCountry) contact.phoneCountry = phoneCountry;
    if (email) contact.email = email;
    if (alertTypes) contact.alertTypes = alertTypes;
    if (alertsEnabled !== undefined) contact.alertsEnabled = alertsEnabled;

    await contact.save();

    logger.info(`Emergency contact updated: ${contact._id}`);

    res.json(contact);
  } catch (error) {
    logger.error('Update emergency contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/emergency-contacts/:id', auth, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isActive: false },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    logger.info(`Emergency contact removed: ${contact._id}`);

    res.json({ message: 'Emergency contact removed' });
  } catch (error) {
    logger.error('Remove emergency contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/emergency-contacts/:id/verify', auth, async (req, res) => {
  try {
    const contact = await EmergencyContact.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!contact) {
      return res.status(404).json({ error: 'Emergency contact not found' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    contact.verificationToken = verificationToken;
    contact.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await contact.save();

    const verificationUrl = `${process.env.CLIENT_URL}/verify-emergency-contact/${verificationToken}`;

    if (contact.email && emailService && emailService.sendEmail) {
      await emailService.sendEmail({
        to: { email: contact.email, name: contact.name },
        templateKey: 'emergency_contact_verification',
        variables: {
          contactName: contact.name,
          userName: req.user.fullName,
          verificationUrl
        }
      });
    }

    logger.info(`Emergency contact verification sent: ${contact._id}`);

    res.json({ message: 'Verification request sent to emergency contact' });
  } catch (error) {
    logger.error('Send emergency contact verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;