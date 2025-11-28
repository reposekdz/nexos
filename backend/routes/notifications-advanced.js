const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const MutedEntity = require('../models/MutedEntity');
const PushSubscription = require('../models/PushSubscription');
const EmailQueue = require('../models/EmailQueue');
const pushNotificationService = require('../services/pushNotificationService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const notificationBatchingService = require('../services/notificationBatchingService');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    const query = { recipient: req.user.id };
    
    if (type) query.type = type;
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'username fullName avatar');

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });

    res.json({
      notifications,
      unreadCount,
      page: parseInt(page),
      hasMore: notifications.length === parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mute', auth, async (req, res) => {
  try {
    const { entityType, entityId, muteType, duration } = req.body;

    const expiresAt = duration 
      ? new Date(Date.now() + duration * 1000)
      : undefined;

    const muted = await MutedEntity.create({
      user: req.user.id,
      entityType,
      entityId,
      muteType: muteType || 'notifications',
      expiresAt
    });

    res.json(muted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/mute/:id', auth, async (req, res) => {
  try {
    await MutedEntity.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    res.json({ message: 'Unmuted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/muted', auth, async (req, res) => {
  try {
    const muted = await MutedEntity.find({
      user: req.user.id
    });

    res.json(muted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/push/subscribe', auth, async (req, res) => {
  try {
    const { subscription, deviceInfo } = req.body;

    const pushSub = await pushNotificationService.subscribe(
      req.user.id,
      subscription,
      deviceInfo
    );

    res.json(pushSub);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/push/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;

    await pushNotificationService.unsubscribe(req.user.id, endpoint);

    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/push/subscriptions', auth, async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({
      user: req.user.id,
      isActive: true
    });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/push/subscriptions/:id/preferences', auth, async (req, res) => {
  try {
    const subscription = await PushSubscription.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { preferences: req.body.preferences } },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-push', auth, async (req, res) => {
  try {
    const result = await pushNotificationService.sendPushNotification(
      req.user.id,
      {
        title: 'Test Notification',
        message: 'This is a test push notification',
        priority: 'normal'
      }
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-email', auth, async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.user.id);

    const result = await emailService.sendEmail({
      to: {
        email: user.email,
        name: user.fullName,
        userId: user._id
      },
      templateKey: 'test_email',
      variables: {
        userName: user.fullName,
        testMessage: 'This is a test email notification'
      }
    });

    res.json({ message: 'Test email queued', jobId: result._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-sms', auth, async (req, res) => {
  try {
    const result = await smsService.sendOTP(req.user.id, 'test');

    res.json({ message: 'Test SMS sent', result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/delivery-status/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const deliveryAttempts = await require('../models/NotificationDeliveryAttempt').find({
      notification: notification._id
    });

    res.json({
      notification,
      deliveryStatus: notification.deliveryStatus,
      attempts: deliveryAttempts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
