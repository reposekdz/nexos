const express = require('express');
const VerificationRequest = require('../models/VerificationRequest');
const IdentityDocument = require('../models/IdentityDocument');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const router = express.Router();

router.post('/verification/request', auth, async (req, res) => {
  try {
    const { entityType, verificationType, submittedData, documents } = req.body;

    const existingRequest = await VerificationRequest.findOne({
      user: req.user.id,
      status: { $in: ['pending', 'under_review'] }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Verification request already pending' });
    }

    const user = await User.findById(req.user.id);

    const automatedChecks = {
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneVerified || false,
      socialPresence: user.followersCount || 0,
      accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
      riskScore: 0
    };

    let riskScore = 100;
    if (!automatedChecks.emailVerified) riskScore -= 20;
    if (!automatedChecks.phoneVerified) riskScore -= 15;
    if (automatedChecks.accountAge < 30) riskScore -= 25;
    if (automatedChecks.socialPresence < 100) riskScore -= 10;
    automatedChecks.riskScore = riskScore;

    const request = await VerificationRequest.create({
      user: req.user.id,
      entityType: entityType || 'user',
      verificationType,
      submittedData,
      documents: documents || [],
      automatedChecks,
      status: riskScore >= 60 ? 'under_review' : 'pending'
    });

    logger.info(`Verification request submitted: ${req.user.id}`, {
      requestId: request._id,
      type: verificationType,
      riskScore
    });

    res.status(201).json(request);
  } catch (error) {
    logger.error('Submit verification request error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/verification/requests', auth, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    logger.error('Get verification requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/verification/requests/all', [auth, adminOnly], async (req, res) => {
  try {
    const { status, verificationType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (verificationType) query.verificationType = verificationType;

    const requests = await VerificationRequest.find(query)
      .populate('user', 'fullName email username profilePicture')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await VerificationRequest.countDocuments(query);

    const statusCounts = await VerificationRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      statusCounts: statusCounts.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Get all verification requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verification/requests/:id/review', [auth, adminOnly], async (req, res) => {
  try {
    const { status, reviewNotes, rejectionReason, verificationBadge, expiresAt } = req.body;

    const request = await VerificationRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNotes = reviewNotes;

    if (status === 'rejected') {
      request.rejectionReason = rejectionReason;
    } else if (status === 'approved') {
      request.verifiedAt = new Date();
      request.verificationBadge = verificationBadge || 'blue';
      
      if (expiresAt) {
        request.expiresAt = new Date(expiresAt);
      } else {
        request.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      const user = await User.findById(request.user);
      if (user) {
        user.verified = true;
        user.verificationBadge = request.verificationBadge;
        user.verifiedAt = request.verifiedAt;
        await user.save();
      }
    }

    await request.save();

    logger.info(`Verification request reviewed: ${request._id}`, {
      status,
      userId: request.user,
      badge: verificationBadge
    });

    res.json(request);
  } catch (error) {
    logger.error('Review verification request error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/identity-documents', auth, async (req, res) => {
  try {
    const {
      verificationRequest,
      documentType,
      documentNumber,
      issuingCountry,
      issueDate,
      expiryDate,
      encryptedFrontUrl,
      encryptedBackUrl,
      kmsKeyId
    } = req.body;

    const retentionUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const document = await IdentityDocument.create({
      user: req.user.id,
      verificationRequest,
      documentType,
      documentNumber,
      issuingCountry,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      encryptedFrontUrl,
      encryptedBackUrl,
      kmsKeyId,
      verificationStatus: 'pending',
      fraudChecks: {
        tampering: false,
        photocopy: false,
        expiry: expiryDate && new Date(expiryDate) < new Date(),
        blacklist: false,
        score: 85
      },
      retentionUntil
    });

    logger.info(`Identity document uploaded: ${req.user.id}`, {
      documentId: document._id,
      type: documentType
    });

    res.status(201).json(document);
  } catch (error) {
    logger.error('Upload identity document error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/identity-documents', auth, async (req, res) => {
  try {
    const documents = await IdentityDocument.find({ user: req.user.id })
      .select('-encryptedFrontUrl -encryptedBackUrl -kmsKeyId -extractedData')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    logger.error('Get identity documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/identity-documents/:id', [auth, adminOnly], async (req, res) => {
  try {
    const document = await IdentityDocument.findById(req.params.id)
      .populate('user', 'fullName email username')
      .populate('verificationRequest');

    if (!document) {
      return res.status(404).json({ error: 'Identity document not found' });
    }

    document.accessLog.push({
      accessor: req.user.id,
      accessedAt: new Date(),
      reason: req.query.reason || 'admin_review'
    });

    await document.save();

    logger.info(`Identity document accessed: ${document._id}`, {
      accessor: req.user.id,
      user: document.user
    });

    res.json(document);
  } catch (error) {
    logger.error('Get identity document error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/identity-documents/:id/verify', [auth, adminOnly], async (req, res) => {
  try {
    const { verificationStatus, verificationScore, verificationDetails, fraudChecks } = req.body;

    const document = await IdentityDocument.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Identity document not found' });
    }

    document.verificationStatus = verificationStatus;
    document.verificationProvider = 'manual_review';
    document.verificationScore = verificationScore;
    document.verificationDetails = verificationDetails;
    
    if (fraudChecks) {
      document.fraudChecks = { ...document.fraudChecks, ...fraudChecks };
    }

    await document.save();

    logger.info(`Identity document verified: ${document._id}`, {
      status: verificationStatus,
      score: verificationScore
    });

    res.json(document);
  } catch (error) {
    logger.error('Verify identity document error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/verification/badges', auth, async (req, res) => {
  try {
    const verificationStats = await VerificationRequest.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$verificationBadge',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalVerified = await User.countDocuments({ verified: true });
    const pendingReviews = await VerificationRequest.countDocuments({
      status: { $in: ['pending', 'under_review'] }
    });

    res.json({
      totalVerified,
      pendingReviews,
      badgeDistribution: verificationStats.reduce((acc, { _id, count }) => {
        acc[_id || 'none'] = count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Get verification badges stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;