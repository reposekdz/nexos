const express = require('express');
const User = require('../models/User');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const router = express.Router();

// Enable 2FA
router.post('/2fa/enable', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    const secret = speakeasy.generateSecret({
      name: `Nexos (${user.email})`,
      issuer: 'Nexos'
    });
    
    user.twoFactorSecret = secret.base32;
    user.twoFactorEnabled = false; // Will be enabled after verification
    await user.save();
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify and activate 2FA
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.userId);
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });
    
    if (verified) {
      user.twoFactorEnabled = true;
      await user.save();
      res.json({ message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Disable 2FA
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.userId);
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    });
    
    if (verified) {
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      await user.save();
      res.json({ message: '2FA disabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get login history
router.get('/login-history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.loginHistory || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active sessions
router.get('/sessions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json(user.activeSessions || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Revoke session
router.delete('/sessions/:sessionId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.activeSessions = user.activeSessions.filter(
      session => session.id !== req.params.sessionId
    );
    await user.save();
    res.json({ message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;