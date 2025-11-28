const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const { xssProtection, mongoSanitize, hpp } = require('./middleware/security');
const { etagMiddleware } = require('./middleware/etag');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO Configuration for all platforms
const io = socketIO(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL_WEB,
      process.env.CLIENT_URL_DESKTOP,
      process.env.CLIENT_URL_MOBILE,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security Middleware
app.use(helmet());
app.use(xssProtection);
app.use(mongoSanitize);
app.use(hpp);
app.use(compression());
app.use(cors({
  origin: [
    process.env.CLIENT_URL_WEB,
    process.env.CLIENT_URL_DESKTOP,
    process.env.CLIENT_URL_MOBILE,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// ETag support
app.use(etagMiddleware);

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('✅ MongoDB Connected'))
.catch(err => logger.error('❌ MongoDB Error:', err));

// Redis Connection
connectRedis();

// Socket.IO Real-time Events
const onlineUsers = new Map();

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // User authentication
  socket.on('authenticate', (userId) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    io.emit('user-online', userId);
  });
  
  // Messaging
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.userId} joined room ${roomId}`);
  });
  
  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', data);
  });
  
  socket.on('typing', (data) => {
    socket.to(data.room).emit('user-typing', data);
  });
  
  socket.on('stop-typing', (data) => {
    socket.to(data.room).emit('user-stop-typing', data);
  });
  
  // Video/Audio Calls
  socket.on('call-user', (data) => {
    const recipientSocket = onlineUsers.get(data.to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('incoming-call', {
        from: socket.userId,
        signal: data.signal,
        callType: data.callType
      });
    }
  });
  
  socket.on('accept-call', (data) => {
    const callerSocket = onlineUsers.get(data.to);
    if (callerSocket) {
      io.to(callerSocket).emit('call-accepted', data.signal);
    }
  });
  
  socket.on('reject-call', (data) => {
    const callerSocket = onlineUsers.get(data.to);
    if (callerSocket) {
      io.to(callerSocket).emit('call-rejected');
    }
  });
  
  // Live Streaming
  socket.on('start-stream', (streamData) => {
    socket.broadcast.emit('stream-started', streamData);
  });
  
  socket.on('join-stream', (streamId) => {
    socket.join(`stream-${streamId}`);
  });
  
  socket.on('stream-message', (data) => {
    io.to(`stream-${data.streamId}`).emit('stream-chat-message', data);
  });
  
  // Notifications
  socket.on('send-notification', (data) => {
    const recipientSocket = onlineUsers.get(data.userId);
    if (recipientSocket) {
      io.to(recipientSocket).emit('notification', data);
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('user-offline', socket.userId);
    }
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/events', require('./routes/events'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/pages', require('./routes/business'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notifications-advanced', require('./routes/notifications-advanced'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/live', require('./routes/live-streaming'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/moderation'));
app.use('/api/search', require('./routes/feed'));
app.use('/api/feed', require('./routes/feed-enhanced'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/experiments', require('./routes/experiments'));
app.use('/api/monitoring', require('./routes/monitoring'));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    platform: 'All (Web, Mobile, Desktop)',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start background jobs
require('./jobs/backgroundJobs');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Nexos Backend Server running on port ${PORT}`);
  logger.info(`📱 Supporting: Web, Mobile (iOS/Android), Desktop (Windows/Mac/Linux)`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV}`);
  logger.info(`✅ All advanced features (181-240) enabled`);
  
  const monitoringService = require('./services/monitoringService');
  monitoringService.startSystemMetricsCollection();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io, server };
