const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const Appeal = require('../models/Appeal');
const TakedownRequest = require('../models/TakedownRequest');
const PolicyVersion = require('../models/PolicyVersion');
const CookieConsent = require('../models/CookieConsent');
const DataExportJob = require('../models/DataExportJob');
const ActivityLog = require('../models/ActivityLog');
const ParentalControl = require('../models/ParentalControl');
const dataExportService = require('../services/dataExportService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

router.post('/appeals', auth, validate(schemas.appeal), async (req, res) => {
  try {
    const appeal = await Appeal.create({
      reporter: req.user.id,
      ...req.validatedData,
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await ActivityLog.create({
      user: req.user.id,
      action: 'appeal_submitted',
      targetType: appeal.contentType,
      targetId: appeal.contentId,
      metadata: { appealId: appeal._id }
    });

    res.status(201).json(appeal);
  } catch (error) {
    logger.error('Appeal creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/appeals', auth, async (req, res) => {
  try {
    const appeals = await Appeal.find({ reporter: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(appeals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/appeals/:id', auth, async (req, res) => {
  try {
    const appeal = await Appeal.findOne({
      _id: req.params.id,
      reporter: req.user.id
    });

    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }

    res.json(appeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/takedown-requests', validate(schemas.takedownRequest), async (req, res) => {
  try {
    const takedown = await TakedownRequest.create(req.validatedData);

    if (takedown.contentOwner) {
      await emailService.sendEmail({
        to: {
          userId: takedown.contentOwner,
          email: req.body.requester.email
        },
        templateKey: 'takedown_notice',
        variables: {
          requestType: takedown.requestType,
          reason: takedown.reason
        }
      });
    }

    res.status(201).json(takedown);
  } catch (error) {
    logger.error('Takedown request error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/policies/:type', async (req, res) => {
  try {
    const policy = await PolicyVersion.findOne({
      type: req.params.type,
      isActive: true
    }).sort({ effectiveDate: -1 });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/policies/:type/versions', async (req, res) => {
  try {
    const versions = await PolicyVersion.find({
      type: req.params.type
    }).sort({ effectiveDate: -1 });

    res.json(versions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cookie-consent', validate(schemas.cookieConsent), async (req, res) => {
  try {
    const consent = await CookieConsent.create({
      user: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      ...req.validatedData,
      consentVersion: '1.0',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    res.json(consent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/data-export', auth, validate(schemas.dataExport), async (req, res) => {
  try {
    const job = await dataExportService.createExportJob(
      req.user.id,
      req.validatedData.exportType,
      req.validatedData
    );

    res.status(202).json({
      message: 'Export job created',
      jobId: job._id,
      status: job.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/data-export/:jobId', auth, async (req, res) => {
  try {
    const job = await DataExportJob.findOne({
      _id: req.params.jobId,
      user: req.user.id
    });

    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/data-export/download/:token', async (req, res) => {
  try {
    const { filePath, filename } = await dataExportService.downloadExport(req.params.token);
    res.download(filePath, filename);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/activity-log', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const query = { user: req.user.id };
    
    if (action) query.action = action;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      logs,
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

router.post('/parental-control', auth, validate(schemas.parentalControl), async (req, res) => {
  try {
    const existingControl = await ParentalControl.findOne({
      childAccount: req.validatedData.childAccountId
    });

    if (existingControl) {
      return res.status(400).json({ error: 'Parental control already exists' });
    }

    const control = await ParentalControl.create({
      childAccount: req.validatedData.childAccountId,
      guardianAccount: req.user.id,
      settings: req.validatedData.settings,
      verificationStatus: 'pending'
    });

    res.status(201).json(control);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/parental-control/:childId', auth, async (req, res) => {
  try {
    const control = await ParentalControl.findOne({
      childAccount: req.params.childId,
      guardianAccount: req.user.id
    }).populate('childAccount', 'username fullName avatar');

    if (!control) {
      return res.status(404).json({ error: 'Parental control not found' });
    }

    res.json(control);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/parental-control/:childId/settings', auth, async (req, res) => {
  try {
    const control = await ParentalControl.findOne({
      childAccount: req.params.childId,
      guardianAccount: req.user.id
    });

    if (!control) {
      return res.status(404).json({ error: 'Parental control not found' });
    }

    Object.assign(control.settings, req.body.settings);
    control.accessLog.push({
      action: 'settings_updated',
      timestamp: new Date(),
      details: req.body.settings
    });

    await control.save();

    res.json(control);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
