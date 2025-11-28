const express = require('express');
const crypto = require('crypto');
const {
  AuditLedger,
  ExportManifest,
  ApprovalRequest,
  Role,
  Permission,
  JITAccess,
  DSARRequest,
  PIIDiscovery,
  DataLineage,
  ConfigChangeLog,
  ReconciliationRecord
} = require('../models/CompliancePrivacy');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/audit/log', auth, async (req, res) => {
  try {
    const entry = await AuditLedger.append({
      userId: req.body.userId,
      actor: req.userId,
      action: req.body.action,
      resourceType: req.body.resourceType,
      resourceId: req.body.resourceId,
      changes: req.body.changes,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: req.body.metadata
    });
    
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/audit/logs', auth, async (req, res) => {
  try {
    const { userId, resourceType, resourceId, from, to } = req.query;
    const filter = {};
    
    if (userId) filter.userId = userId;
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    
    const logs = await AuditLedger.find(filter)
      .populate('actor', 'username email')
      .sort({ sequenceNumber: -1 })
      .limit(1000);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/audit/verify', async (req, res) => {
  try {
    const { sequenceNumber } = req.body;
    
    const entry = await AuditLedger.findOne({ sequenceNumber });
    if (!entry) {
      return res.status(404).json({ message: 'Audit entry not found' });
    }
    
    if (sequenceNumber > 1) {
      const previousEntry = await AuditLedger.findOne({ sequenceNumber: sequenceNumber - 1 });
      
      if (previousEntry && entry.previousHash !== previousEntry.currentHash) {
        return res.json({ 
          valid: false, 
          message: 'Hash chain broken',
          entry 
        });
      }
    }
    
    const entryData = JSON.stringify({
      userId: entry.userId,
      actor: entry.actor,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      changes: entry.changes,
      sequenceNumber: entry.sequenceNumber,
      previousHash: entry.previousHash,
      timestamp: entry.timestamp
    });
    
    const computedHash = crypto.createHash('sha256').update(entryData).digest('hex');
    
    res.json({ 
      valid: computedHash === entry.currentHash,
      entry,
      computedHash
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/exports', auth, async (req, res) => {
  try {
    const exportId = `EXP-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    
    const manifest = new ExportManifest({
      exportId,
      userId: req.body.userId,
      requestedBy: req.userId,
      dataTypes: req.body.dataTypes,
      dateRange: req.body.dateRange,
      format: req.body.format || 'json'
    });
    
    await manifest.save();
    
    res.status(201).json(manifest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/exports/:exportId', auth, async (req, res) => {
  try {
    const manifest = await ExportManifest.findOne({ exportId: req.params.exportId });
    if (!manifest) {
      return res.status(404).json({ message: 'Export not found' });
    }
    
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/exports/:exportId/complete', auth, async (req, res) => {
  try {
    const { fileUrl, fileHash, fileSize, recordCount } = req.body;
    
    const manifest = await ExportManifest.findOne({ exportId: req.params.exportId });
    if (!manifest) {
      return res.status(404).json({ message: 'Export not found' });
    }
    
    const dataToSign = JSON.stringify({ 
      exportId: manifest.exportId,
      fileHash,
      recordCount,
      completedAt: new Date()
    });
    
    const signature = crypto.createHmac('sha256', process.env.EXPORT_SECRET || 'secret')
      .update(dataToSign)
      .digest('hex');
    
    manifest.status = 'completed';
    manifest.fileUrl = fileUrl;
    manifest.fileHash = fileHash;
    manifest.fileSize = fileSize;
    manifest.recordCount = recordCount;
    manifest.signature = signature;
    manifest.signatureAlgorithm = 'hmac-sha256';
    manifest.completedAt = new Date();
    manifest.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await manifest.save();
    
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approvals', auth, async (req, res) => {
  try {
    const requestId = `APR-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    
    const approval = new ApprovalRequest({
      requestId,
      requestedBy: req.userId,
      action: req.body.action,
      resourceType: req.body.resourceType,
      resourceId: req.body.resourceId,
      details: req.body.details,
      requiredApprovals: req.body.requiredApprovals || 2,
      expiresAt: req.body.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    await approval.save();
    res.status(201).json(approval);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/approvals', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    
    const approvals = await ApprovalRequest.find(filter)
      .populate('requestedBy', 'username email')
      .populate('approvals.approver', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/approvals/:requestId/approve', auth, async (req, res) => {
  try {
    const { approved, reason } = req.body;
    
    const approval = await ApprovalRequest.findOne({ requestId: req.params.requestId });
    if (!approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }
    
    if (approval.status !== 'pending') {
      return res.status(400).json({ message: 'Approval request is not pending' });
    }
    
    approval.approvals.push({
      approver: req.userId,
      approved,
      reason,
      timestamp: new Date()
    });
    
    if (approval.isApproved()) {
      approval.status = 'approved';
    } else {
      const rejections = approval.approvals.filter(a => a.approved === false).length;
      if (rejections > 0) {
        approval.status = 'rejected';
      }
    }
    
    await approval.save();
    res.json(approval);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/roles', auth, async (req, res) => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({ enabled: true })
      .populate('inherits', 'name permissions');
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/permissions', auth, async (req, res) => {
  try {
    const permission = new Permission({
      userId: req.body.userId,
      resourceType: req.body.resourceType,
      resourceId: req.body.resourceId,
      actions: req.body.actions,
      constraints: req.body.constraints,
      grantedBy: req.userId,
      expiresAt: req.body.expiresAt
    });
    
    await permission.save();
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/permissions/:userId', async (req, res) => {
  try {
    const permissions = await Permission.find({
      userId: req.params.userId,
      revoked: false,
      $or: [
        { expiresAt: { $gte: new Date() } },
        { expiresAt: null }
      ]
    });
    
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/jit-access', auth, async (req, res) => {
  try {
    const access = new JITAccess({
      userId: req.body.userId,
      role: req.body.role,
      permissions: req.body.permissions,
      reason: req.body.reason,
      approvedBy: req.userId,
      expiresAt: req.body.expiresAt || new Date(Date.now() + 4 * 60 * 60 * 1000)
    });
    
    await access.save();
    res.status(201).json(access);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/jit-access/:userId', async (req, res) => {
  try {
    const access = await JITAccess.find({
      userId: req.params.userId,
      active: true,
      expiresAt: { $gte: new Date() }
    }).populate('approvedBy', 'username email');
    
    res.json(access);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/dsar', auth, async (req, res) => {
  try {
    const requestId = `DSAR-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    
    const request = new DSARRequest({
      requestId,
      userId: req.userId,
      type: req.body.type,
      dataTypes: req.body.dataTypes
    });
    
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dsar', auth, async (req, res) => {
  try {
    const requests = await DSARRequest.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/dsar/:requestId/process', auth, async (req, res) => {
  try {
    const { step, details } = req.body;
    
    const request = await DSARRequest.findOne({ requestId: req.params.requestId });
    if (!request) {
      return res.status(404).json({ message: 'DSAR request not found' });
    }
    
    request.processingLog.push({
      step,
      completedAt: new Date(),
      details
    });
    
    if (step === 'completed') {
      request.status = 'completed';
      request.completedAt = new Date();
    }
    
    await request.save();
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/pii-discovery/scan', auth, async (req, res) => {
  try {
    const { collection, field, piiType, classification } = req.body;
    
    const discovery = await PIIDiscovery.findOneAndUpdate(
      { collection, field },
      {
        collection,
        field,
        piiType,
        classification,
        lastScanned: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(discovery);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/pii-discovery', async (req, res) => {
  try {
    const discoveries = await PIIDiscovery.find()
      .sort({ classification: -1, collection: 1 });
    res.json(discoveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/data-lineage', auth, async (req, res) => {
  try {
    const lineage = new DataLineage(req.body);
    await lineage.save();
    res.status(201).json(lineage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/data-lineage/:datasetId', async (req, res) => {
  try {
    const lineage = await DataLineage.findOne({ datasetId: req.params.datasetId });
    res.json(lineage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/config-changes', auth, async (req, res) => {
  try {
    const change = new ConfigChangeLog({
      service: req.body.service,
      environment: req.body.environment,
      configKey: req.body.configKey,
      previousValue: req.body.previousValue,
      newValue: req.body.newValue,
      changedBy: req.userId,
      reason: req.body.reason,
      approvalId: req.body.approvalId
    });
    
    await change.save();
    res.status(201).json(change);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/config-changes', async (req, res) => {
  try {
    const { service, environment } = req.query;
    const filter = {};
    
    if (service) filter.service = service;
    if (environment) filter.environment = environment;
    
    const changes = await ConfigChangeLog.find(filter)
      .populate('changedBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(1000);
    
    res.json(changes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reconciliation', auth, async (req, res) => {
  try {
    const record = new ReconciliationRecord(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reconciliation', async (req, res) => {
  try {
    const { type, status, from, to } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (from) filter.periodStart = { $gte: new Date(from) };
    if (to) filter.periodEnd = { $lte: new Date(to) };
    
    const records = await ReconciliationRecord.find(filter)
      .populate('reconciledBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
