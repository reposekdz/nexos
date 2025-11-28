const express = require('express');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const PasswordResetToken = require('../models/PasswordResetToken');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');
const router = express.Router();

// Password Reset Request
router.post('/password-reset', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({ message: 'If account exists, reset email sent' });
    }

    await PasswordResetToken.updateMany({ user: user._id, used: false }, { used: true });

    const token = PasswordResetToken.generateToken();
    const tokenHash = PasswordResetToken.hashToken(token);

    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    if (emailService && emailService.sendEmail) {
      await emailService.sendEmail({
        to: { email: user.email, name: user.fullName, userId: user._id },
        templateKey: 'password_reset',
        variables: { userName: user.fullName, resetUrl, expiresIn: '1 hour' }
      });
    }

    res.json({ message: 'If account exists, reset email sent' });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm Password Reset
router.post('/password-reset/confirm', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const tokenHash = PasswordResetToken.hashToken(token);
    const resetToken = await PasswordResetToken.findOne({ tokenHash, used: false });

    if (!resetToken || !resetToken.isValid()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(resetToken.user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    resetToken.used = true;
    resetToken.usedAt = new Date();
    await resetToken.save();

    await Session.invalidateUserSessions(user._id);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error('Password reset confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send Email Verification
router.post('/send-verification', auth, authLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    await VerificationToken.updateMany({ user: user._id, used: false }, { used: true });

    const token = VerificationToken.generateToken();
    const tokenHash = VerificationToken.hashToken(token);

    await VerificationToken.create({
      user: user._id,
      token,
      tokenHash,
      type: 'email_verification',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    if (emailService && emailService.sendEmail) {
      await emailService.sendEmail({
        to: { email: user.email, name: user.fullName, userId: user._id },
        templateKey: 'email_verification',
        variables: { userName: user.fullName, verifyUrl }
      });
    }

    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify Email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    const tokenHash = VerificationToken.hashToken(token);
    const verificationToken = await VerificationToken.findOne({ tokenHash, used: false });

    if (!verificationToken || !verificationToken.isValid()) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = await User.findById(verificationToken.user);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.emailVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    verificationToken.used = true;
    verificationToken.usedAt = new Date();
    await verificationToken.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Verify email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enable 2FA
router.post('/2fa/enable', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `Nexos (${user.email})`,
      length: 32
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    const recoveryCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    user.twoFactorSecret = secret.base32;
    user.twoFactorRecoveryCodes = recoveryCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );
    await user.save();

    res.json({
      secret: secret.base32,
      qrCode,
      recoveryCodes
    });
  } catch (error) {
    logger.error('2FA enable error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify and Complete 2FA Setup
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('2FA verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disable 2FA
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user.id);

    if (!await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorRecoveryCodes = undefined;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logger.error('2FA disable error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Sessions
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user.id, isActive: true })
      .sort({ lastActivity: -1 });

    const sessionsWithCurrent = sessions.map(session => ({
      ...session.toObject(),
      isCurrent: session.token === req.token
    }));

    res.json(sessionsWithCurrent);
  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke Session
router.delete('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      user: req.user.id
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.isActive = false;
    await session.save();

    res.json({ message: 'Session revoked' });
  } catch (error) {
    logger.error('Revoke session error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke All Sessions (except current)
router.delete('/sessions', auth, async (req, res) => {
  try {
    await Session.invalidateUserSessions(req.user.id, req.token);
    res.json({ message: 'All other sessions revoked' });
  } catch (error) {
    logger.error('Revoke all sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check Username Availability
router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const reservedUsernames = ['admin', 'support', 'help', 'api', 'nexos', 'moderator'];
    if (reservedUsernames.includes(username.toLowerCase())) {
      return res.json({ available: false, reason: 'reserved' });
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    
    if (existing) {
      const randomSuggestions = [
        `${username}${Math.floor(Math.random() * 1000)}`,
        `${username}_${Math.floor(Math.random() * 100)}`,
        `${username}.official`
      ];

      return res.json({
        available: false,
        suggestions: randomSuggestions
      });
    }

    res.json({ available: true });
  } catch (error) {
    logger.error('Check username error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;