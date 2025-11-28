const express = require('express');
const crypto = require('crypto');
const {
  RetentionPolicy,
  DocumentArchive,
  Session,
  SecurityIncident,
  AccessReview,
  PasswordHistory,
  SecureBackup,
  EncryptionKey,
  ComplianceCheck,
  GovernancePolicy,
  LoginAttempt,
  SecurityAudit
} = require('../models/Governance');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/retention/policies', auth, async (req, res) => {
  try {
    const policy = new RetentionPolicy({
      ...req.body,
      createdBy: req.userId
    });
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/retention/policies', auth, async (req, res) => {
  try {
    const policies = await RetentionPolicy.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/archives', auth, async (req, res) => {
  try {
    const { originalId, resourceType, data, retentionPolicy } = req.body;
    
    const dataHash = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    
    const archive = new DocumentArchive({
      originalId,
      resourceType,
      data,
      dataHash,
      archivedBy: req.userId,
      retentionPolicy
    });
    
    await archive.save();
    res.status(201).json(archive);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/archives', auth, async (req, res) => {
  try {
    const { resourceType, originalId } = req.query;
    const filter = {};
    
    if (resourceType) filter.resourceType = resourceType;
    if (originalId) filter.originalId = originalId;
    
    const archives = await DocumentArchive.find(filter)
      .populate('archivedBy', 'username email')
      .sort({ archivedAt: -1 })
      .limit(100);
    
    res.json(archives);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    
    const session = new Session({
      ...req.body,
      sessionToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    await session.save();
    
    res.status(201).json({
      sessionToken,
      refreshToken,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ 
      userId: req.userId,
      active: true 
    }).sort({ lastActivity: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/sessions/:id', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    await session.terminate('user_logout');
    
    res.json({ message: 'Session terminated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/sessions', auth, async (req, res) => {
  try {
    const { exceptCurrent } = req.query;
    const filter = { userId: req.userId, active: true };
    
    if (exceptCurrent === 'true' && req.sessionId) {
      filter._id = { $ne: req.sessionId };
    }
    
    const sessions = await Session.find(filter);
    
    for (const session of sessions) {
      await session.terminate('user_logout_all');
    }
    
    res.json({ message: `Terminated ${sessions.length} sessions` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/incidents', auth, async (req, res) => {
  try {
    const incidentId = `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const incident = new SecurityIncident({
      ...req.body,
      incidentId,
      detectedBy: req.userId,
      timeline: [{
        event: 'incident_created',
        timestamp: new Date(),
        actor: req.userId,
        details: 'Security incident created'
      }]
    });
    
    await incident.save();
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/incidents', auth, async (req, res) => {
  try {
    const { status, severity, type } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    
    const incidents = await SecurityIncident.find(filter)
      .populate('detectedBy', 'username email')
      .populate('assignedTo', 'username email')
      .sort({ detectedAt: -1 });
    
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/incidents/:id', auth, async (req, res) => {
  try {
    const incident = await SecurityIncident.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    if (req.body.status && req.body.status !== incident.status) {
      incident.timeline.push({
        event: `status_changed_to_${req.body.status}`,
        timestamp: new Date(),
        actor: req.userId,
        details: `Status changed from ${incident.status} to ${req.body.status}`
      });
    }
    
    Object.assign(incident, req.body);
    
    if (req.body.status === 'resolved') {
      incident.resolvedAt = new Date();
      incident.resolvedBy = req.userId;
    }
    
    await incident.save();
    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/access-reviews', auth, async (req, res) => {
  try {
    const reviewId = `REV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const review = new AccessReview({
      ...req.body,
      reviewId,
      reviewer: req.userId
    });
    
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/access-reviews', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    const reviews = await AccessReview.find(filter)
      .populate('reviewer', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/password-history', async (req, res) => {
  try {
    const { userId, passwordHash } = req.body;
    
    const history = new PasswordHistory({
      userId,
      passwordHash
    });
    
    await history.save();
    
    await PasswordHistory.deleteMany({
      userId,
      _id: { $ne: history._id }
    }).sort({ changedAt: -1 }).skip(5);
    
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/password-history/:userId', auth, async (req, res) => {
  try {
    const history = await PasswordHistory.find({
      userId: req.params.userId
    }).sort({ changedAt: -1 }).limit(10);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/backups', auth, async (req, res) => {
  try {
    const backupId = `BKP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const backup = new SecureBackup({
      ...req.body,
      backupId,
      startedAt: new Date(),
      status: 'initiated'
    });
    
    await backup.save();
    res.status(201).json(backup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/backups', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    const backups = await SecureBackup.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(backups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/backups/:id/complete', auth, async (req, res) => {
  try {
    const backup = await SecureBackup.findById(req.params.id);
    
    if (!backup) {
      return res.status(404).json({ message: 'Backup not found' });
    }
    
    backup.status = 'completed';
    backup.completedAt = new Date();
    backup.size = req.body.size;
    backup.checksum = req.body.checksum;
    
    await backup.save();
    res.json(backup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/encryption-keys', auth, async (req, res) => {
  try {
    const keyId = crypto.randomBytes(16).toString('hex');
    
    const key = new EncryptionKey({
      ...req.body,
      keyId
    });
    
    await key.save();
    res.status(201).json({ keyId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/encryption-keys', auth, async (req, res) => {
  try {
    const { status, purpose } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (purpose) filter.purpose = purpose;
    
    const keys = await EncryptionKey.find(filter)
      .select('-keyMaterial')
      .sort({ createdAt: -1 });
    
    res.json(keys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/encryption-keys/:id/rotate', auth, async (req, res) => {
  try {
    const oldKey = await EncryptionKey.findById(req.params.id);
    
    if (!oldKey) {
      return res.status(404).json({ message: 'Encryption key not found' });
    }
    
    oldKey.status = 'rotating';
    await oldKey.save();
    
    const newKeyId = crypto.randomBytes(16).toString('hex');
    const newKey = new EncryptionKey({
      keyId: newKeyId,
      algorithm: oldKey.algorithm,
      purpose: oldKey.purpose,
      keyMaterial: req.body.keyMaterial,
      rotationSchedule: oldKey.rotationSchedule
    });
    
    await newKey.save();
    
    oldKey.status = 'retired';
    oldKey.rotationHistory.push({
      rotatedAt: new Date(),
      previousKeyId: oldKey.keyId,
      reason: req.body.reason || 'scheduled_rotation'
    });
    await oldKey.save();
    
    res.json({ oldKeyId: oldKey.keyId, newKeyId: newKey.keyId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/compliance/checks', auth, async (req, res) => {
  try {
    const check = new ComplianceCheck({
      ...req.body,
      checkedBy: req.userId
    });
    await check.save();
    res.status(201).json(check);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/compliance/checks', auth, async (req, res) => {
  try {
    const { framework, status } = req.query;
    const filter = {};
    
    if (framework) filter.framework = framework;
    if (status) filter.status = status;
    
    const checks = await ComplianceCheck.find(filter)
      .populate('checkedBy', 'username email')
      .sort({ checkedAt: -1 });
    
    res.json(checks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/policies', auth, async (req, res) => {
  try {
    const policy = new GovernancePolicy(req.body);
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/policies', auth, async (req, res) => {
  try {
    const { category, enabled } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (enabled !== undefined) filter.enabled = enabled === 'true';
    
    const policies = await GovernancePolicy.find(filter)
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login-attempts', async (req, res) => {
  try {
    const attempt = new LoginAttempt(req.body);
    await attempt.save();
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/login-attempts', auth, async (req, res) => {
  try {
    const { userId, success, from, to } = req.query;
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (success !== undefined) filter.success = success === 'true';
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const attempts = await LoginAttempt.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/audits', auth, async (req, res) => {
  try {
    const audit = new SecurityAudit({
      ...req.body,
      initiatedBy: req.userId,
      startedAt: new Date()
    });
    await audit.save();
    res.status(201).json(audit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/audits', auth, async (req, res) => {
  try {
    const { status, auditType } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (auditType) filter.auditType = auditType;
    
    const audits = await SecurityAudit.find(filter)
      .populate('initiatedBy', 'username email')
      .sort({ startedAt: -1 });
    
    res.json(audits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/audits/:id/complete', auth, async (req, res) => {
  try {
    const audit = await SecurityAudit.findById(req.params.id);
    
    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }
    
    audit.status = 'completed';
    audit.completedAt = new Date();
    audit.findings = req.body.findings || [];
    audit.summary = req.body.summary;
    
    await audit.save();
    res.json(audit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
