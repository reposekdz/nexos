const express = require('express');
const AccountRestoration = require('../models/AccountRestoration');
const WatermarkPolicy = require('../models/WatermarkPolicy');
const CopyrightClaim = require('../models/CopyrightClaim');
const DMCATakedown = require('../models/DMCATakedown');
const User = require('../models/User');
const Session = require('../models/Session');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const crypto = require('crypto');
const router = express.Router();

router.post('/account/quarantine/:userId', [auth, adminOnly], async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const previousStatus = user.status;
    user.status = 'quarantined';
    await user.save();

    await Session.invalidateUserSessions(user._id);

    logger.warn(`Account quarantined: ${user._id}`, { reason, admin: req.user.id });

    res.json({
      message: 'Account quarantined successfully',
      user: {
        id: user._id,
        status: user.status,
        previousStatus
      }
    });
  } catch (error) {
    logger.error('Quarantine account error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/account/restoration/request', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingRequest = await AccountRestoration.findOne({
      user: req.user.id,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Restoration request already pending' });
    }

    const restoration = await AccountRestoration.create({
      user: req.user.id,
      requestType: 'self_service',
      previousStatus: user.status,
      reason,
      status: 'pending',
      verificationSteps: [
        { type: 'email_verification', required: true, completed: false },
        { type: 'phone_verification', required: true, completed: false },
        { type: 'security_questions', required: false, completed: false }
      ],
      timeline: [{
        event: 'request_created',
        actor: req.user.id,
        timestamp: new Date(),
        notes: 'Self-service restoration request created'
      }]
    });

    logger.info(`Account restoration requested: ${req.user.id}`);

    res.status(201).json(restoration);
  } catch (error) {
    logger.error('Request account restoration error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/account/restoration/requests', [auth, adminOnly], async (req, res) => {
  try {
    const { status, requestType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    const requests = await AccountRestoration.find(query)
      .populate('user', 'fullName email username')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AccountRestoration.countDocuments(query);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get restoration requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/account/restoration/:id/approve', [auth, adminOnly], async (req, res) => {
  try {
    const { restrictions, notes } = req.body;

    const restoration = await AccountRestoration.findById(req.params.id);
    if (!restoration) {
      return res.status(404).json({ error: 'Restoration request not found' });
    }

    restoration.status = 'approved';
    restoration.approvedBy = req.user.id;
    restoration.approvedAt = new Date();
    restoration.restrictions = restrictions || [];
    restoration.timeline.push({
      event: 'approved',
      actor: req.user.id,
      timestamp: new Date(),
      notes
    });

    await restoration.save();

    const user = await User.findById(restoration.user);
    if (user) {
      user.status = 'active';
      await user.save();
    }

    restoration.restoredAt = new Date();
    restoration.status = 'completed';
    restoration.sessionsRevoked = true;
    restoration.passwordResetRequired = true;
    await restoration.save();

    await Session.invalidateUserSessions(restoration.user);

    logger.info(`Account restoration approved: ${restoration.user}`, { restorationId: restoration._id });

    res.json(restoration);
  } catch (error) {
    logger.error('Approve restoration error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/watermark-policies', auth, async (req, res) => {
  try {
    const { ownerType, watermarkType, textContent, logoUrl, position, opacity, scale, color, applyToTypes, dynamicData } = req.body;

    const policy = await WatermarkPolicy.create({
      owner: req.user.id,
      ownerType: ownerType || 'user',
      enabled: true,
      watermarkType,
      textContent,
      logoUrl,
      position,
      opacity,
      scale,
      color,
      applyToTypes,
      dynamicData,
      isActive: true
    });

    logger.info(`Watermark policy created: ${req.user.id}`, { policyId: policy._id });

    res.status(201).json(policy);
  } catch (error) {
    logger.error('Create watermark policy error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/watermark-policies', auth, async (req, res) => {
  try {
    const policies = await WatermarkPolicy.find({
      owner: req.user.id,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json(policies);
  } catch (error) {
    logger.error('Get watermark policies error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/watermark-policies/:id', auth, async (req, res) => {
  try {
    const updates = req.body;

    const policy = await WatermarkPolicy.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ error: 'Watermark policy not found' });
    }

    logger.info(`Watermark policy updated: ${policy._id}`);

    res.json(policy);
  } catch (error) {
    logger.error('Update watermark policy error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/copyright-claims', auth, async (req, res) => {
  try {
    const { claimant, targetContent, workDescription, originalWorkUrl, infringementDescription, evidence } = req.body;

    const claimId = `CR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const claim = await CopyrightClaim.create({
      claimId,
      claimant,
      targetContent,
      contentOwner: targetContent.contentId,
      workDescription,
      originalWorkUrl,
      infringementDescription,
      evidence: evidence || [],
      status: 'submitted',
      timeline: [{
        event: 'claim_submitted',
        actor: req.user.email,
        timestamp: new Date(),
        details: 'Copyright claim submitted'
      }]
    });

    logger.info(`Copyright claim filed: ${claimId}`, { claimId: claim._id });

    res.status(201).json(claim);
  } catch (error) {
    logger.error('File copyright claim error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/copyright-claims', [auth, adminOnly], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const claims = await CopyrightClaim.find(query)
      .populate('contentOwner', 'fullName email username')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await CopyrightClaim.countDocuments(query);

    res.json({
      claims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get copyright claims error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/copyright-claims/:id/review', [auth, adminOnly], async (req, res) => {
  try {
    const { status, reviewNotes, actionTaken } = req.body;

    const claim = await CopyrightClaim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Copyright claim not found' });
    }

    claim.status = status;
    claim.reviewedBy = req.user.id;
    claim.reviewedAt = new Date();
    claim.reviewNotes = reviewNotes;
    claim.actionTaken = actionTaken;
    claim.actionDate = actionTaken !== 'none' ? new Date() : null;

    claim.timeline.push({
      event: 'claim_reviewed',
      actor: req.user.email,
      timestamp: new Date(),
      details: `Status changed to ${status}, Action: ${actionTaken}`
    });

    await claim.save();

    logger.info(`Copyright claim reviewed: ${claim.claimId}`, { status, actionTaken });

    res.json(claim);
  } catch (error) {
    logger.error('Review copyright claim error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/dmca-takedowns', [auth, adminOnly], async (req, res) => {
  try {
    const { copyrightClaim, complainant, affectedUser, targetContent, legalBasis, swornStatement, signature } = req.body;

    const takedownId = `DMCA-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const takedown = await DMCATakedown.create({
      takedownId,
      copyrightClaim,
      complainant,
      affectedUser,
      targetContent,
      legalBasis,
      swornStatement,
      signature,
      status: 'received'
    });

    logger.info(`DMCA takedown created: ${takedownId}`, { takedownId: takedown._id });

    res.status(201).json(takedown);
  } catch (error) {
    logger.error('Create DMCA takedown error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/dmca-takedowns', [auth, adminOnly], async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const takedowns = await DMCATakedown.find(query)
      .populate('affectedUser', 'fullName email username')
      .populate('copyrightClaim')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await DMCATakedown.countDocuments(query);

    res.json({
      takedowns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get DMCA takedowns error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/dmca-takedowns/:id/execute', [auth, adminOnly], async (req, res) => {
  try {
    const takedown = await DMCATakedown.findById(req.params.id);
    if (!takedown) {
      return res.status(404).json({ error: 'DMCA takedown not found' });
    }

    takedown.status = 'executed';
    takedown.contentDisabledAt = new Date();
    takedown.notifiedUser = true;
    takedown.notifiedAt = new Date();
    takedown.counterNoticeDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await takedown.save();

    logger.info(`DMCA takedown executed: ${takedown.takedownId}`);

    res.json(takedown);
  } catch (error) {
    logger.error('Execute DMCA takedown error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;