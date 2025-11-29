const mongoose = require('mongoose');
const crypto = require('crypto');

const LiveStreamSchema = new mongoose.Schema({
  streamId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  streamer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { 
    type: String, 
    enum: ['gaming', 'music', 'education', 'talk_show', 'sports', 'cooking', 'art', 'tech', 'other'],
    required: true,
    index: true
  },
  thumbnail: String,
  status: { 
    type: String, 
    enum: ['scheduled', 'live', 'ended', 'cancelled'], 
    default: 'scheduled',
    index: true
  },
  visibility: { type: String, enum: ['public', 'unlisted', 'private', 'followers'], default: 'public' },
  scheduledStart: Date,
  actualStart: Date,
  endedAt: Date,
  duration: Number,
  streaming: {
    rtmpUrl: String,
    streamKey: String,
    playbackUrl: String,
    hlsUrl: String,
    dashUrl: String,
    protocol: { type: String, enum: ['rtmp', 'webrtc', 'hls'], default: 'rtmp' },
    bitrate: Number,
    resolution: String,
    fps: Number,
    codec: String
  },
  viewers: {
    current: { type: Number, default: 0 },
    peak: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    unique: { type: Number, default: 0 }
  },
  engagement: {
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    superChats: { type: Number, default: 0 },
    donations: { type: Number, default: 0 }
  },
  recording: {
    enabled: { type: Boolean, default: true },
    url: String,
    duration: Number,
    size: Number,
    status: { type: String, enum: ['recording', 'processing', 'ready', 'failed'] }
  },
  monetization: {
    enabled: { type: Boolean, default: false },
    subscriptionRequired: { type: Boolean, default: false },
    minTier: Number,
    payPerView: {
      enabled: { type: Boolean, default: false },
      price: Number,
      currency: String
    },
    donations: { type: Boolean, default: true },
    superChat: { type: Boolean, default: true }
  },
  features: {
    chat: { type: Boolean, default: true },
    reactions: { type: Boolean, default: true },
    polls: { type: Boolean, default: true },
    questions: { type: Boolean, default: true }
  },
  moderation: {
    slowMode: { type: Number, default: 0 },
    subscribersOnly: { type: Boolean, default: false },
    followersOnly: { type: Boolean, default: false },
    minAccountAge: Number,
    blockedWords: [String]
  },
  tags: [String],
  language: String,
  ageRestricted: { type: Boolean, default: false },
  location: {
    country: String,
    city: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

LiveStreamSchema.index({ streamer: 1, status: 1 });
LiveStreamSchema.index({ category: 1, status: 1 });
LiveStreamSchema.index({ scheduledStart: 1 });

const StreamViewerSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  anonymousId: String,
  joinedAt: { type: Date, default: Date.now },
  leftAt: Date,
  watchTime: Number,
  device: {
    type: { type: String, enum: ['desktop', 'mobile', 'tablet', 'tv', 'other'] },
    os: String,
    browser: String
  },
  quality: {
    selected: String,
    buffering: { type: Number, default: 0 },
    errors: { type: Number, default: 0 }
  },
  engagement: {
    messaged: { type: Boolean, default: false },
    liked: { type: Boolean, default: false },
    shared: { type: Boolean, default: false },
    donated: { type: Boolean, default: false }
  },
  location: {
    country: String,
    city: String
  }
}, { timestamps: true });

StreamViewerSchema.index({ stream: 1, joinedAt: -1 });
StreamViewerSchema.index({ viewer: 1, stream: 1 });

const StreamChatSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['message', 'super_chat', 'donation', 'subscription', 'gift', 'milestone', 'system'],
    default: 'message' 
  },
  content: String,
  amount: Number,
  currency: String,
  highlighted: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false, index: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  emotes: [String],
  badges: [String],
  reactions: [{
    emoji: String,
    count: Number
  }],
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

StreamChatSchema.index({ stream: 1, timestamp: -1 });
StreamChatSchema.index({ sender: 1, timestamp: -1 });

const StreamPollSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  question: { type: String, required: true },
  options: [{
    text: String,
    votes: { type: Number, default: 0 },
    voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  multipleChoice: { type: Boolean, default: false },
  duration: Number,
  startedAt: { type: Date, default: Date.now },
  endsAt: Date,
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  totalVotes: { type: Number, default: 0 }
}, { timestamps: true });

StreamPollSchema.index({ stream: 1, startedAt: -1 });

const StreamAnalyticsSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  metrics: {
    viewerCount: Number,
    chatMessagesPerMinute: Number,
    likesPerMinute: Number,
    averageWatchTime: Number,
    bitrate: Number,
    fps: Number,
    droppedFrames: Number,
    bufferingRate: Number
  },
  demographics: {
    countries: mongoose.Schema.Types.Mixed,
    devices: mongoose.Schema.Types.Mixed,
    referrers: mongoose.Schema.Types.Mixed
  },
  revenue: {
    superChats: Number,
    donations: Number,
    subscriptions: Number,
    ads: Number
  }
}, { timestamps: true });

StreamAnalyticsSchema.index({ stream: 1, timestamp: -1 });
StreamAnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const StreamHighlightSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  title: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  duration: Number,
  thumbnail: String,
  url: String,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' }
}, { timestamps: true });

StreamHighlightSchema.index({ stream: 1, createdAt: -1 });

const StreamModerationSchema = new mongoose.Schema({
  stream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true, index: true },
  moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { 
    type: String, 
    enum: ['timeout', 'ban', 'unban', 'delete_message', 'slow_mode', 'subscribers_only'],
    required: true 
  },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  duration: Number,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

StreamModerationSchema.index({ stream: 1, timestamp: -1 });

module.exports = {
  LiveStream: mongoose.model('LiveStream', LiveStreamSchema),
  StreamViewer: mongoose.model('StreamViewer', StreamViewerSchema),
  StreamChat: mongoose.model('StreamChat', StreamChatSchema),
  StreamPoll: mongoose.model('StreamPoll', StreamPollSchema),
  StreamAnalytics: mongoose.model('StreamAnalytics', StreamAnalyticsSchema),
  StreamHighlight: mongoose.model('StreamHighlight', StreamHighlightSchema),
  StreamModeration: mongoose.model('StreamModeration', StreamModerationSchema)
};
