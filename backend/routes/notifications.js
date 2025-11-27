const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const webpush = require('web-push');
const router = express.Router();

// Configure web push
webpush.setVapidDetails(
  'mailto:admin@nexos.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all' } = req.query;
    
    let query = { recipient: req.userId };
    
    if (filter === 'unread') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('sender', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);
    
    const unreadCount = await Notification.countDocuments({
      recipient: req.userId,
      isRead: false
    });
    
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create notification (internal use)
const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    await notification.populate('sender', 'username fullName avatar');
    
    // Emit real-time notification
    const io = require('../server').io;
    io.to(data.recipient.toString()).emit('new-notification', notification);
    
    // Send push notification if user has subscription
    const User = require('../models/User');
    const user = await User.findById(data.recipient);
    
    if (user.pushSubscription) {
      const payload = JSON.stringify({
        title: data.title,
        body: data.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: { url: data.data?.url || '/' }
      });
      
      try {
        await webpush.sendNotification(user.pushSubscription, payload);
      } catch (pushError) {
        console.error('Push notification failed:', pushError);
      }
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.userId, {
      pushSubscription: subscription
    });
    
    res.json({ message: 'Subscription saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper functions for different notification types
const notificationHelpers = {
  like: async (postId, likerId, postAuthorId) => {
    if (likerId.toString() === postAuthorId.toString()) return;
    
    const Post = require('../models/Post');
    const post = await Post.findById(postId);
    
    await createNotification({
      recipient: postAuthorId,
      sender: likerId,
      type: 'like',
      title: 'New Like',
      message: 'liked your post',
      data: { postId, url: `/post/${postId}` }
    });
  },
  
  comment: async (postId, commenterId, postAuthorId) => {
    if (commenterId.toString() === postAuthorId.toString()) return;
    
    await createNotification({
      recipient: postAuthorId,
      sender: commenterId,
      type: 'comment',
      title: 'New Comment',
      message: 'commented on your post',
      data: { postId, url: `/post/${postId}` }
    });
  },
  
  follow: async (followerId, followedId) => {
    await createNotification({
      recipient: followedId,
      sender: followerId,
      type: 'follow',
      title: 'New Follower',
      message: 'started following you',
      data: { url: `/profile/${followerId}` }
    });
  },
  
  groupInvite: async (inviterId, invitedId, groupId) => {
    const Group = require('../models/Group');
    const group = await Group.findById(groupId);
    
    await createNotification({
      recipient: invitedId,
      sender: inviterId,
      type: 'group_invite',
      title: 'Group Invitation',
      message: `invited you to join ${group.name}`,
      data: { groupId, url: `/groups/${groupId}` }
    });
  }
};

module.exports = { router, createNotification, notificationHelpers };