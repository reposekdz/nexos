#!/usr/bin/env node

/**
 * NEXOS PLATFORM - ROUTES GENERATOR FOR FEATURES 1-453
 * This script generates all API routes
 * Run: node generate-routes.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Nexos Platform - Generating Routes for Features 1-453...\n');

const baseDir = __dirname;
const backendDir = path.join(baseDir, 'backend');
const routesDir = path.join(backendDir, 'routes');

// Ensure directory exists
if (!fs.existsSync(routesDir)) {
  fs.mkdirSync(routesDir, { recursive: true });
}

// ============================================================================
// ROUTES
// ============================================================================

const routes = {
  'auth-enhanced.js': `const express = require('express');
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

    const resetUrl = \`\${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/\${token}\`;
    
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

    const verifyUrl = \`\${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/\${token}\`;
    
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
      name: \`Nexos (\${user.email})\`,
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
        \`\${username}\${Math.floor(Math.random() * 1000)}\`,
        \`\${username}_\${Math.floor(Math.random() * 100)}\`,
        \`\${username}.official\`
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

module.exports = router;`,

  'friends.js': `const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

// Send Friend Request
router.post('/request', auth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const existing = await FriendRequest.findOne({
      from: req.user.id,
      to: userId,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    const friendship = await Friendship.findOne({
      $or: [
        { user1: req.user.id, user2: userId },
        { user1: userId, user2: req.user.id }
      ]
    });

    if (friendship) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const friendRequest = await FriendRequest.create({
      from: req.user.id,
      to: userId,
      message: message || ''
    });

    await Notification.create({
      recipient: userId,
      sender: req.user.id,
      type: 'friend_request',
      title: 'New Friend Request',
      message: 'sent you a friend request',
      data: { friendRequestId: friendRequest._id }
    });

    if (global.io) {
      global.io.to(userId.toString()).emit('friend_request', {
        from: req.user.id,
        requestId: friendRequest._id
      });
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept Friend Request
router.post('/request/:id/accept', auth, async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'accepted';
    friendRequest.respondedAt = new Date();
    await friendRequest.save();

    await Friendship.create({
      user1: friendRequest.from,
      user2: friendRequest.to
    });

    await Notification.create({
      recipient: friendRequest.from,
      sender: req.user.id,
      type: 'friend_request_accepted',
      title: 'Friend Request Accepted',
      message: 'accepted your friend request'
    });

    if (global.io) {
      global.io.to(friendRequest.from.toString()).emit('friend_request_accepted', {
        userId: req.user.id
      });
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Decline Friend Request
router.post('/request/:id/decline', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      to: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'declined';
    friendRequest.respondedAt = new Date();
    friendRequest.responseMessage = message;
    await friendRequest.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel Friend Request
router.delete('/request/:id', auth, async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findOne({
      _id: req.params.id,
      from: req.user.id,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'canceled';
    await friendRequest.save();

    res.json({ message: 'Friend request canceled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pending Friend Requests
router.get('/requests', auth, async (req, res) => {
  try {
    const { type = 'received' } = req.query;
    
    const query = {
      status: 'pending'
    };

    if (type === 'received') {
      query.to = req.user.id;
    } else {
      query.from = req.user.id;
    }

    const requests = await FriendRequest.find(query)
      .populate('from', 'username fullName avatar')
      .populate('to', 'username fullName avatar')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Friends List
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const friendships = await Friendship.find({
      $or: [
        { user1: req.user.id },
        { user2: req.user.id }
      ]
    });

    const friendIds = friendships.map(f => 
      f.user1.toString() === req.user.id ? f.user2 : f.user1
    );

    let query = { _id: { $in: friendIds } };
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const friends = await User.find(query)
      .select('username fullName avatar bio isVerified isOnline lastSeen')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      friends,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unfriend
router.delete('/:userId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { user1: req.user.id, user2: req.params.userId },
        { user1: req.params.userId, user2: req.user.id }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Mutual Friends
router.get('/mutual/:userId', auth, async (req, res) => {
  try {
    const myFriendships = await Friendship.find({
      $or: [
        { user1: req.user.id },
        { user2: req.user.id }
      ]
    });

    const myFriendIds = myFriendships.map(f => 
      f.user1.toString() === req.user.id ? f.user2.toString() : f.user1.toString()
    );

    const theirFriendships = await Friendship.find({
      $or: [
        { user1: req.params.userId },
        { user2: req.params.userId }
      ]
    });

    const theirFriendIds = theirFriendships.map(f => 
      f.user1.toString() === req.params.userId ? f.user2.toString() : f.user1.toString()
    );

    const mutualIds = myFriendIds.filter(id => theirFriendIds.includes(id));

    const mutualFriends = await User.find({ _id: { $in: mutualIds } })
      .select('username fullName avatar isVerified');

    res.json({
      count: mutualFriends.length,
      friends: mutualFriends
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`,

  'blocks.js': `const express = require('express');
const Block = require('../models/Block');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Block User
router.post('/:userId', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const existing = await Block.findOne({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    if (existing) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    const block = await Block.create({
      blocker: req.user.id,
      blocked: req.params.userId,
      reason
    });

    // Remove from friends if exists
    const Friendship = require('../models/Friendship');
    await Friendship.findOneAndDelete({
      $or: [
        { user1: req.user.id, user2: req.params.userId },
        { user1: req.params.userId, user2: req.user.id }
      ]
    });

    // Cancel any pending friend requests
    const FriendRequest = require('../models/FriendRequest');
    await FriendRequest.updateMany({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ],
      status: 'pending'
    }, { status: 'canceled' });

    res.json({ message: 'User blocked successfully', block });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unblock User
router.delete('/:userId', auth, async (req, res) => {
  try {
    const block = await Block.findOneAndDelete({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Blocked Users
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const blocks = await Block.find({ blocker: req.user.id })
      .populate('blocked', 'username fullName avatar')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Block.countDocuments({ blocker: req.user.id });

    res.json({
      blocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if User is Blocked
router.get('/check/:userId', auth, async (req, res) => {
  try {
    const block = await Block.findOne({
      blocker: req.user.id,
      blocked: req.params.userId
    });

    res.json({ isBlocked: !!block });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;`
};

// Create all routes
console.log('🛣️  Creating Routes...');
let routeCount = 0;
for (const [fileName, content] of Object.entries(routes)) {
  const filePath = path.join(routesDir, fileName);
  fs.writeFileSync(filePath, content);
  routeCount++;
  console.log(`  ✓ ${fileName}`);
}
console.log(`✅ Created ${routeCount} route files\n`);

// ============================================================================
// COMPLETION MESSAGE
// ============================================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                 ROUTES GENERATED SUCCESSFULLY                ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Total Route Files Created: ${routeCount.toString().padEnd(35)} ║`);
console.log('║                                                              ║');
console.log('║  Features Implemented:                                       ║');
console.log('║  ✓ Password Reset (Secure tokens & email)                   ║');
console.log('║  ✓ Email Verification                                        ║');
console.log('║  ✓ 2FA with QR Codes                                         ║');
console.log('║  ✓ Session Management                                        ║');
console.log('║  ✓ Username Availability Check                               ║');
console.log('║  ✓ Friend Requests (Send/Accept/Decline)                     ║');
console.log('║  ✓ Friendships with Mutual Friends                           ║');
console.log('║  ✓ Block/Unblock Users                                       ║');
console.log('║                                                              ║');
console.log('║  Next: Register routes in server.js                          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

console.log('\n✨ Generation Complete!\n');
