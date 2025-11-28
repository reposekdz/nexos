const express = require('express');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const {
  MagicLink,
  TrustedDevice,
  AuthPolicy,
  CompromiseEvent,
  PasswordPolicy,
  PhoneCode,
  BackupCode,
  WebAuthnCredential
} = require('../models/AdvancedSecurity');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

router.post('/magic-link/request', async (req, res) => {
  try {
    const { email, purpose } = req.body;
    
    const user = await User.findOne({ email });
    if (!user && purpose !== 'signup') {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { token, link } = await MagicLink.generate(email, purpose);
    
    const magicLinkUrl = `${process.env.APP_URL}/auth/magic/${token}`;
    
    res.json({
      message: 'Magic link sent',
      devToken: process.env.NODE_ENV === 'development' ? token : undefined
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/magic-link/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    const link = await MagicLink.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!link) {
      return res.status(400).json({ message: 'Invalid or expired magic link' });
    }
    
    let user = await User.findOne({ email: link.email });
    
    if (!user && link.purpose === 'signup') {
      user = new User({
        email: link.email,
        emailVerified: true
      });
      await user.save();
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    link.used = true;
    link.usedAt = new Date();
    link.userId = user._id;
    link.ipAddress = req.ip;
    link.userAgent = req.get('user-agent');
    await link.save();
    
    const jwtToken = user.generateAuthToken();
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    res.json({
      token: jwtToken,
      sessionId,
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/device/trust', auth, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, fingerprint } = req.body;
    
    const trustToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    const device = new TrustedDevice({
      userId: req.userId,
      deviceId,
      deviceName,
      deviceType,
      fingerprint,
      trustToken,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    await device.save();
    
    res.json({
      trustToken,
      expiresAt,
      device: {
        id: device._id,
        name: deviceName,
        type: deviceType
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/device/list', auth, async (req, res) => {
  try {
    const devices = await TrustedDevice.find({
      userId: req.userId,
      status: 'active'
    }).sort({ lastUsed: -1 });
    
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/device/:deviceId/revoke', auth, async (req, res) => {
  try {
    const device = await TrustedDevice.findOne({
      _id: req.params.deviceId,
      userId: req.userId
    });
    
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    
    device.status = 'revoked';
    await device.save();
    
    res.json({ message: 'Device trust revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/2fa/backup-codes/generate', auth, async (req, res) => {
  try {
    await BackupCode.deleteMany({ userId: req.userId });
    
    const codes = [];
    const savedCodes = [];
    
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex');
      codes.push(code);
      
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      savedCodes.push({
        userId: req.userId,
        codeHash
      });
    }
    
    await BackupCode.insertMany(savedCodes);
    
    res.json({
      codes,
      message: 'Store these codes securely. Each can be used once.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/2fa/backup-codes/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    const backupCode = await BackupCode.findOne({
      userId,
      codeHash,
      used: false
    });
    
    if (!backupCode) {
      return res.status(400).json({ message: 'Invalid backup code' });
    }
    
    await backupCode.verify(code);
    
    res.json({ message: 'Backup code verified' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/webauthn/register/begin', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const challenge = crypto.randomBytes(32).toString('base64');
    
    const options = {
      challenge,
      rp: {
        name: process.env.APP_NAME || 'Nexos',
        id: process.env.WEBAUTHN_RP_ID || 'localhost'
      },
      user: {
        id: user._id.toString(),
        name: user.email,
        displayName: user.username || user.email
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 }
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'preferred'
      }
    };
    
    req.session = req.session || {};
    req.session.webauthnChallenge = challenge;
    
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/webauthn/register/complete', auth, async (req, res) => {
  try {
    const { credential, name } = req.body;
    
    const webauthnCred = new WebAuthnCredential({
      userId: req.userId,
      credentialId: credential.id,
      publicKey: credential.response.attestationObject,
      deviceType: credential.type,
      transports: credential.response.transports,
      name
    });
    
    await webauthnCred.save();
    
    res.json({
      message: 'Passkey registered successfully',
      credentialId: credential.id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/phone/verify/send', auth, async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    const phoneCode = new PhoneCode({
      phone,
      code,
      codeHash,
      purpose: purpose || 'verification',
      userId: req.userId,
      expiresAt
    });
    
    await phoneCode.save();
    
    res.json({
      message: 'Verification code sent',
      devCode: process.env.NODE_ENV === 'development' ? code : undefined,
      expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/phone/verify/confirm', auth, async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    const phoneCode = await PhoneCode.findOne({
      phone,
      userId: req.userId,
      verified: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!phoneCode) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    await phoneCode.verify(code);
    
    await User.findByIdAndUpdate(req.userId, {
      phone,
      phoneVerified: true
    });
    
    res.json({ message: 'Phone verified successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/compromise/detect', async (req, res) => {
  try {
    const { userId, eventType, severity, evidence } = req.body;
    
    const event = new CompromiseEvent({
      userId,
      eventType,
      severity,
      evidence,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      actionTaken: severity === 'critical' ? 'quarantined' : 'logged'
    });
    
    await event.save();
    
    if (severity === 'critical' || severity === 'high') {
      await User.findByIdAndUpdate(userId, {
        accountStatus: 'quarantined',
        quarantineReason: `${eventType} detected`
      });
    }
    
    res.json({
      message: 'Compromise event recorded',
      actionTaken: event.actionTaken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/compromise/events', auth, async (req, res) => {
  try {
    const events = await CompromiseEvent.find({
      userId: req.userId,
      resolved: false
    }).sort({ detectedAt: -1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/compromise/events/:id/resolve', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    
    const event = await CompromiseEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    event.resolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = req.userId;
    event.notes = notes;
    await event.save();
    
    res.json({ message: 'Compromise event resolved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/policy/password', async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    const policy = await PasswordPolicy.findOne({
      tenantId: tenantId || null,
      enabled: true
    });
    
    if (!policy) {
      return res.status(404).json({ message: 'No password policy found' });
    }
    
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/policy/password/validate', async (req, res) => {
  try {
    const { password, tenantId, userInfo } = req.body;
    
    const policy = await PasswordPolicy.findOne({
      tenantId: tenantId || null,
      enabled: true
    });
    
    if (!policy) {
      return res.json({ valid: true });
    }
    
    const errors = [];
    
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }
    
    if (password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`);
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (policy.requireSpecialChars) {
      const specialCharsRegex = new RegExp(`[${policy.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
      if (!specialCharsRegex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }
    
    if (policy.preventUserInfo && userInfo) {
      const lowerPassword = password.toLowerCase();
      if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
        errors.push('Password cannot contain your email');
      }
      if (userInfo.username && lowerPassword.includes(userInfo.username.toLowerCase())) {
        errors.push('Password cannot contain your username');
      }
    }
    
    res.json({
      valid: errors.length === 0,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/auth-policies', async (req, res) => {
  try {
    const policies = await AuthPolicy.find({ enabled: true }).sort({ priority: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/auth-policies/:id/evaluate', auth, async (req, res) => {
  try {
    const { action } = req.body;
    
    const policy = await AuthPolicy.findById(req.params.id);
    if (!policy || !policy.enabled) {
      return res.status(404).json({ message: 'Policy not found' });
    }
    
    if (!policy.actions.includes(action)) {
      return res.json({ requireStepUp: false });
    }
    
    const result = {
      requireStepUp: policy.requireStepUp,
      stepUpMethods: policy.stepUpMethods,
      requireTrustedDevice: policy.requireTrustedDevice
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
