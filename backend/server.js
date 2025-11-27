const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const storyRoutes = require('./routes/stories');
const reelRoutes = require('./routes/reels');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const marketplaceRoutes = require('./routes/marketplace');
const callRoutes = require('./routes/calls');
const { router: notificationRoutes } = require('./routes/notifications');
const feedRoutes = require('./routes/feed');
const analyticsRoutes = require('./routes/analytics');
const pollRoutes = require('./routes/polls');
const reactionRoutes = require('./routes/reactions');
const liveStreamRoutes = require('./routes/live-streaming');
const moderationRoutes = require('./routes/moderation');
const eventRoutes = require('./routes/events');
const securityRoutes = require('./routes/security');
const hashtagRoutes = require('./routes/hashtags');
const advancedFeaturesRoutes = require('./routes/advanced-features');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000" }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexos')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/live', liveStreamRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/advanced', advancedFeaturesRoutes);
app.use('/api/ads', require('./routes/ads'));
app.use('/api/ad-analytics', require('./routes/ad-analytics'));
app.use('/api/ad-optimization', require('./routes/ad-optimization'));
app.use('/api/monetization', require('./routes/monetization'));
app.use('/api/virtual-currency', require('./routes/virtual-currency'));
app.use('/api/business', require('./routes/business'));
app.use('/api/admin/ads', require('./routes/admin-ads'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/follow', require('./routes/follow'));
app.use('/api/interactions', require('./routes/interactions'));
app.use('/api/marketplace-location', require('./routes/marketplace-location'));
app.use('/api/profile-advanced', require('./routes/profile-advanced'));
app.use('/api/comments-advanced', require('./routes/comments-advanced'));
app.use('/api/feed-advanced', require('./routes/feed-advanced'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/content-creation', require('./routes/content-creation'));
app.use('/api/marketplace-advanced', require('./routes/marketplace-advanced'));
app.use('/api/entertainment', require('./routes/entertainment'));
app.use('/api/profile-complete', require('./routes/profile-complete'));
app.use('/api/integrations', require('./routes/integrations'));

// Make io globally available
global.io = io;

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins their personal room for notifications
  socket.on('join-user-room', (userId) => {
    socket.join(userId);
    socket.userId = userId;
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send-message', (data) => {
    socket.to(data.roomId).emit('receive-message', data);
  });

  // Live streaming events
  socket.on('start-stream', (data) => {
    socket.broadcast.emit('new-live-stream', data);
  });

  socket.on('join-stream', (streamId) => {
    socket.join(`stream_${streamId}`);
  });

  socket.on('stream-chat', (data) => {
    socket.to(`stream_${data.streamId}`).emit('stream-chat-message', data);
  });

  socket.on('stream-reaction', (data) => {
    socket.to(`stream_${data.streamId}`).emit('stream-reaction', data);
  });

  // Video/Audio calls
  socket.on('video-call-offer', (data) => {
    socket.to(data.to).emit('video-call-offer', data);
  });

  socket.on('video-call-answer', (data) => {
    socket.to(data.to).emit('video-call-answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.to).emit('ice-candidate', data);
  });

  // Real-time post interactions
  socket.on('post-liked', (data) => {
    socket.broadcast.emit('post-interaction', {
      type: 'like',
      postId: data.postId,
      userId: data.userId
    });
  });

  socket.on('new-comment', (data) => {
    socket.broadcast.emit('post-interaction', {
      type: 'comment',
      postId: data.postId,
      comment: data.comment
    });
  });

  // User status updates
  socket.on('user-online', (userId) => {
    socket.broadcast.emit('user-status-change', {
      userId,
      status: 'online'
    });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      socket.broadcast.emit('user-status-change', {
        userId: socket.userId,
        status: 'offline'
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to other modules
module.exports.io = io;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Nexos Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});