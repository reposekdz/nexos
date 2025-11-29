const mongoose = require('mongoose');

const CommunityGroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['technology', 'business', 'education', 'entertainment', 'sports', 'health', 'lifestyle', 'other'],
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['public', 'private', 'secret'], 
    default: 'public',
    index: true
  },
  avatar: String,
  cover: String,
  banner: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  memberCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },
  settings: {
    requireApproval: { type: Boolean, default: false },
    whoCanPost: { type: String, enum: ['anyone', 'members', 'admins'], default: 'members' },
    whoCanInvite: { type: String, enum: ['anyone', 'members', 'admins'], default: 'members' },
    postApproval: { type: Boolean, default: false },
    hideMembers: { type: Boolean, default: false },
    allowDiscussions: { type: Boolean, default: true },
    allowEvents: { type: Boolean, default: true },
    allowPolls: { type: Boolean, default: true }
  },
  rules: [{
    title: String,
    description: String,
    order: Number
  }],
  tags: [String],
  location: {
    city: String,
    country: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  verified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  statistics: {
    totalViews: { type: Number, default: 0 },
    weeklyActiveMembers: { type: Number, default: 0 },
    monthlyActiveMembers: { type: Number, default: 0 },
    avgEngagementRate: Number
  },
  status: { type: String, enum: ['active', 'archived', 'suspended'], default: 'active', index: true }
}, { timestamps: true });

CommunityGroupSchema.index({ name: 'text', description: 'text', tags: 'text' });
CommunityGroupSchema.index({ category: 1, memberCount: -1 });

const GroupMemberSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { 
    type: String, 
    enum: ['owner', 'admin', 'moderator', 'member'], 
    default: 'member',
    index: true
  },
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['active', 'invited', 'requested', 'banned', 'left'], 
    default: 'active',
    index: true
  },
  permissions: {
    canPost: { type: Boolean, default: true },
    canComment: { type: Boolean, default: true },
    canInvite: { type: Boolean, default: false },
    canRemoveMembers: { type: Boolean, default: false },
    canEditInfo: { type: Boolean, default: false },
    canManageRoles: { type: Boolean, default: false }
  },
  notifications: {
    allPosts: { type: Boolean, default: false },
    mentions: { type: Boolean, default: true },
    events: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },
  activity: {
    postCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    lastActive: Date,
    engagementScore: { type: Number, default: 0 }
  },
  customRole: String,
  badges: [String],
  notes: String
}, { timestamps: true });

GroupMemberSchema.index({ group: 1, user: 1 }, { unique: true });
GroupMemberSchema.index({ user: 1, status: 1 });

const GroupPostSchema = new mongoose.Schema({
  postId: { type: String, required: true, unique: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['text', 'image', 'video', 'link', 'poll', 'event', 'announcement'], 
    default: 'text' 
  },
  title: String,
  content: String,
  media: [{
    type: { type: String, enum: ['image', 'video', 'document'] },
    url: String,
    thumbnail: String
  }],
  poll: {
    question: String,
    options: [{
      text: String,
      votes: { type: Number, default: 0 },
      voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }],
    multipleChoice: { type: Boolean, default: false },
    expiresAt: Date
  },
  tags: [String],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  requiresApproval: { type: Boolean, default: false },
  approved: { type: Boolean, default: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  engagement: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  visibility: { type: String, enum: ['public', 'members', 'admins'], default: 'members' },
  status: { type: String, enum: ['active', 'deleted', 'hidden', 'reported'], default: 'active', index: true }
}, { timestamps: true });

GroupPostSchema.index({ group: 1, createdAt: -1 });
GroupPostSchema.index({ author: 1, createdAt: -1 });

const GroupEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['online', 'in_person', 'hybrid'], required: true },
  startDate: { type: Date, required: true, index: true },
  endDate: Date,
  location: {
    venue: String,
    address: String,
    city: String,
    country: String,
    coordinates: [Number],
    onlineLink: String
  },
  cover: String,
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'interested', 'not_going'], default: 'going' },
    respondedAt: Date
  }],
  maxAttendees: Number,
  registrationRequired: { type: Boolean, default: false },
  registrationDeadline: Date,
  visibility: { type: String, enum: ['public', 'members', 'invited'], default: 'members' },
  reminders: [{
    type: { type: String, enum: ['email', 'push', 'sms'] },
    timing: Number,
    sent: { type: Boolean, default: false }
  }],
  status: { 
    type: String, 
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], 
    default: 'upcoming',
    index: true
  },
  tags: [String]
}, { timestamps: true });

GroupEventSchema.index({ group: 1, startDate: 1 });

const GroupInvitationSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  invitedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'expired'], 
    default: 'pending',
    index: true
  },
  message: String,
  invitedAt: { type: Date, default: Date.now },
  respondedAt: Date,
  expiresAt: Date
}, { timestamps: true });

GroupInvitationSchema.index({ group: 1, invitedUser: 1 }, { unique: true });
GroupInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GroupJoinRequestSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: String,
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending',
    index: true
  },
  requestedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String
}, { timestamps: true });

GroupJoinRequestSchema.index({ group: 1, user: 1 }, { unique: true });

const GroupAnnouncementSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityGroup', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  notifyMembers: { type: Boolean, default: true },
  pinned: { type: Boolean, default: false },
  expiresAt: Date,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

GroupAnnouncementSchema.index({ group: 1, createdAt: -1 });

module.exports = {
  CommunityGroup: mongoose.model('CommunityGroup', CommunityGroupSchema),
  GroupMember: mongoose.model('GroupMember', GroupMemberSchema),
  GroupPost: mongoose.model('GroupPost', GroupPostSchema),
  GroupEvent: mongoose.model('GroupEvent', GroupEventSchema),
  GroupInvitation: mongoose.model('GroupInvitation', GroupInvitationSchema),
  GroupJoinRequest: mongoose.model('GroupJoinRequest', GroupJoinRequestSchema),
  GroupAnnouncement: mongoose.model('GroupAnnouncement', GroupAnnouncementSchema)
};
