const { sendEmail } = require('./email');

// Notification utility
const notificationService = {
  async sendPushNotification(userId, notification) {
    try {
      global.io?.to(userId).emit('notification', notification);
      return { success: true };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }
  },

  async sendEmailNotification(email, subject, content) {
    try {
      await sendEmail({ to: email, subject, html: content });
      return { success: true };
    } catch (error) {
      console.error('Email notification error:', error);
      return { success: false, error: error.message };
    }
  },

  async sendSMSNotification(phone, message) {
    try {
      // Twilio integration would go here
      console.log(`SMS to ${phone}: ${message}`);
      return { success: true };
    } catch (error) {
      console.error('SMS notification error:', error);
      return { success: false, error: error.message };
    }
  },

  async notifyFollowers(userId, notification) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId).populate('followers');
      
      user.followers.forEach(follower => {
        this.sendPushNotification(follower._id.toString(), notification);
      });
      
      return { success: true, count: user.followers.length };
    } catch (error) {
      console.error('Notify followers error:', error);
      return { success: false, error: error.message };
    }
  },

  async broadcastNotification(notification) {
    try {
      global.io?.emit('broadcast', notification);
      return { success: true };
    } catch (error) {
      console.error('Broadcast error:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = notificationService;
