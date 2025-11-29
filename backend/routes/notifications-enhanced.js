const express = require('express');
const {
  NotificationPreference,
  PushToken,
  NotificationBatch,
  NotificationQueue,
  NotificationTemplate,
  NotificationAnalytics,
  InAppNotification
} = require('../models/EnhancedNotifications');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/preferences', auth, async (req, res) => {
  try {
    let preferences = await NotificationPreference.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId: req.userId });
      await preferences.save();
    }
    
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/preferences', auth, async (req, res) => {
  try {
    let preferences = await NotificationPreference.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId: req.userId });
    }
    
    Object.assign(preferences, req.body);
    await preferences.save();
    
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/tokens', auth, async (req, res) => {
  try {
    let token = await PushToken.findOne({
      userId: req.userId,
      token: req.body.token
    });
    
    if (token) {
      token.active = true;
      token.lastUsed = new Date();
      token.failureCount = 0;
    } else {
      token = new PushToken({
        userId: req.userId,
        ...req.body
      });
    }
    
    await token.save();
    
    res.json(token);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/tokens', auth, async (req, res) => {
  try {
    const tokens = await PushToken.find({
      userId: req.userId,
      active: true
    }).sort({ lastUsed: -1 });
    
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/tokens/:id', auth, async (req, res) => {
  try {
    const token = await PushToken.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }
    
    token.active = false;
    await token.save();
    
    res.json({ message: 'Token deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/batches', auth, async (req, res) => {
  try {
    const batch = new NotificationBatch({
      batchId: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      createdBy: req.userId
    });
    
    await batch.save();
    
    const queue = new NotificationQueue({
      queueId: `QUEUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      batch: batch._id,
      recipients: batch.recipients.userIds,
      channels: batch.channels,
      payload: {
        title: batch.title,
        message: batch.message,
        data: batch.data
      },
      priority: batch.priority || 'normal'
    });
    
    await queue.save();
    
    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/batches', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const filter = { createdBy: req.userId };
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    const batches = await NotificationBatch.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await NotificationBatch.countDocuments(filter);
    
    res.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/batches/:id', auth, async (req, res) => {
  try {
    const batch = await NotificationBatch.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/batches/:id/send', auth, async (req, res) => {
  try {
    const batch = await NotificationBatch.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    batch.status = 'sending';
    batch.progress.sentCount = 0;
    batch.progress.startedAt = new Date();
    await batch.save();
    
    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/queue', auth, async (req, res) => {
  try {
    const { status, priority } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    const queue = await NotificationQueue.find(filter)
      .sort({ priority: -1, scheduledFor: 1 })
      .limit(limit)
      .populate('batch', 'title type');
    
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/queue/:id/process', auth, async (req, res) => {
  try {
    const queueItem = await NotificationQueue.findById(req.params.id);
    
    if (!queueItem) {
      return res.status(404).json({ message: 'Queue item not found' });
    }
    
    queueItem.status = 'processing';
    queueItem.lastAttempt = new Date();
    queueItem.attempts += 1;
    await queueItem.save();
    
    res.json(queueItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/templates', auth, async (req, res) => {
  try {
    const template = new NotificationTemplate({
      templateId: `TMPL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      createdBy: req.userId
    });
    
    await template.save();
    
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/templates', auth, async (req, res) => {
  try {
    const { category, channel } = req.query;
    
    const filter = {
      $or: [
        { createdBy: req.userId },
        { isPublic: true }
      ],
      active: true
    };
    
    if (category) filter.category = category;
    if (channel) filter[`channels.${channel}`] = { $exists: true };
    
    const templates = await NotificationTemplate.find(filter)
      .sort({ useCount: -1 });
    
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await NotificationTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    template.useCount += 1;
    await template.save();
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/templates/:id', auth, async (req, res) => {
  try {
    const template = await NotificationTemplate.findOne({
      _id: req.params.id,
      createdBy: req.userId
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    Object.assign(template, req.body);
    template.version += 1;
    await template.save();
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/in-app', auth, async (req, res) => {
  try {
    const { read, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const filter = {
      recipient: req.userId,
      deleted: false
    };
    
    if (read !== undefined) filter.read = read === 'true';
    if (category) filter.category = category;
    
    const notifications = await InAppNotification.find(filter)
      .sort({ priority: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name avatar');
    
    const total = await InAppNotification.countDocuments(filter);
    const unreadCount = await InAppNotification.countDocuments({
      recipient: req.userId,
      read: false,
      deleted: false
    });
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/in-app', auth, async (req, res) => {
  try {
    const notification = new InAppNotification({
      notificationId: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...req.body,
      sender: req.userId
    });
    
    await notification.save();
    
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/in-app/:id/read', auth, async (req, res) => {
  try {
    const notification = await InAppNotification.findOne({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/in-app/mark-all-read', auth, async (req, res) => {
  try {
    await InAppNotification.updateMany(
      { recipient: req.userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/in-app/:id', auth, async (req, res) => {
  try {
    const notification = await InAppNotification.findOne({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.deleted = true;
    await notification.save();
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/in-app/:id/action', auth, async (req, res) => {
  try {
    const notification = await InAppNotification.findOne({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.actionTaken = req.body.action;
    notification.actionedAt = new Date();
    await notification.save();
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate, channel } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const filter = {};
    if (Object.keys(dateFilter).length) {
      filter.createdAt = dateFilter;
    }
    
    const totalSent = await InAppNotification.countDocuments(filter);
    const totalDelivered = await InAppNotification.countDocuments({ ...filter, delivered: true });
    const totalOpened = await InAppNotification.countDocuments({ ...filter, read: true });
    const totalActioned = await InAppNotification.countDocuments({ ...filter, actionTaken: { $exists: true } });
    
    const analytics = new NotificationAnalytics({
      period: {
        start: startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: endDate ? new Date(endDate) : new Date()
      },
      channel: channel || 'in_app',
      totalSent,
      totalDelivered,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent * 100).toFixed(2) : 0,
      totalOpened,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered * 100).toFixed(2) : 0,
      totalActioned,
      clickRate: totalOpened > 0 ? (totalActioned / totalOpened * 100).toFixed(2) : 0
    });
    
    await analytics.save();
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
