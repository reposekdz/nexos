const express = require('express');
const LegalExportJob = require('../models/LegalExportJob');
const ArchivedPost = require('../models/ArchivedPost');
const MetricsRetentionPolicy = require('../models/MetricsRetentionPolicy');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { adminOnly } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const archiver = require('archiver');
const crypto = require('crypto');
const router = express.Router();

router.post('/legal-exports', [auth, adminOnly], async (req, res) => {
  try {
    const { requestId, caseNumber, requestType, targetUser, requesterInfo, dataTypes, dateRange } = req.body;

    const existingRequest = await LegalExportJob.findOne({ requestId });
    if (existingRequest) {
      return res.status(400).json({ error: 'Request ID already exists' });
    }

    const job = await LegalExportJob.create({
      requestId,
      caseNumber,
      requestType,
      targetUser,
      requesterInfo,
      dataTypes: dataTypes || ['all'],
      dateRange,
      status: 'pending_approval',
      auditLog: [{
        action: 'created',
        actor: req.user.id,
        timestamp: new Date(),
        notes: 'Legal export request created'
      }]
    });

    logger.info(`Legal export job created: ${requestId}`, { jobId: job._id });

    res.status(201).json(job);
  } catch (error) {
    logger.error('Create legal export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/legal-exports', [auth, adminOnly], async (req, res) => {
  try {
    const { status, requestType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (requestType) query.requestType = requestType;

    const jobs = await LegalExportJob.find(query)
      .populate('targetUser', 'fullName email username')
      .populate('approvedBy', 'fullName email')
      .populate('processedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LegalExportJob.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get legal exports error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/legal-exports/:id/approve', [auth, adminOnly], async (req, res) => {
  try {
    const { notes } = req.body;

    const job = await LegalExportJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Legal export job not found' });
    }

    job.status = 'approved';
    job.approvedBy = req.user.id;
    job.approvedAt = new Date();
    job.auditLog.push({
      action: 'approved',
      actor: req.user.id,
      timestamp: new Date(),
      notes
    });

    await job.save();

    logger.info(`Legal export job approved: ${job.requestId}`, { jobId: job._id });

    res.json(job);
  } catch (error) {
    logger.error('Approve legal export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/legal-exports/:id/process', [auth, adminOnly], async (req, res) => {
  try {
    const job = await LegalExportJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Legal export job not found' });
    }

    if (job.status !== 'approved') {
      return res.status(400).json({ error: 'Job must be approved before processing' });
    }

    job.status = 'processing';
    job.processedAt = new Date();
    job.processedBy = req.user.id;
    await job.save();

    const user = await User.findById(job.targetUser);
    const exportData = {
      user: user.toObject(),
      posts: [],
      messages: [],
      transactions: []
    };

    if (job.dataTypes.includes('all') || job.dataTypes.includes('posts')) {
      const query = { author: job.targetUser };
      if (job.dateRange) {
        query.createdAt = {
          $gte: new Date(job.dateRange.start),
          $lte: new Date(job.dateRange.end)
        };
      }
      exportData.posts = await Post.find(query).lean();
    }

    const exportJson = JSON.stringify(exportData, null, 2);
    const exportHash = crypto.createHash('sha256').update(exportJson).digest('hex');

    const exportUrl = `/exports/legal/${job.requestId}.json`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    job.status = 'completed';
    job.exportUrl = exportUrl;
    job.exportHash = exportHash;
    job.exportSize = Buffer.byteLength(exportJson);
    job.expiresAt = expiresAt;
    job.auditLog.push({
      action: 'completed',
      actor: req.user.id,
      timestamp: new Date(),
      notes: 'Export completed successfully'
    });

    await job.save();

    logger.info(`Legal export job completed: ${job.requestId}`, { jobId: job._id });

    res.json(job);
  } catch (error) {
    logger.error('Process legal export error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/:id/archive', [auth, adminOnly], async (req, res) => {
  try {
    const { reason, retentionYears } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const existingArchive = await ArchivedPost.findOne({ originalPostId: post._id });
    if (existingArchive) {
      return res.status(400).json({ error: 'Post already archived' });
    }

    const retentionUntil = retentionYears 
      ? new Date(Date.now() + retentionYears * 365 * 24 * 60 * 60 * 1000)
      : null;

    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify(post))
      .digest('hex');

    const archivedPost = await ArchivedPost.create({
      originalPostId: post._id,
      post: post._id,
      archivedBy: req.user.id,
      reason: reason || 'compliance',
      originalContent: post.toObject(),
      contentHash,
      retentionUntil,
      canRestore: true
    });

    post.status = 'archived';
    await post.save();

    logger.info(`Post archived: ${post._id}`, { archiveId: archivedPost._id, reason });

    res.json({
      message: 'Post archived successfully',
      archivedPost
    });
  } catch (error) {
    logger.error('Archive post error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/archived-posts', [auth, adminOnly], async (req, res) => {
  try {
    const { reason, page = 1, limit = 50 } = req.query;

    const query = {};
    if (reason) query.reason = reason;

    const archivedPosts = await ArchivedPost.find(query)
      .populate('post')
      .populate('archivedBy', 'fullName email')
      .sort({ archiveDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ArchivedPost.countDocuments(query);

    res.json({
      archivedPosts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get archived posts error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/archived-posts/:id/restore', [auth, adminOnly], async (req, res) => {
  try {
    const archivedPost = await ArchivedPost.findById(req.params.id);
    if (!archivedPost) {
      return res.status(404).json({ error: 'Archived post not found' });
    }

    if (!archivedPost.canRestore) {
      return res.status(400).json({ error: 'Post cannot be restored' });
    }

    const post = await Post.findById(archivedPost.originalPostId);
    if (post) {
      post.status = 'active';
      await post.save();
    }

    archivedPost.restoredAt = new Date();
    archivedPost.restoredBy = req.user.id;
    await archivedPost.save();

    logger.info(`Post restored from archive: ${archivedPost.originalPostId}`);

    res.json({
      message: 'Post restored successfully',
      post
    });
  } catch (error) {
    logger.error('Restore post error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/metrics-retention-policies', [auth, adminOnly], async (req, res) => {
  try {
    const { name, description, metricType, retentionTiers, purgeSchedule } = req.body;

    const policy = await MetricsRetentionPolicy.create({
      name,
      description,
      metricType,
      retentionTiers,
      purgeSchedule,
      isActive: true
    });

    logger.info(`Metrics retention policy created: ${policy.name}`);

    res.status(201).json(policy);
  } catch (error) {
    logger.error('Create metrics retention policy error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/metrics-retention-policies', [auth, adminOnly], async (req, res) => {
  try {
    const { metricType, isActive } = req.query;

    const query = {};
    if (metricType) query.metricType = metricType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const policies = await MetricsRetentionPolicy.find(query).sort({ createdAt: -1 });

    res.json(policies);
  } catch (error) {
    logger.error('Get metrics retention policies error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/metrics-retention-policies/:id', [auth, adminOnly], async (req, res) => {
  try {
    const updates = req.body;

    const policy = await MetricsRetentionPolicy.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    logger.info(`Metrics retention policy updated: ${policy.name}`);

    res.json(policy);
  } catch (error) {
    logger.error('Update metrics retention policy error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;