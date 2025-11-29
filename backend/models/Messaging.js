const mongoose = require('mongoose');
const crypto = require('crypto');

const ConversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  type: { 
    type: String, 
    enum: ['direct', 'group', 'channel', 'broadcast'], 
    required: true,
    index: true
  },
  name: String,
  description: String,
  avatar: String,
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    status: { type: String, enum: ['active', 'left', 'removed', 'banned'], default: 'active' },
    permissions: {
      canSend: { type: Boolean, default: true },
      canInvite: { type: Boolean, default: false },
      canRemove: { type: Boolean, default: false },
      canEditInfo: { type: Boolean, default: false }
    },
    notifications: {
      muted: { type: Boolean, default: false },
      mutedUntil: Date
    },
    lastRead: Date,
    unreadCount: { type: Number, default: 0 }
  }],
  settings: {
    encrypted: { type: Boolean, default: true },
    disappearingMessages: {
      enabled: { type: Boolean, default: false },
      duration: Number
    },
    mediaAutoDownload: { type: Boolean, default: true },
    readReceipts: { type: Boolean, default: true },
    typing Indicators: { type: Boolean, default: true }
  },
  metadata: {
    messageCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    lastMessageAt: Date,
    lastActivity: Date
  },
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  archived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

ConversationSchema.index({ 'participants.user': 1, 'participants.status': 1 });
ConversationSchema.index({ type: 1, 'metadata.lastActivity': -1 });

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true, index: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'gif', 'poll', 'call', 'system'],
    required: true 
  },
  content: {
    text: String,
    encrypted: { type: Boolean, default: true },
    encryptedData: String,
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    formatting: mongoose.Schema.Types.Mixed
  },
  media: [{
    type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
    url: String,
    thumbnail: String,
    filename: String,
    mimeType: String,
    size: Number,
    duration: Number,
    width: Number,
    height: Number,
    encrypted: { type: Boolean, default: true }
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  forwarded: {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    conversationId: String,
    originalMessageId: String,
    count: { type: Number, default: 0 }
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'], 
    default: 'sending',
    index: true
  },
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    history: [{
      content: String,
      editedAt: Date
    }]
  },
  deleted: {
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  expiresAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
  sentAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

MessageSchema.index({ conversation: 1, sentAt: -1 });
MessageSchema.index({ sender: 1, sentAt: -1 });
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const E2EKeyPairSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: String,
  publicKey: { type: String, required: true },
  privateKeyEncrypted: { type: String, required: true },
  algorithm: { type: String, default: 'RSA-OAEP' },
  keySize: { type: Number, default: 2048 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  rotatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'E2EKeyPair' },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active', index: true }
}, { timestamps: true });

E2EKeyPairSchema.index({ userId: 1, status: 1 });

const SessionKeySchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  keyId: { type: String, required: true, unique: true },
  encryptedKeys: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    encryptedKey: String
  }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  rotationCount: { type: Number, default: 0 }
}, { timestamps: true });

SessionKeySchema.index({ conversation: 1, createdAt: -1 });

const VoiceMessageSchema = new mongoose.Schema({
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, unique: true },
  url: { type: String, required: true },
  duration: { type: Number, required: true },
  waveform: [Number],
  transcription: {
    text: String,
    language: String,
    confidence: Number,
    transcribedAt: Date
  },
  metadata: {
    sampleRate: Number,
    bitrate: Number,
    codec: String
  }
}, { timestamps: true });

const MessageAttachmentSchema = new mongoose.Schema({
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  type: { type: String, enum: ['image', 'video', 'audio', 'document', 'archive'], required: true },
  filename: { type: String, required: true },
  originalFilename: String,
  mimeType: String,
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: String,
  encrypted: { type: Boolean, default: true },
  encryptionKey: String,
  checksum: String,
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    pages: Number
  },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
  virusScanStatus: { type: String, enum: ['pending', 'clean', 'infected', 'error'], default: 'pending' }
}, { timestamps: true });

MessageAttachmentSchema.index({ message: 1 });

const TypingIndicatorSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

TypingIndicatorSchema.index({ conversation: 1, user: 1 }, { unique: true });
TypingIndicatorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const MessageDraftSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  media: [mongoose.Schema.Types.Mixed],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

MessageDraftSchema.index({ conversation: 1, user: 1 }, { unique: true });

const CallSchema = new mongoose.Schema({
  callId: { type: String, required: true, unique: true, index: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  type: { type: String, enum: ['audio', 'video'], required: true },
  mode: { type: String, enum: ['direct', 'group'], required: true },
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: Date,
    leftAt: Date,
    status: { type: String, enum: ['ringing', 'joined', 'declined', 'missed', 'left'] }
  }],
  status: { 
    type: String, 
    enum: ['ringing', 'active', 'ended', 'missed', 'declined', 'failed'],
    default: 'ringing',
    index: true
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  duration: Number,
  quality: {
    avgBitrate: Number,
    packetLoss: Number,
    jitter: Number,
    latency: Number
  },
  recording: {
    enabled: { type: Boolean, default: false },
    url: String,
    duration: Number,
    size: Number
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

CallSchema.index({ initiator: 1, startedAt: -1 });
CallSchema.index({ 'participants.user': 1 });

module.exports = {
  Conversation: mongoose.model('Conversation', ConversationSchema),
  Message: mongoose.model('Message', MessageSchema),
  E2EKeyPair: mongoose.model('E2EKeyPair', E2EKeyPairSchema),
  SessionKey: mongoose.model('SessionKey', SessionKeySchema),
  VoiceMessage: mongoose.model('VoiceMessage', VoiceMessageSchema),
  MessageAttachment: mongoose.model('MessageAttachment', MessageAttachmentSchema),
  TypingIndicator: mongoose.model('TypingIndicator', TypingIndicatorSchema),
  MessageDraft: mongoose.model('MessageDraft', MessageDraftSchema),
  Call: mongoose.model('Call', CallSchema)
};
